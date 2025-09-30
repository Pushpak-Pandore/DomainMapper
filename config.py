"""
Configuration management for DomainMapper
"""
import os
from pathlib import Path

# Base paths
BASE_DIR = Path(__file__).parent
HISTORY_DIR = BASE_DIR / "history"
WORDLISTS_DIR = BASE_DIR / "wordlists"
REPORTS_DIR = BASE_DIR / "reports"
TEMPLATES_DIR = BASE_DIR / "templates"

# Ensure directories exist
HISTORY_DIR.mkdir(exist_ok=True)
WORDLISTS_DIR.mkdir(exist_ok=True)
REPORTS_DIR.mkdir(exist_ok=True)

# MongoDB configuration
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DATABASE_NAME = "domainmapper"

# API Keys (optional - for enhanced features)
SHODAN_API_KEY = os.getenv("SHODAN_API_KEY", "")
VIRUSTOTAL_API_KEY = os.getenv("VIRUSTOTAL_API_KEY", "")
SECURITYTRAILS_API_KEY = os.getenv("SECURITYTRAILS_API_KEY", "")

# Enumeration settings
DEFAULT_THREADS = 50
DNS_TIMEOUT = 3
REQUEST_TIMEOUT = 10

# Passive sources
PASSIVE_SOURCES = {
    "crtsh": True,
    "alienvault": True,
    "threatcrowd": True,
    "wayback": True,
}

# DNS resolvers
DNS_RESOLVERS = [
    "1.1.1.1",  # Cloudflare
    "8.8.8.8",  # Google
    "9.9.9.9",  # Quad9
]

# Report settings
REPORT_FORMATS = ["html", "json", "csv", "pdf"]
DEFAULT_REPORT_FORMAT = "html"

# Web UI settings
BACKEND_HOST = "0.0.0.0"
BACKEND_PORT = 8001
FRONTEND_URL = os.getenv("REACT_APP_BACKEND_URL", "http://localhost:3000")