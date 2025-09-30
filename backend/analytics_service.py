"""
Advanced Analytics Service for DomainMapper Pro
Provides comprehensive analytics and metrics from real scan data
"""
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import motor.motor_asyncio
from pymongo import ASCENDING, DESCENDING
import asyncio

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
db = client.domainmapper

class AnalyticsService:
    """Advanced analytics service for comprehensive scan data analysis"""
    
    async def get_comprehensive_analytics(self, time_range: str = "7d") -> Dict[str, Any]:
        """Get comprehensive analytics data for the specified time range"""
        try:
            # Calculate date range
            end_date = datetime.now()
            if time_range == "24h":
                start_date = end_date - timedelta(hours=24)
                days_count = 1
            elif time_range == "7d":
                start_date = end_date - timedelta(days=7)
                days_count = 7
            elif time_range == "30d":
                start_date = end_date - timedelta(days=30)
                days_count = 30
            else:  # 90d
                start_date = end_date - timedelta(days=90)
                days_count = 90

            # Run all analytics queries concurrently
            analytics_tasks = [
                self.get_scan_history(start_date, end_date, days_count),
                self.get_vulnerability_analytics(start_date, end_date),
                self.get_domain_statistics(start_date, end_date),
                self.get_performance_metrics(start_date, end_date),
                self.get_summary_statistics(start_date, end_date),
                self.get_scan_success_rate(start_date, end_date),
                self.get_technology_insights(start_date, end_date)
            ]

            results = await asyncio.gather(*analytics_tasks, return_exceptions=True)
            
            # Handle any exceptions and provide fallback data
            scan_history = results[0] if not isinstance(results[0], Exception) else []
            vulnerability_analytics = results[1] if not isinstance(results[1], Exception) else {}
            domain_stats = results[2] if not isinstance(results[2], Exception) else []
            performance_metrics = results[3] if not isinstance(results[3], Exception) else {}
            summary = results[4] if not isinstance(results[4], Exception) else {}
            success_rate = results[5] if not isinstance(results[5], Exception) else {}
            tech_insights = results[6] if not isinstance(results[6], Exception) else {}

            return {
                "scan_history": scan_history,
                "vulnerability_types": vulnerability_analytics.get("vulnerability_types", []),
                "top_domains": domain_stats,
                "performance_metrics": performance_metrics,
                "summary": summary,
                "success_rate": success_rate,
                "technology_insights": tech_insights,
                "time_range": time_range,
                "generated_at": datetime.now().isoformat()
            }

        except Exception as e:
            print(f"Analytics error: {e}")
            return self._get_fallback_analytics()

    async def get_scan_history(self, start_date: datetime, end_date: datetime, days_count: int) -> List[Dict[str, Any]]:
        """Get scan activity history over time"""
        try:
            # Aggregate scans by day
            pipeline = [
                {
                    "$match": {
                        "started_at": {"$gte": start_date, "$lte": end_date}
                    }
                },
                {
                    "$group": {
                        "_id": {
                            "$dateToString": {
                                "format": "%Y-%m-%d",
                                "date": "$started_at"
                            }
                        },
                        "scans": {"$sum": 1},
                        "completed_scans": {
                            "$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}
                        },
                        "failed_scans": {
                            "$sum": {"$cond": [{"$eq": ["$status", "failed"]}, 1, 0]}
                        },
                        "total_subdomains": {"$sum": "$total_subdomains"},
                        "avg_duration": {
                            "$avg": {
                                "$cond": [
                                    {"$and": [{"$ne": ["$completed_at", None]}, {"$ne": ["$started_at", None]}]},
                                    {"$divide": [
                                        {"$subtract": ["$completed_at", "$started_at"]},
                                        1000
                                    ]},
                                    None
                                ]
                            }
                        }
                    }
                },
                {"$sort": {"_id": 1}}
            ]

            cursor = db.scans.aggregate(pipeline)
            results = await cursor.to_list(length=None)

            # Fill in missing dates with zero values
            scan_history = []
            for i in range(days_count):
                current_date = end_date - timedelta(days=days_count - 1 - i)
                date_str = current_date.strftime("%Y-%m-%d")
                
                # Find data for this date
                day_data = next((item for item in results if item["_id"] == date_str), None)
                
                if day_data:
                    scan_history.append({
                        "date": date_str,
                        "scans": day_data["scans"],
                        "completed_scans": day_data["completed_scans"],
                        "failed_scans": day_data["failed_scans"],
                        "subdomains": day_data["total_subdomains"] or 0,
                        "avg_duration": round(day_data["avg_duration"] or 0, 2),
                        "vulnerabilities": 0  # Will be populated from vulnerability data
                    })
                else:
                    scan_history.append({
                        "date": date_str,
                        "scans": 0,
                        "completed_scans": 0,
                        "failed_scans": 0,
                        "subdomains": 0,
                        "avg_duration": 0,
                        "vulnerabilities": 0
                    })

            # Add vulnerability data to scan history
            vuln_pipeline = [
                {
                    "$match": {
                        "discovered_at": {"$gte": start_date, "$lte": end_date},
                        "takeover_vulnerable": True
                    }
                },
                {
                    "$group": {
                        "_id": {
                            "$dateToString": {
                                "format": "%Y-%m-%d",
                                "date": "$discovered_at"
                            }
                        },
                        "vulnerabilities": {"$sum": 1}
                    }
                }
            ]

            vuln_cursor = db.subdomains.aggregate(vuln_pipeline)
            vuln_results = await vuln_cursor.to_list(length=None)

            # Merge vulnerability data
            for scan_day in scan_history:
                vuln_data = next((item for item in vuln_results if item["_id"] == scan_day["date"]), None)
                if vuln_data:
                    scan_day["vulnerabilities"] = vuln_data["vulnerabilities"]

            return scan_history

        except Exception as e:
            print(f"Scan history error: {e}")
            return []

    async def get_vulnerability_analytics(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get vulnerability analysis and trends"""
        try:
            # Get vulnerability distribution by type
            pipeline = [
                {
                    "$match": {
                        "discovered_at": {"$gte": start_date, "$lte": end_date}
                    }
                },
                {
                    "$group": {
                        "_id": None,
                        "total_subdomains": {"$sum": 1},
                        "takeover_vulnerable": {
                            "$sum": {"$cond": [{"$eq": ["$takeover_vulnerable", True]}, 1, 0]}
                        },
                        "ssl_issues": {
                            "$sum": {"$cond": [{"$regex": ["$server", "ssl|tls", "i"]}, 1, 0]}
                        },
                        "exposed_services": {
                            "$sum": {"$cond": [{"$ne": ["$http_status", None]}, 1, 0]}
                        }
                    }
                }
            ]

            cursor = db.subdomains.aggregate(pipeline)
            results = await cursor.to_list(length=None)
            
            if results:
                data = results[0]
                vulnerability_types = [
                    {
                        "name": "Subdomain Takeover",
                        "count": data.get("takeover_vulnerable", 0),
                        "severity": "high"
                    },
                    {
                        "name": "Exposed Services",
                        "count": data.get("exposed_services", 0),
                        "severity": "medium"
                    },
                    {
                        "name": "SSL Issues",
                        "count": data.get("ssl_issues", 0),
                        "severity": "low"
                    }
                ]
            else:
                vulnerability_types = [
                    {"name": "Subdomain Takeover", "count": 0, "severity": "high"},
                    {"name": "Exposed Services", "count": 0, "severity": "medium"},
                    {"name": "SSL Issues", "count": 0, "severity": "low"}
                ]

            return {"vulnerability_types": vulnerability_types}

        except Exception as e:
            print(f"Vulnerability analytics error: {e}")
            return {"vulnerability_types": []}

    async def get_domain_statistics(self, start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
        """Get top scanned domains statistics"""
        try:
            pipeline = [
                {
                    "$match": {
                        "started_at": {"$gte": start_date, "$lte": end_date}
                    }
                },
                {
                    "$group": {
                        "_id": "$domain",
                        "scans": {"$sum": 1},
                        "total_subdomains": {"$sum": "$total_subdomains"},
                        "completed_scans": {
                            "$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}
                        }
                    }
                },
                {"$sort": {"scans": -1}},
                {"$limit": 10}
            ]

            cursor = db.scans.aggregate(pipeline)
            domain_stats = await cursor.to_list(length=None)

            # Get vulnerability counts for each domain
            result = []
            for domain_stat in domain_stats:
                domain = domain_stat["_id"]
                
                # Count vulnerabilities for this domain
                vuln_count = await db.subdomains.count_documents({
                    "domain": domain,
                    "discovered_at": {"$gte": start_date, "$lte": end_date},
                    "takeover_vulnerable": True
                })

                result.append({
                    "domain": domain,
                    "scans": domain_stat["scans"],
                    "subdomains": domain_stat["total_subdomains"] or 0,
                    "vulnerabilities": vuln_count,
                    "success_rate": round(
                        (domain_stat["completed_scans"] / domain_stat["scans"]) * 100
                        if domain_stat["scans"] > 0 else 0, 1
                    )
                })

            return result

        except Exception as e:
            print(f"Domain statistics error: {e}")
            return []

    async def get_performance_metrics(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get performance and efficiency metrics"""
        try:
            pipeline = [
                {
                    "$match": {
                        "started_at": {"$gte": start_date, "$lte": end_date},
                        "status": "completed",
                        "completed_at": {"$ne": None}
                    }
                },
                {
                    "$group": {
                        "_id": None,
                        "avg_scan_duration": {
                            "$avg": {
                                "$divide": [
                                    {"$subtract": ["$completed_at", "$started_at"]},
                                    1000  # Convert to seconds
                                ]
                            }
                        },
                        "avg_subdomains_per_scan": {"$avg": "$total_subdomains"},
                        "total_scans": {"$sum": 1},
                        "total_subdomains": {"$sum": "$total_subdomains"}
                    }
                }
            ]

            cursor = db.scans.aggregate(pipeline)
            results = await cursor.to_list(length=None)

            if results:
                data = results[0]
                return {
                    "avg_scan_duration": round(data.get("avg_scan_duration", 0), 2),
                    "avg_subdomains_per_scan": round(data.get("avg_subdomains_per_scan", 0), 1),
                    "total_scans": data.get("total_scans", 0),
                    "total_subdomains": data.get("total_subdomains", 0),
                    "scans_per_day": round(
                        data.get("total_scans", 0) / 7 if data.get("total_scans", 0) > 0 else 0, 1
                    )
                }
            else:
                return {
                    "avg_scan_duration": 0,
                    "avg_subdomains_per_scan": 0,
                    "total_scans": 0,
                    "total_subdomains": 0,
                    "scans_per_day": 0
                }

        except Exception as e:
            print(f"Performance metrics error: {e}")
            return {}

    async def get_summary_statistics(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get summary statistics for the time period"""
        try:
            # Get scan counts
            total_scans = await db.scans.count_documents({
                "started_at": {"$gte": start_date, "$lte": end_date}
            })

            completed_scans = await db.scans.count_documents({
                "started_at": {"$gte": start_date, "$lte": end_date},
                "status": "completed"
            })

            # Get subdomain counts
            total_subdomains = await db.subdomains.count_documents({
                "discovered_at": {"$gte": start_date, "$lte": end_date}
            })

            vulnerable_subdomains = await db.subdomains.count_documents({
                "discovered_at": {"$gte": start_date, "$lte": end_date},
                "takeover_vulnerable": True
            })

            # Calculate average scan duration for completed scans
            avg_duration_pipeline = [
                {
                    "$match": {
                        "started_at": {"$gte": start_date, "$lte": end_date},
                        "status": "completed",
                        "completed_at": {"$ne": None}
                    }
                },
                {
                    "$group": {
                        "_id": None,
                        "avg_duration": {
                            "$avg": {
                                "$divide": [
                                    {"$subtract": ["$completed_at", "$started_at"]},
                                    1000
                                ]
                            }
                        }
                    }
                }
            ]

            duration_cursor = db.scans.aggregate(avg_duration_pipeline)
            duration_results = await duration_cursor.to_list(length=None)
            avg_scan_duration = round(duration_results[0]["avg_duration"], 2) if duration_results else 0

            return {
                "totalScans": total_scans,
                "totalSubdomains": total_subdomains,
                "totalVulnerabilities": vulnerable_subdomains,
                "avgScanDuration": avg_scan_duration,
                "completionRate": round((completed_scans / total_scans) * 100, 1) if total_scans > 0 else 0,
                "vulnerabilityRate": round((vulnerable_subdomains / total_subdomains) * 100, 2) if total_subdomains > 0 else 0
            }

        except Exception as e:
            print(f"Summary statistics error: {e}")
            return {
                "totalScans": 0,
                "totalSubdomains": 0,
                "totalVulnerabilities": 0,
                "avgScanDuration": 0,
                "completionRate": 0,
                "vulnerabilityRate": 0
            }

    async def get_scan_success_rate(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get scan success rate analytics"""
        try:
            pipeline = [
                {
                    "$match": {
                        "started_at": {"$gte": start_date, "$lte": end_date}
                    }
                },
                {
                    "$group": {
                        "_id": "$status",
                        "count": {"$sum": 1}
                    }
                }
            ]

            cursor = db.scans.aggregate(pipeline)
            results = await cursor.to_list(length=None)

            status_counts = {item["_id"]: item["count"] for item in results}
            total = sum(status_counts.values())

            if total > 0:
                return {
                    "completed": status_counts.get("completed", 0),
                    "failed": status_counts.get("failed", 0),
                    "running": status_counts.get("running", 0),
                    "queued": status_counts.get("queued", 0),
                    "success_rate": round((status_counts.get("completed", 0) / total) * 100, 1),
                    "total": total
                }
            else:
                return {
                    "completed": 0,
                    "failed": 0,
                    "running": 0,
                    "queued": 0,
                    "success_rate": 0,
                    "total": 0
                }

        except Exception as e:
            print(f"Success rate error: {e}")
            return {}

    async def get_technology_insights(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get technology stack insights from scanned subdomains"""
        try:
            # Get technology distribution
            pipeline = [
                {
                    "$match": {
                        "discovered_at": {"$gte": start_date, "$lte": end_date},
                        "tech": {"$exists": True, "$ne": []}
                    }
                },
                {"$unwind": "$tech"},
                {
                    "$group": {
                        "_id": "$tech",
                        "count": {"$sum": 1}
                    }
                },
                {"$sort": {"count": -1}},
                {"$limit": 10}
            ]

            cursor = db.subdomains.aggregate(pipeline)
            tech_results = await cursor.to_list(length=None)

            return {
                "top_technologies": [
                    {"technology": item["_id"], "count": item["count"]}
                    for item in tech_results
                ]
            }

        except Exception as e:
            print(f"Technology insights error: {e}")
            return {"top_technologies": []}

    def _get_fallback_analytics(self) -> Dict[str, Any]:
        """Provide fallback analytics data when database is unavailable"""
        return {
            "scan_history": [],
            "vulnerability_types": [
                {"name": "Subdomain Takeover", "count": 0, "severity": "high"},
                {"name": "Exposed Services", "count": 0, "severity": "medium"},
                {"name": "SSL Issues", "count": 0, "severity": "low"}
            ],
            "top_domains": [],
            "performance_metrics": {
                "avg_scan_duration": 0,
                "avg_subdomains_per_scan": 0,
                "total_scans": 0,
                "total_subdomains": 0,
                "scans_per_day": 0
            },
            "summary": {
                "totalScans": 0,
                "totalSubdomains": 0,
                "totalVulnerabilities": 0,
                "avgScanDuration": 0,
                "completionRate": 0,
                "vulnerabilityRate": 0
            },
            "success_rate": {
                "completed": 0,
                "failed": 0,
                "running": 0,
                "queued": 0,
                "success_rate": 0,
                "total": 0
            },
            "technology_insights": {
                "top_technologies": []
            },
            "time_range": "7d",
            "generated_at": datetime.now().isoformat(),
            "fallback": True
        }

# Global analytics service instance
analytics_service = AnalyticsService()