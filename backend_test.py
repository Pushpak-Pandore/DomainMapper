#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Subdomain Enumeration Dashboard
Tests all API endpoints, enumeration engine, analytics, and data persistence
"""

import asyncio
import aiohttp
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any
import uuid

# Configuration
BACKEND_URL = "https://analytics-ace.preview.emergentagent.com/api"
TEST_DOMAIN = "example.com"
EXISTING_JOB_ID = "c118ae25-486e-43f8-8538-c183b7e21d13"  # Existing google.com job

class BackendTester:
    def __init__(self):
        self.session = None
        self.test_results = []
        self.created_job_ids = []
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30),
            connector=aiohttp.TCPConnector(ssl=False)
        )
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    def log_result(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.utcnow().isoformat(),
            "response_data": response_data
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {details}")
        
    async def make_request(self, method: str, endpoint: str, data: Dict = None, params: Dict = None) -> Dict:
        """Make HTTP request to backend"""
        url = f"{BACKEND_URL}{endpoint}"
        
        try:
            if method.upper() == "GET":
                async with self.session.get(url, params=params) as response:
                    response_text = await response.text()
                    return {
                        "status": response.status,
                        "data": await response.json() if response_text else {},
                        "headers": dict(response.headers)
                    }
            elif method.upper() == "POST":
                async with self.session.post(url, json=data, params=params) as response:
                    response_text = await response.text()
                    return {
                        "status": response.status,
                        "data": await response.json() if response_text else {},
                        "headers": dict(response.headers)
                    }
            elif method.upper() == "DELETE":
                async with self.session.delete(url, params=params) as response:
                    response_text = await response.text()
                    return {
                        "status": response.status,
                        "data": await response.json() if response_text else {},
                        "headers": dict(response.headers)
                    }
        except Exception as e:
            return {
                "status": 0,
                "error": str(e),
                "data": {}
            }

    # ================================
    # LEGACY ENDPOINTS TESTS
    # ================================
    
    async def test_root_endpoint(self):
        """Test GET /api/"""
        response = await self.make_request("GET", "/")
        
        if response["status"] == 200 and "message" in response["data"]:
            self.log_result("Root Endpoint", True, f"Status: {response['status']}, Message: {response['data']['message']}")
        else:
            self.log_result("Root Endpoint", False, f"Status: {response['status']}, Response: {response.get('data', response.get('error'))}")
    
    async def test_status_endpoints(self):
        """Test POST /api/status and GET /api/status"""
        # Test POST status
        test_data = {"client_name": "test_client_backend_testing"}
        response = await self.make_request("POST", "/status", data=test_data)
        
        if response["status"] == 200 and "id" in response["data"]:
            self.log_result("POST Status", True, f"Created status check with ID: {response['data']['id']}")
            
            # Test GET status
            get_response = await self.make_request("GET", "/status")
            if get_response["status"] == 200 and isinstance(get_response["data"], list):
                self.log_result("GET Status", True, f"Retrieved {len(get_response['data'])} status checks")
            else:
                self.log_result("GET Status", False, f"Status: {get_response['status']}, Response: {get_response.get('data', get_response.get('error'))}")
        else:
            self.log_result("POST Status", False, f"Status: {response['status']}, Response: {response.get('data', response.get('error'))}")

    # ================================
    # JOB MANAGEMENT TESTS
    # ================================
    
    async def test_create_job(self):
        """Test POST /api/jobs"""
        job_data = {
            "target_domain": TEST_DOMAIN,
            "enumeration_methods": ["dns_bruteforce", "certificate_transparency"],
            "user_session_id": f"test_session_{uuid.uuid4()}"
        }
        
        response = await self.make_request("POST", "/jobs", data=job_data)
        
        if response["status"] == 200 and "id" in response["data"]:
            job_id = response["data"]["id"]
            self.created_job_ids.append(job_id)
            self.log_result("Create Job", True, f"Created job {job_id} for domain {TEST_DOMAIN}")
            return job_id
        else:
            self.log_result("Create Job", False, f"Status: {response['status']}, Response: {response.get('data', response.get('error'))}")
            return None
    
    async def test_get_jobs(self):
        """Test GET /api/jobs"""
        response = await self.make_request("GET", "/jobs", params={"limit": 10, "skip": 0})
        
        if response["status"] == 200 and isinstance(response["data"], list):
            self.log_result("Get Jobs", True, f"Retrieved {len(response['data'])} jobs")
            return response["data"]
        else:
            self.log_result("Get Jobs", False, f"Status: {response['status']}, Response: {response.get('data', response.get('error'))}")
            return []
    
    async def test_get_specific_job(self, job_id: str):
        """Test GET /api/jobs/{job_id}"""
        response = await self.make_request("GET", f"/jobs/{job_id}")
        
        if response["status"] == 200 and "id" in response["data"]:
            self.log_result("Get Specific Job", True, f"Retrieved job {job_id}, Status: {response['data'].get('status')}")
            return response["data"]
        elif response["status"] == 404:
            self.log_result("Get Specific Job", False, f"Job {job_id} not found")
        else:
            self.log_result("Get Specific Job", False, f"Status: {response['status']}, Response: {response.get('data', response.get('error'))}")
        return None
    
    async def test_job_progress(self, job_id: str):
        """Test GET /api/jobs/{job_id}/progress"""
        response = await self.make_request("GET", f"/jobs/{job_id}/progress")
        
        if response["status"] == 200 and "job_id" in response["data"]:
            progress_data = response["data"]
            self.log_result("Job Progress", True, 
                          f"Job {job_id} - Status: {progress_data.get('status')}, "
                          f"Progress: {progress_data.get('progress_percentage')}%, "
                          f"Subdomains: {progress_data.get('subdomains_found')}")
            return progress_data
        else:
            self.log_result("Job Progress", False, f"Status: {response['status']}, Response: {response.get('data', response.get('error'))}")
            return None
    
    async def test_job_subdomains(self, job_id: str):
        """Test GET /api/jobs/{job_id}/subdomains"""
        response = await self.make_request("GET", f"/jobs/{job_id}/subdomains", params={"limit": 50})
        
        if response["status"] == 200 and isinstance(response["data"], list):
            subdomains = response["data"]
            self.log_result("Job Subdomains", True, f"Retrieved {len(subdomains)} subdomains for job {job_id}")
            
            # Validate subdomain structure
            if subdomains:
                sample_subdomain = subdomains[0]
                required_fields = ["id", "job_id", "subdomain", "discovery_method"]
                missing_fields = [field for field in required_fields if field not in sample_subdomain]
                if missing_fields:
                    self.log_result("Subdomain Structure", False, f"Missing fields: {missing_fields}")
                else:
                    self.log_result("Subdomain Structure", True, "All required fields present")
            
            return subdomains
        else:
            self.log_result("Job Subdomains", False, f"Status: {response['status']}, Response: {response.get('data', response.get('error'))}")
            return []

    # ================================
    # ANALYTICS TESTS
    # ================================
    
    async def test_dashboard_analytics(self):
        """Test GET /api/analytics/dashboard"""
        response = await self.make_request("GET", "/analytics/dashboard")
        
        if response["status"] == 200:
            stats = response["data"]
            required_fields = [
                "total_jobs", "active_jobs", "total_subdomains", 
                "unique_domains_scanned", "jobs_today", "subdomains_today",
                "average_job_duration_minutes", "success_rate_percentage"
            ]
            
            missing_fields = [field for field in required_fields if field not in stats]
            if missing_fields:
                self.log_result("Dashboard Analytics", False, f"Missing fields: {missing_fields}")
            else:
                self.log_result("Dashboard Analytics", True, 
                              f"Total Jobs: {stats['total_jobs']}, "
                              f"Active: {stats['active_jobs']}, "
                              f"Subdomains: {stats['total_subdomains']}, "
                              f"Success Rate: {stats['success_rate_percentage']}%")
            return stats
        else:
            self.log_result("Dashboard Analytics", False, f"Status: {response['status']}, Response: {response.get('data', response.get('error'))}")
            return None
    
    async def test_trends_analytics(self):
        """Test GET /api/analytics/trends"""
        response = await self.make_request("GET", "/analytics/trends", params={"days": 7})
        
        if response["status"] == 200:
            trends = response["data"]
            required_fields = ["jobs_per_day", "subdomains_per_day", "date_range"]
            
            missing_fields = [field for field in required_fields if field not in trends]
            if missing_fields:
                self.log_result("Trends Analytics", False, f"Missing fields: {missing_fields}")
            else:
                self.log_result("Trends Analytics", True, 
                              f"Jobs trend data: {len(trends['jobs_per_day'])} days, "
                              f"Subdomains trend data: {len(trends['subdomains_per_day'])} days")
            return trends
        else:
            self.log_result("Trends Analytics", False, f"Status: {response['status']}, Response: {response.get('data', response.get('error'))}")
            return None
    
    async def test_track_event(self):
        """Test POST /api/analytics/events"""
        event_data = {
            "event_type": "test_event",
            "session_id": f"test_session_{uuid.uuid4()}",
            "data": {"test_key": "test_value", "timestamp": datetime.utcnow().isoformat()}
        }
        
        response = await self.make_request("POST", "/analytics/events", data=event_data)
        
        if response["status"] == 200 and "message" in response["data"]:
            self.log_result("Track Event", True, f"Event tracked: {event_data['event_type']}")
        else:
            self.log_result("Track Event", False, f"Status: {response['status']}, Response: {response.get('data', response.get('error'))}")
    
    async def test_user_activity(self):
        """Test GET /api/analytics/user-activity"""
        response = await self.make_request("GET", "/analytics/user-activity", params={"limit": 20})
        
        if response["status"] == 200 and isinstance(response["data"], list):
            activities = response["data"]
            self.log_result("User Activity", True, f"Retrieved {len(activities)} user activities")
            return activities
        else:
            self.log_result("User Activity", False, f"Status: {response['status']}, Response: {response.get('data', response.get('error'))}")
            return []

    # ================================
    # ENUMERATION ENGINE TESTS
    # ================================
    
    async def test_enumeration_engine(self, job_id: str):
        """Test the enumeration engine by monitoring job progress"""
        if not job_id:
            self.log_result("Enumeration Engine", False, "No job ID provided")
            return
        
        print(f"\n🔍 Monitoring enumeration job {job_id}...")
        
        # Monitor job for up to 2 minutes
        start_time = time.time()
        max_wait_time = 120  # 2 minutes
        
        while time.time() - start_time < max_wait_time:
            progress_data = await self.test_job_progress(job_id)
            
            if progress_data:
                status = progress_data.get("status")
                progress = progress_data.get("progress_percentage", 0)
                subdomains_found = progress_data.get("subdomains_found", 0)
                
                print(f"   Status: {status}, Progress: {progress}%, Subdomains: {subdomains_found}")
                
                if status in ["completed", "failed", "cancelled"]:
                    if status == "completed" and subdomains_found > 0:
                        self.log_result("Enumeration Engine", True, 
                                      f"Job completed successfully with {subdomains_found} subdomains")
                        
                        # Test subdomain retrieval
                        subdomains = await self.test_job_subdomains(job_id)
                        if subdomains:
                            self.log_result("Subdomain Discovery", True, 
                                          f"Successfully discovered and stored {len(subdomains)} subdomains")
                        else:
                            self.log_result("Subdomain Discovery", False, "No subdomains retrieved despite completion")
                    else:
                        self.log_result("Enumeration Engine", False, f"Job ended with status: {status}")
                    break
            
            await asyncio.sleep(5)  # Wait 5 seconds before next check
        else:
            self.log_result("Enumeration Engine", False, "Job did not complete within timeout period")

    # ================================
    # DATA PERSISTENCE TESTS
    # ================================
    
    async def test_existing_data(self):
        """Test retrieval of existing data (google.com job)"""
        print(f"\n📊 Testing existing data retrieval...")
        
        # Test existing job
        existing_job = await self.test_get_specific_job(EXISTING_JOB_ID)
        if existing_job:
            # Test existing subdomains
            existing_subdomains = await self.test_job_subdomains(EXISTING_JOB_ID)
            if len(existing_subdomains) >= 17:  # Should have 17 subdomains
                self.log_result("Existing Data Persistence", True, 
                              f"Successfully retrieved existing job with {len(existing_subdomains)} subdomains")
            else:
                self.log_result("Existing Data Persistence", False, 
                              f"Expected 17+ subdomains, got {len(existing_subdomains)}")
        else:
            self.log_result("Existing Data Persistence", False, f"Could not retrieve existing job {EXISTING_JOB_ID}")

    # ================================
    # CLEANUP AND MAIN TEST RUNNER
    # ================================
    
    async def cleanup_test_jobs(self):
        """Clean up test jobs created during testing"""
        print(f"\n🧹 Cleaning up {len(self.created_job_ids)} test jobs...")
        
        for job_id in self.created_job_ids:
            response = await self.make_request("DELETE", f"/jobs/{job_id}")
            if response["status"] == 200:
                print(f"   ✅ Deleted job {job_id}")
            else:
                print(f"   ❌ Failed to delete job {job_id}: {response.get('data', response.get('error'))}")
    
    async def run_all_tests(self):
        """Run comprehensive backend tests"""
        print("🚀 Starting Comprehensive Backend Testing for Subdomain Enumeration Dashboard")
        print("=" * 80)
        
        # 1. Legacy Endpoints
        print("\n📡 Testing Legacy Endpoints...")
        await self.test_root_endpoint()
        await self.test_status_endpoints()
        
        # 2. Job Management
        print("\n💼 Testing Job Management...")
        jobs = await self.test_get_jobs()
        new_job_id = await self.test_create_job()
        
        if new_job_id:
            await self.test_get_specific_job(new_job_id)
        
        # 3. Analytics
        print("\n📈 Testing Analytics...")
        await self.test_dashboard_analytics()
        await self.test_trends_analytics()
        await self.test_track_event()
        await self.test_user_activity()
        
        # 4. Existing Data
        await self.test_existing_data()
        
        # 5. Enumeration Engine (if we created a job)
        if new_job_id:
            await self.test_enumeration_engine(new_job_id)
        
        # 6. Cleanup
        await self.cleanup_test_jobs()
        
        # 7. Summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("📋 TEST SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for result in self.test_results if result["success"])
        failed = len(self.test_results) - passed
        
        print(f"Total Tests: {len(self.test_results)}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"Success Rate: {(passed/len(self.test_results)*100):.1f}%")
        
        if failed > 0:
            print(f"\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   ❌ {result['test']}: {result['details']}")
        
        print("\n" + "=" * 80)

async def main():
    """Main test runner"""
    async with BackendTester() as tester:
        await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())