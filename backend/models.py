from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
import uuid


class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running" 
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class SubdomainStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    UNKNOWN = "unknown"


class EnumerationJob(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    target_domain: str
    status: JobStatus = JobStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    total_subdomains_found: int = 0
    progress_percentage: float = 0.0
    user_session_id: Optional[str] = None
    enumeration_methods: List[str] = []
    error_message: Optional[str] = None


class EnumerationJobCreate(BaseModel):
    target_domain: str
    enumeration_methods: List[str] = ["dns_bruteforce", "certificate_transparency", "search_engines"]
    user_session_id: Optional[str] = None


class DiscoveredSubdomain(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    job_id: str
    subdomain: str
    ip_addresses: List[str] = []
    status: SubdomainStatus = SubdomainStatus.UNKNOWN
    http_status_codes: Dict[str, int] = {}  # {"http": 200, "https": 404}
    discovered_at: datetime = Field(default_factory=datetime.utcnow)
    discovery_method: str
    response_time_ms: Optional[float] = None
    title: Optional[str] = None
    technologies: List[str] = []


class UserActivity(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    activity_type: str  # "job_started", "job_cancelled", "subdomain_clicked", "dashboard_viewed"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    target_domain: Optional[str] = None
    job_id: Optional[str] = None
    metadata: Dict[str, Any] = {}


class AnalyticsEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_type: str
    session_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    data: Dict[str, Any] = {}


class DashboardStats(BaseModel):
    total_jobs: int
    active_jobs: int
    total_subdomains: int
    unique_domains_scanned: int
    jobs_today: int
    subdomains_today: int
    average_job_duration_minutes: float
    success_rate_percentage: float


class JobProgress(BaseModel):
    job_id: str
    status: JobStatus
    progress_percentage: float
    current_method: Optional[str] = None
    subdomains_found: int
    estimated_time_remaining_minutes: Optional[float] = None
    last_updated: datetime = Field(default_factory=datetime.utcnow)