from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import uuid
import json
import asyncio
from datetime import datetime, timedelta

# Import our models and subdomain engine
from models import *
from subdomain_engine import SubdomainEnumerator

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Subdomain Enumeration Dashboard API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Global job tracking
active_jobs: Dict[str, Dict] = {}

# Legacy routes (keeping for backward compatibility)
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

@api_router.get("/")
async def root():
    return {"message": "Subdomain Enumeration Dashboard API"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

# ================================
# SUBDOMAIN ENUMERATION API ENDPOINTS
# ================================

@api_router.post("/jobs", response_model=EnumerationJob)
async def create_enumeration_job(job_data: EnumerationJobCreate, background_tasks: BackgroundTasks):
    """Start a new subdomain enumeration job"""
    try:
        # Create job
        job = EnumerationJob(**job_data.dict())
        
        # Save to database
        await db.enumeration_jobs.insert_one(job.dict())
        
        # Track user activity
        if job.user_session_id:
            activity = UserActivity(
                session_id=job.user_session_id,
                activity_type="job_started",
                target_domain=job.target_domain,
                job_id=job.id
            )
            await db.user_activities.insert_one(activity.dict())
        
        # Start enumeration in background
        background_tasks.add_task(run_enumeration_job, job.id, job.target_domain, job.enumeration_methods)
        
        return job
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/jobs", response_model=List[EnumerationJob])
async def get_enumeration_jobs(limit: int = 50, skip: int = 0):
    """Get list of enumeration jobs"""
    try:
        jobs = await db.enumeration_jobs.find().sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        return [EnumerationJob(**job) for job in jobs]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/jobs/{job_id}", response_model=EnumerationJob)
async def get_job(job_id: str):
    """Get specific job details"""
    try:
        job = await db.enumeration_jobs.find_one({"id": job_id})
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        return EnumerationJob(**job)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/jobs/{job_id}")
async def cancel_job(job_id: str):
    """Cancel a running enumeration job"""
    try:
        # Update job status
        await db.enumeration_jobs.update_one(
            {"id": job_id},
            {"$set": {"status": JobStatus.CANCELLED, "completed_at": datetime.utcnow()}}
        )
        
        # Remove from active jobs
        if job_id in active_jobs:
            active_jobs[job_id]["cancelled"] = True
            
        return {"message": "Job cancelled successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/jobs/{job_id}/subdomains", response_model=List[DiscoveredSubdomain])
async def get_job_subdomains(job_id: str, limit: int = 100, skip: int = 0):
    """Get subdomains discovered for a specific job"""
    try:
        subdomains = await db.discovered_subdomains.find({"job_id": job_id}).skip(skip).limit(limit).to_list(limit)
        return [DiscoveredSubdomain(**sub) for sub in subdomains]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/jobs/{job_id}/progress", response_model=JobProgress)
async def get_job_progress(job_id: str):
    """Get real-time job progress"""
    try:
        job = await db.enumeration_jobs.find_one({"id": job_id})
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
            
        # Get current subdomain count
        subdomain_count = await db.discovered_subdomains.count_documents({"job_id": job_id})
        
        progress = JobProgress(
            job_id=job_id,
            status=JobStatus(job["status"]),
            progress_percentage=job.get("progress_percentage", 0),
            subdomains_found=subdomain_count,
            current_method=active_jobs.get(job_id, {}).get("current_method"),
            estimated_time_remaining_minutes=active_jobs.get(job_id, {}).get("eta_minutes")
        )
        
        return progress
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ================================
# ANALYTICS AND DASHBOARD ENDPOINTS
# ================================

@api_router.get("/analytics/dashboard", response_model=DashboardStats)
async def get_dashboard_stats():
    """Get overall dashboard statistics"""
    try:
        # Get date for today's stats
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Aggregate statistics
        total_jobs = await db.enumeration_jobs.count_documents({})
        active_jobs = await db.enumeration_jobs.count_documents({"status": {"$in": ["pending", "running"]}})
        total_subdomains = await db.discovered_subdomains.count_documents({})
        
        # Unique domains scanned
        unique_domains = await db.enumeration_jobs.distinct("target_domain")
        
        # Jobs today
        jobs_today = await db.enumeration_jobs.count_documents({"created_at": {"$gte": today}})
        
        # Subdomains today
        subdomains_today = await db.discovered_subdomains.count_documents({"discovered_at": {"$gte": today}})
        
        # Average job duration
        completed_jobs = await db.enumeration_jobs.find({
            "status": "completed",
            "started_at": {"$exists": True},
            "completed_at": {"$exists": True}
        }).to_list(100)
        
        avg_duration = 0
        if completed_jobs:
            durations = []
            for job in completed_jobs:
                if job.get("started_at") and job.get("completed_at"):
                    duration = (job["completed_at"] - job["started_at"]).total_seconds() / 60
                    durations.append(duration)
            avg_duration = sum(durations) / len(durations) if durations else 0
        
        # Success rate
        completed_count = await db.enumeration_jobs.count_documents({"status": "completed"})
        failed_count = await db.enumeration_jobs.count_documents({"status": "failed"})
        total_finished = completed_count + failed_count
        success_rate = (completed_count / total_finished * 100) if total_finished > 0 else 0
        
        stats = DashboardStats(
            total_jobs=total_jobs,
            active_jobs=active_jobs,
            total_subdomains=total_subdomains,
            unique_domains_scanned=len(unique_domains),
            jobs_today=jobs_today,
            subdomains_today=subdomains_today,
            average_job_duration_minutes=round(avg_duration, 2),
            success_rate_percentage=round(success_rate, 2)
        )
        
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/analytics/trends")
async def get_trends(days: int = 7):
    """Get historical trends data"""
    try:
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Jobs per day
        pipeline = [
            {
                "$match": {
                    "created_at": {"$gte": start_date, "$lte": end_date}
                }
            },
            {
                "$group": {
                    "_id": {
                        "$dateToString": {
                            "format": "%Y-%m-%d",
                            "date": "$created_at"
                        }
                    },
                    "count": {"$sum": 1}
                }
            },
            {
                "$sort": {"_id": 1}
            }
        ]
        
        jobs_trend = await db.enumeration_jobs.aggregate(pipeline).to_list(days)
        
        # Subdomains per day
        subdomains_trend = await db.discovered_subdomains.aggregate(
            pipeline.copy()
        ).to_list(days)
        
        return {
            "jobs_per_day": jobs_trend,
            "subdomains_per_day": subdomains_trend,
            "date_range": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/analytics/events")
async def track_event(event: AnalyticsEvent):
    """Track user analytics events"""
    try:
        await db.analytics_events.insert_one(event.dict())
        return {"message": "Event tracked successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/analytics/user-activity")
async def get_user_activity(session_id: Optional[str] = None, limit: int = 100):
    """Get user activity logs"""
    try:
        filter_query = {}
        if session_id:
            filter_query["session_id"] = session_id
            
        activities = await db.user_activities.find(filter_query).sort("timestamp", -1).limit(limit).to_list(limit)
        return [UserActivity(**activity) for activity in activities]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ================================
# BACKGROUND ENUMERATION FUNCTIONS
# ================================

async def run_enumeration_job(job_id: str, target_domain: str, methods: List[str]):
    """Background task to run subdomain enumeration"""
    try:
        # Mark job as running
        await db.enumeration_jobs.update_one(
            {"id": job_id},
            {"$set": {"status": JobStatus.RUNNING, "started_at": datetime.utcnow()}}
        )
        
        # Initialize job tracking
        active_jobs[job_id] = {
            "cancelled": False,
            "current_method": None,
            "eta_minutes": None
        }
        
        async def progress_callback(method: str, progress: float, status: str):
            """Update job progress"""
            if job_id in active_jobs and not active_jobs[job_id]["cancelled"]:
                active_jobs[job_id]["current_method"] = method
                await db.enumeration_jobs.update_one(
                    {"id": job_id},
                    {"$set": {"progress_percentage": progress}}
                )
        
        # Run enumeration
        discovered_count = 0
        async with SubdomainEnumerator() as enumerator:
            async for subdomain_info in enumerator.enumerate_subdomains(
                target_domain, methods, progress_callback
            ):
                # Check if job was cancelled
                if job_id in active_jobs and active_jobs[job_id]["cancelled"]:
                    break
                    
                # Skip error results
                if "error" in subdomain_info:
                    continue
                    
                # Create subdomain record
                subdomain = DiscoveredSubdomain(
                    job_id=job_id,
                    subdomain=subdomain_info["subdomain"],
                    ip_addresses=subdomain_info.get("ip_addresses", []),
                    status=SubdomainStatus(subdomain_info.get("status", "unknown")),
                    http_status_codes=subdomain_info.get("http_status_codes", {}),
                    discovery_method=subdomain_info["discovery_method"],
                    response_time_ms=subdomain_info.get("response_time_ms"),
                    title=subdomain_info.get("title"),
                    technologies=subdomain_info.get("technologies", [])
                )
                
                # Save to database
                await db.discovered_subdomains.insert_one(subdomain.dict())
                discovered_count += 1
        
        # Mark job as completed
        final_status = JobStatus.CANCELLED if (job_id in active_jobs and active_jobs[job_id]["cancelled"]) else JobStatus.COMPLETED
        
        await db.enumeration_jobs.update_one(
            {"id": job_id},
            {
                "$set": {
                    "status": final_status,
                    "completed_at": datetime.utcnow(),
                    "total_subdomains_found": discovered_count,
                    "progress_percentage": 100.0
                }
            }
        )
        
        # Clean up active job tracking
        if job_id in active_jobs:
            del active_jobs[job_id]
            
    except Exception as e:
        # Mark job as failed
        await db.enumeration_jobs.update_one(
            {"id": job_id},
            {
                "$set": {
                    "status": JobStatus.FAILED,
                    "completed_at": datetime.utcnow(),
                    "error_message": str(e)
                }
            }
        )
        
        # Clean up active job tracking
        if job_id in active_jobs:
            del active_jobs[job_id]
            
        logging.error(f"Enumeration job {job_id} failed: {e}")

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
