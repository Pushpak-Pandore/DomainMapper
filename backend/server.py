"""
FastAPI Backend for DomainMapper Pro
"""
import os
import sys
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, BackgroundTasks, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
import motor.motor_asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from passive_enum import passive_enum
from active_enum import active_enum
from modern_enum import modern_enum, ModernEnumerator
from change_detect import detect_changes
from tech_fingerprint import fingerprint_subdomains
from threat_enrich import enrich_subdomains
from takeover_detect import scan_takeover
from report_generator import generate_reports
from wordlist_manager import WordlistManager
from utils import deduplicate_subdomains, sanitize_domain

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
db = client.domainmapper

# FastAPI app
app = FastAPI(
    title="DomainMapper Pro API",
    description="Advanced Subdomain Enumeration Platform",
    version="2.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Scheduler for scheduled scans
scheduler = AsyncIOScheduler()


# ====================  MODELS ====================

class ScanRequest(BaseModel):
    domain: str
    mode: str = Field(default="both", pattern="^(passive|active|both|modern)$")
    wordlist: Optional[str] = None
    threads: int = Field(default=50, ge=1, le=200)
    enable_fingerprint: bool = False
    enable_threat: bool = False
    enable_takeover: bool = False
    enable_changes: bool = False
    enable_modern_enum: bool = True
    use_subfinder: bool = True
    use_assetfinder: bool = True
    use_amass: bool = False
    probe_http: bool = True
    vulnerability_scan: bool = False
    sources: Optional[List[str]] = None


class ScanResponse(BaseModel):
    scan_id: str
    domain: str
    status: str
    message: str


class ScanStatus(BaseModel):
    scan_id: str
    domain: str
    status: str
    progress: int
    total_subdomains: int
    started_at: datetime
    completed_at: Optional[datetime]
    results: Optional[dict] = None


class ScheduledScanRequest(BaseModel):
    domain: str
    schedule: str  # cron expression
    scan_config: ScanRequest


# ==================== HELPER FUNCTIONS ====================

async def run_scan_task(scan_id: str, request: ScanRequest):
    """Background task to run subdomain enumeration scan"""
    try:
        # Update status to running
        await db.scans.update_one(
            {"_id": scan_id},
            {"$set": {"status": "running", "progress": 0}}
        )
        
        domain = sanitize_domain(request.domain)
        all_subdomains = []
        scan_data = {
            'timestamp': datetime.now(),
            'mode': request.mode,
            'subdomains': [],
            'ips': {},
            'sources': {},
            'passive_count': 0,
            'active_count': 0,
            'modern_count': 0
        }
        
        # Modern comprehensive enumeration (if enabled)
        if request.enable_modern_enum and request.mode in ["modern", "both"]:
            await db.scans.update_one(
                {"_id": scan_id},
                {"$set": {"progress": 10, "current_step": "modern enumeration"}}
            )
            
            try:
                enumerator = ModernEnumerator()
                modern_results = enumerator.comprehensive_enum(
                    domain=domain,
                    use_subfinder=request.use_subfinder,
                    use_assetfinder=request.use_assetfinder,
                    use_amass=request.use_amass,
                    probe_http=request.probe_http,
                    vulnerability_scan=request.vulnerability_scan,
                    threads=request.threads
                )
                
                modern_subdomains = modern_results['subdomains']
                all_subdomains.extend(modern_subdomains)
                scan_data['modern_count'] = len(modern_subdomains)
                scan_data['live_subdomains'] = modern_results['live_subdomains']
                scan_data['vulnerabilities'] = modern_results['vulnerabilities']
                scan_data['tool_results'] = modern_results.get('tool_results', {})
                
                for sub in modern_subdomains:
                    scan_data['sources'][sub] = 'modern'
                    
            except Exception as e:
                # Log error but continue with traditional methods
                print(f"Modern enumeration error: {e}")
        
        # Passive enumeration (traditional)
        if request.mode in ["passive", "both"] and not request.enable_modern_enum:
            await db.scans.update_one(
                {"_id": scan_id},
                {"$set": {"progress": 20, "current_step": "passive enumeration"}}
            )
            
            passive_results = passive_enum(domain, request.sources)
            all_subdomains.extend(passive_results)
            scan_data['passive_count'] = len(passive_results)
            
            for sub in passive_results:
                scan_data['sources'][sub] = 'passive'
        
        # Active enumeration (traditional)
        if request.mode in ["active", "both"] and request.wordlist and not request.enable_modern_enum:
            await db.scans.update_one(
                {"_id": scan_id},
                {"$set": {"progress": 40, "current_step": "active enumeration"}}
            )
            
            # Get best wordlist if not specified
            if not request.wordlist:
                wordlist_manager = WordlistManager()
                request.wordlist = wordlist_manager.get_best_wordlist(domain)
            
            active_results = active_enum(domain, request.wordlist, threads=request.threads)
            all_subdomains.extend(active_results)
            scan_data['active_count'] = len(active_results)
            
            for sub in active_results:
                if sub not in scan_data['sources']:
                    scan_data['sources'][sub] = 'active'
        
        # Deduplicate
        all_subdomains = deduplicate_subdomains(all_subdomains)
        scan_data['subdomains'] = all_subdomains
        
        await db.scans.update_one(
            {"_id": scan_id},
            {"$set": {
                "progress": 60,
                "total_subdomains": len(all_subdomains),
                "current_step": "analysis"
            }}
        )
        
        # Change detection
        if request.enable_changes:
            change_data = detect_changes(domain, all_subdomains)
            scan_data['changes'] = change_data
        
        # Technology fingerprinting (only if not done by modern enum)
        if request.enable_fingerprint and all_subdomains and not scan_data.get('live_subdomains'):
            await db.scans.update_one(
                {"_id": scan_id},
                {"$set": {"progress": 70, "current_step": "fingerprinting"}}
            )
            
            to_fingerprint = all_subdomains[:50]
            fingerprint_results = fingerprint_subdomains(to_fingerprint, threads=10)
            scan_data['technologies'] = {}
            scan_data['http_status'] = {}
            
            for result in fingerprint_results:
                sub = result['subdomain']
                scan_data['http_status'][sub] = result.get('http_status')
                scan_data['technologies'][sub] = {
                    'server': result.get('server'),
                    'cms': result.get('cms'),
                }
        
        # Threat intelligence (only if not done by modern enum)
        if request.enable_threat and all_subdomains and not scan_data.get('vulnerabilities'):
            await db.scans.update_one(
                {"_id": scan_id},
                {"$set": {"progress": 80, "current_step": "threat intelligence"}}
            )
            
            to_enrich = all_subdomains[:30]
            threat_results = enrich_subdomains(to_enrich, threads=5)
            scan_data['threat_scores'] = {}
            
            for result in threat_results:
                sub = result['subdomain']
                scan_data['threat_scores'][sub] = result.get('threat_score', 0)
        
        # Subdomain takeover
        if request.enable_takeover and all_subdomains:
            await db.scans.update_one(
                {"_id": scan_id},
                {"$set": {"progress": 90, "current_step": "takeover detection"}}
            )
            
            takeover_results = scan_takeover(all_subdomains, threads=10)
            scan_data['takeover_vulnerable'] = {}
            scan_data['cnames'] = {}
            
            for result in takeover_results:
                sub = result['subdomain']
                scan_data['takeover_vulnerable'][sub] = result.get('vulnerable', False)
                scan_data['cnames'][sub] = result.get('cname')
        
        # Save results to database
        await db.scans.update_one(
            {"_id": scan_id},
            {"$set": {
                "status": "completed",
                "progress": 100,
                "completed_at": datetime.now(),
                "results": scan_data,
                "total_subdomains": len(all_subdomains)
            }}
        )
        
        # Save subdomains to collection
        for subdomain in all_subdomains:
            subdomain_doc = {
                "scan_id": scan_id,
                "domain": domain,
                "subdomain": subdomain,
                "source": scan_data['sources'].get(subdomain),
                "ip": scan_data.get('ips', {}).get(subdomain),
                "http_status": scan_data.get('http_status', {}).get(subdomain),
                "threat_score": scan_data.get('threat_scores', {}).get(subdomain),
                "takeover_vulnerable": scan_data.get('takeover_vulnerable', {}).get(subdomain),
                "discovered_at": datetime.now()
            }
            
            # Add live subdomain data if available
            if scan_data.get('live_subdomains', {}).get(subdomain):
                live_data = scan_data['live_subdomains'][subdomain]
                subdomain_doc.update({
                    'url': live_data.get('url'),
                    'title': live_data.get('title'),
                    'server': live_data.get('server'),
                    'tech': live_data.get('tech', []),
                    'content_length': live_data.get('content_length')
                })
            
            await db.subdomains.insert_one(subdomain_doc)
    
    except Exception as e:
        await db.scans.update_one(
            {"_id": scan_id},
            {"$set": {
                "status": "failed",
                "error": str(e),
                "completed_at": datetime.now()
            }}
        )


# ==================== ROUTES ====================

@app.get("/")
async def root():
    """API root endpoint"""
    return {
        "name": "DomainMapper Pro API",
        "version": "2.0.0",
        "status": "running"
    }


@app.post("/api/scan", response_model=ScanResponse)
async def create_scan(request: ScanRequest, background_tasks: BackgroundTasks):
    """Start a new subdomain enumeration scan"""
    # Create scan record
    scan_id = f"scan_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{request.domain}"
    
    scan_doc = {
        "_id": scan_id,
        "domain": request.domain,
        "mode": request.mode,
        "status": "queued",
        "progress": 0,
        "total_subdomains": 0,
        "started_at": datetime.now(),
        "completed_at": None,
        "config": request.dict()
    }
    
    await db.scans.insert_one(scan_doc)
    
    # Start background task
    background_tasks.add_task(run_scan_task, scan_id, request)
    
    return ScanResponse(
        scan_id=scan_id,
        domain=request.domain,
        status="queued",
        message="Scan started successfully"
    )


@app.get("/api/scan/{scan_id}", response_model=ScanStatus)
async def get_scan_status(scan_id: str):
    """Get scan status and results"""
    scan = await db.scans.find_one({"_id": scan_id})
    
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    return ScanStatus(
        scan_id=scan["_id"],
        domain=scan["domain"],
        status=scan["status"],
        progress=scan.get("progress", 0),
        total_subdomains=scan.get("total_subdomains", 0),
        started_at=scan["started_at"],
        completed_at=scan.get("completed_at"),
        results=scan.get("results")
    )


@app.get("/api/scans")
async def list_scans(
    domain: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0)
):
    """List all scans with optional filters"""
    query = {}
    
    if domain:
        query["domain"] = domain
    if status:
        query["status"] = status
    
    cursor = db.scans.find(query).sort("started_at", -1).skip(skip).limit(limit)
    scans = await cursor.to_list(length=limit)
    
    # Remove large results data for list view
    for scan in scans:
        if 'results' in scan:
            scan['results'] = None
    
    total = await db.scans.count_documents(query)
    
    return {
        "total": total,
        "scans": scans,
        "limit": limit,
        "skip": skip
    }


@app.get("/api/scan/{scan_id}/report/{format}")
async def generate_scan_report(scan_id: str, format: str):
    """Generate and download scan report"""
    if format not in ['html', 'json', 'csv', 'pdf']:
        raise HTTPException(status_code=400, detail="Invalid format")
    
    scan = await db.scans.find_one({"_id": scan_id})
    
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    if scan.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Scan not completed")
    
    # Generate report
    reports = generate_reports(scan["domain"], scan.get("results", {}), [format])
    
    if format in reports:
        return FileResponse(
            reports[format],
            media_type="application/octet-stream",
            filename=f"{scan['domain']}_report.{format}"
        )
    
    raise HTTPException(status_code=500, detail="Report generation failed")


@app.delete("/api/scan/{scan_id}")
async def delete_scan(scan_id: str):
    """Delete a scan and its results"""
    result = await db.scans.delete_one({"_id": scan_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    # Delete associated subdomains
    await db.subdomains.delete_many({"scan_id": scan_id})
    
    return {"message": "Scan deleted successfully"}


@app.get("/api/domains")
async def list_domains():
    """List all scanned domains"""
    pipeline = [
        {"$group": {
            "_id": "$domain",
            "scan_count": {"$sum": 1},
            "last_scan": {"$max": "$started_at"}
        }},
        {"$sort": {"last_scan": -1}}
    ]
    
    domains = await db.scans.aggregate(pipeline).to_list(length=None)
    
    return {"domains": domains}


@app.get("/api/stats")
async def get_stats():
    """Get platform statistics"""
    total_scans = await db.scans.count_documents({})
    active_scans = await db.scans.count_documents({"status": "running"})
    total_subdomains = await db.subdomains.count_documents({})
    vulnerable_subdomains = await db.subdomains.count_documents({"takeover_vulnerable": True})
    
    return {
        "total_scans": total_scans,
        "active_scans": active_scans,
        "total_subdomains": total_subdomains,
        "vulnerable_subdomains": vulnerable_subdomains
    }


@app.get("/api/tools/status")
async def get_tools_status():
    """Get status of available enumeration tools"""
    try:
        from modern_enum import ModernEnumerator
        enumerator = ModernEnumerator()
        tools_status = enumerator.tools
        
        # Add wordlist info
        from wordlist_manager import WordlistManager
        wordlist_manager = WordlistManager()
        wordlists = wordlist_manager.list_wordlists()
        
        return {
            "tools": tools_status,
            "wordlists": wordlists,
            "modern_enumeration_available": any(tools_status.values())
        }
    except Exception as e:
        return {
            "error": str(e),
            "tools": {},
            "wordlists": {},
            "modern_enumeration_available": False
        }


@app.post("/api/wordlists/setup")
async def setup_wordlists():
    """Setup and download wordlists"""
    try:
        from wordlist_manager import setup_wordlists
        success = setup_wordlists()
        return {"success": success, "message": "Wordlists setup completed"}
    except Exception as e:
        return {"success": False, "message": str(e)}


@app.post("/api/wordlists/generate")
async def generate_custom_wordlist(domain: str):
    """Generate custom wordlist for domain"""
    try:
        from wordlist_manager import WordlistManager
        manager = WordlistManager()
        words = manager.generate_custom_wordlist(domain)
        
        # Save custom wordlist
        custom_path = manager.wordlists_dir / f"custom_{domain.replace('.', '_')}.txt"
        with open(custom_path, 'w') as f:
            f.write('\n'.join(words))
        
        return {
            "success": True,
            "wordlist_path": str(custom_path),
            "entries": len(words),
            "message": f"Custom wordlist generated for {domain}"
        }
    except Exception as e:
        return {"success": False, "message": str(e)}


@app.get("/api/vulnerabilities")
async def get_vulnerabilities(
    severity: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500)
):
    """Get vulnerability scan results"""
    pipeline = [
        {"$match": {"results.vulnerabilities": {"$exists": True, "$ne": []}}},
        {"$unwind": "$results.vulnerabilities"},
        {"$project": {
            "domain": 1,
            "scan_id": "$_id",
            "started_at": 1,
            "vulnerability": "$results.vulnerabilities"
        }},
        {"$sort": {"started_at": -1}},
        {"$limit": limit}
    ]
    
    if severity:
        pipeline[0]["$match"]["results.vulnerabilities.severity"] = severity
    
    vulnerabilities = await db.scans.aggregate(pipeline).to_list(length=limit)
    
    return {"vulnerabilities": vulnerabilities}


@app.get("/api/subdomains/live")
async def get_live_subdomains(
    domain: Optional[str] = Query(None),
    status_code: Optional[int] = Query(None),
    limit: int = Query(100, ge=1, le=500)
):
    """Get live subdomains with HTTP status"""
    query = {"http_status": {"$exists": True, "$ne": None}}
    
    if domain:
        query["domain"] = domain
    if status_code:
        query["http_status"] = status_code
    
    subdomains = await db.subdomains.find(query).sort("discovered_at", -1).limit(limit).to_list(length=limit)
    
    return {"live_subdomains": subdomains}


@app.get("/api/analytics/trends")
async def get_trends(days: int = Query(30, ge=7, le=365)):
    """Get analytics trends for specified period"""
    from datetime import datetime, timedelta
    
    start_date = datetime.now() - timedelta(days=days)
    
    # Daily scan activity
    daily_scans_pipeline = [
        {"$match": {"started_at": {"$gte": start_date}}},
        {"$group": {
            "_id": {
                "year": {"$year": "$started_at"},
                "month": {"$month": "$started_at"},
                "day": {"$dayOfMonth": "$started_at"}
            },
            "count": {"$sum": 1},
            "total_subdomains": {"$sum": "$total_subdomains"}
        }},
        {"$sort": {"_id": 1}}
    ]
    
    daily_activity = await db.scans.aggregate(daily_scans_pipeline).to_list(length=None)
    
    # Status distribution
    status_pipeline = [
        {"$match": {"started_at": {"$gte": start_date}}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    
    status_distribution = await db.scans.aggregate(status_pipeline).to_list(length=None)
    
    return {
        "daily_activity": daily_activity,
        "status_distribution": status_distribution,
        "period_days": days
    }


# ==================== SCHEDULED SCANS ====================

@app.post("/api/scheduled-scan")
async def create_scheduled_scan(request: ScheduledScanRequest):
    """Create a scheduled scan"""
    # TODO: Implement with APScheduler
    return {"message": "Scheduled scan created (not implemented yet)"}


# ==================== STARTUP/SHUTDOWN ====================

@app.on_event("startup")
async def startup_event():
    """Initialize on startup"""
    print("✅ DomainMapper Pro API started")
    print(f"📊 MongoDB: {MONGO_URL}")
    
    # Create indexes
    await db.scans.create_index("domain")
    await db.scans.create_index("started_at")
    await db.subdomains.create_index("domain")
    await db.subdomains.create_index("scan_id")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    print("👋 DomainMapper Pro API shutting down")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)