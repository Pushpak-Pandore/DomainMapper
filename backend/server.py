"""
FastAPI Backend for DomainMapper Pro with Real-time WebSocket Support
"""
import os
import sys
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, BackgroundTasks, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
import motor.motor_asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import asyncio
import uuid

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
from websocket_manager import manager

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


@app.get("/api/scan/{scan_id}/report/{format}")
async def download_report(scan_id: str, format: str):
    """Download scan report in specified format"""
    from fastapi.responses import StreamingResponse
    import json
    import io
    
    # Validate format
    if format not in ["html", "json", "csv"]:
        raise HTTPException(status_code=400, detail="Invalid format. Use html, json, or csv")
    
    # Get scan data
    scan = await db.scans.find_one({"_id": scan_id})
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    # Get subdomains
    subdomains_cursor = db.subdomains.find({"scan_id": scan_id})
    subdomains = await subdomains_cursor.to_list(length=None)
    
    if format == "json":
        report_data = {
            "scan_info": {
                "scan_id": scan["_id"],
                "domain": scan["domain"],
                "status": scan["status"],
                "started_at": scan["started_at"].isoformat() if scan.get("started_at") else None,
                "completed_at": scan["completed_at"].isoformat() if scan.get("completed_at") else None,
                "total_subdomains": scan.get("total_subdomains", 0)
            },
            "results": scan.get("results", {}),
            "subdomains": subdomains
        }
        
        content = json.dumps(report_data, indent=2, default=str)
        return StreamingResponse(
            io.StringIO(content),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={scan['domain']}_report.json"}
        )
    
    elif format == "csv":
        import csv
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write headers
        writer.writerow([
            "Subdomain", "IP", "Source", "HTTP Status", "Threat Score", 
            "Takeover Vulnerable", "Live", "Title", "Server", "Technologies"
        ])
        
        # Write data
        for subdomain in subdomains:
            technologies = ""
            if subdomain.get('tech'):
                technologies = ", ".join(subdomain['tech'])
                
            writer.writerow([
                subdomain.get('subdomain', ''),
                subdomain.get('ip', ''),
                subdomain.get('source', ''),
                subdomain.get('http_status', ''),
                subdomain.get('threat_score', ''),
                subdomain.get('takeover_vulnerable', False),
                bool(subdomain.get('url')),
                subdomain.get('title', ''),
                subdomain.get('server', ''),
                technologies
            ])
        
        content = output.getvalue()
        return StreamingResponse(
            io.StringIO(content),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={scan['domain']}_report.csv"}
        )
    
    elif format == "html":
        # Generate HTML report
        html_content = generate_html_report(scan, subdomains)
        return StreamingResponse(
            io.StringIO(html_content),
            media_type="text/html",
            headers={"Content-Disposition": f"attachment; filename={scan['domain']}_report.html"}
        )


def generate_html_report(scan, subdomains):
    """Generate HTML report"""
    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>DomainMapper Pro Report - {scan['domain']}</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }}
            .container {{ max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
            .header {{ text-align: center; margin-bottom: 40px; }}
            .logo {{ font-size: 24px; font-weight: bold; color: #2563eb; margin-bottom: 10px; }}
            .stats {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }}
            .stat-card {{ background: #f8fafc; padding: 20px; border-radius: 6px; text-align: center; border-left: 4px solid #3b82f6; }}
            .stat-number {{ font-size: 28px; font-weight: bold; color: #1f2937; }}
            .stat-label {{ color: #6b7280; font-size: 14px; margin-top: 5px; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
            th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }}
            th {{ background-color: #f9fafb; font-weight: bold; }}
            .live {{ background-color: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-size: 12px; }}
            .vulnerable {{ background-color: #fecaca; color: #dc2626; padding: 2px 6px; border-radius: 4px; font-size: 12px; }}
            .footer {{ text-align: center; margin-top: 40px; color: #6b7280; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🗺️ DomainMapper Pro</div>
                <h1>Subdomain Enumeration Report</h1>
                <h2>{scan['domain']}</h2>
                <p>Generated on {scan.get('completed_at', scan['started_at']).strftime('%Y-%m-%d %H:%M:%S') if scan.get('completed_at') or scan.get('started_at') else 'N/A'}</p>
            </div>
            
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-number">{len(subdomains)}</div>
                    <div class="stat-label">Total Subdomains</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">{sum(1 for s in subdomains if s.get('url'))}</div>
                    <div class="stat-label">Live Subdomains</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">{sum(1 for s in subdomains if s.get('takeover_vulnerable'))}</div>
                    <div class="stat-label">Vulnerable</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">{scan['status'].title()}</div>
                    <div class="stat-label">Scan Status</div>
                </div>
            </div>

            <h3>Discovered Subdomains</h3>
            <table>
                <thead>
                    <tr>
                        <th>Subdomain</th>
                        <th>Source</th>
                        <th>Status</th>
                        <th>IP Address</th>
                        <th>Title</th>
                        <th>Server</th>
                        <th>Flags</th>
                    </tr>
                </thead>
                <tbody>
    """
    
    for subdomain in subdomains:
        flags = []
        if subdomain.get('url'):
            flags.append('<span class="live">LIVE</span>')
        if subdomain.get('takeover_vulnerable'):
            flags.append('<span class="vulnerable">VULNERABLE</span>')
        
        flags_html = ' '.join(flags)
        
        html += f"""
                    <tr>
                        <td>{subdomain.get('subdomain', '')}</td>
                        <td>{subdomain.get('source', '')}</td>
                        <td>{subdomain.get('http_status', '')}</td>
                        <td>{subdomain.get('ip', '')}</td>
                        <td>{subdomain.get('title', '')}</td>
                        <td>{subdomain.get('server', '')}</td>
                        <td>{flags_html}</td>
                    </tr>
        """
    
    html += f"""
                </tbody>
            </table>
            
            <div class="footer">
                <p>Report generated by DomainMapper Pro v2.0</p>
                <p>For more information, visit our documentation</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return html


@app.delete("/api/scan/{scan_id}")
async def delete_scan(scan_id: str):
    """Delete a scan and its associated data"""
    # Delete scan record
    scan_result = await db.scans.delete_one({"_id": scan_id})
    if scan_result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    # Delete associated subdomains
    await db.subdomains.delete_many({"scan_id": scan_id})
    
    return {"message": "Scan deleted successfully"}


@app.post("/api/scans/bulk-delete")
async def bulk_delete_scans(scan_ids: List[str]):
    """Delete multiple scans"""
    # Delete scan records
    await db.scans.delete_many({"_id": {"$in": scan_ids}})
    
    # Delete associated subdomains
    await db.subdomains.delete_many({"scan_id": {"$in": scan_ids}})
    
    return {"message": f"Deleted {len(scan_ids)} scans"}


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