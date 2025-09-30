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
    mode: str = Field(default="both", pattern="^(passive|active|both)$")
    wordlist: Optional[str] = None
    threads: int = Field(default=50, ge=1, le=200)
    enable_fingerprint: bool = False
    enable_threat: bool = False
    enable_takeover: bool = False
    enable_changes: bool = False
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
            'active_count': 0
        }
        
        # Passive enumeration
        if request.mode in ["passive", "both"]:
            await db.scans.update_one(
                {"_id": scan_id},
                {"$set": {"progress": 10, "current_step": "passive enumeration"}}
            )
            
            passive_results = passive_enum(domain, request.sources)
            all_subdomains.extend(passive_results)
            scan_data['passive_count'] = len(passive_results)
            
            for sub in passive_results:
                scan_data['sources'][sub] = 'passive'
        
        # Active enumeration
        if request.mode in ["active", "both"] and request.wordlist:
            await db.scans.update_one(
                {"_id": scan_id},
                {"$set": {"progress": 30, "current_step": "active enumeration"}}
            )
            
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
                "progress": 50,
                "total_subdomains": len(all_subdomains),
                "current_step": "analysis"
            }}
        )
        
        # Change detection
        if request.enable_changes:
            change_data = detect_changes(domain, all_subdomains)
            scan_data['changes'] = change_data
        
        # Technology fingerprinting
        if request.enable_fingerprint and all_subdomains:
            await db.scans.update_one(
                {"_id": scan_id},
                {"$set": {"progress": 60, "current_step": "fingerprinting"}}
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
        
        # Threat intelligence
        if request.enable_threat and all_subdomains:
            await db.scans.update_one(
                {"_id": scan_id},
                {"$set": {"progress": 75, "current_step": "threat intelligence"}}
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
            await db.subdomains.insert_one({
                "scan_id": scan_id,
                "domain": domain,
                "subdomain": subdomain,
                "source": scan_data['sources'].get(subdomain),
                "ip": scan_data.get('ips', {}).get(subdomain),
                "http_status": scan_data.get('http_status', {}).get(subdomain),
                "threat_score": scan_data.get('threat_scores', {}).get(subdomain),
                "takeover_vulnerable": scan_data.get('takeover_vulnerable', {}).get(subdomain),
                "discovered_at": datetime.now()
            })
    
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