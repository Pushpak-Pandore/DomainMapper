"""
Utility functions for DomainMapper
"""
import re
import socket
import subprocess
import shutil
from typing import List, Optional, Dict
from datetime import datetime
import dns.resolver
from stream_output import stream_print


def is_valid_domain(domain: str) -> bool:
    """Validate domain format"""
    pattern = r'^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$'
    return bool(re.match(pattern, domain))


def sanitize_domain(domain: str) -> str:
    """Clean and sanitize domain input"""
    domain = domain.strip().lower()
    # Remove http://, https://, www.
    domain = re.sub(r'^https?://', '', domain)
    domain = re.sub(r'^www\.', '', domain)
    # Remove trailing slash
    domain = domain.rstrip('/')
    return domain


def resolve_ip(subdomain: str, timeout: int = 3) -> Optional[str]:
    """Resolve subdomain to IP address"""
    try:
        resolver = dns.resolver.Resolver()
        resolver.timeout = timeout
        resolver.lifetime = timeout
        answers = resolver.resolve(subdomain, 'A')
        return str(answers[0]) if answers else None
    except Exception:
        return None


def resolve_ips(subdomain: str, timeout: int = 3) -> List[str]:
    """Resolve subdomain to all IP addresses"""
    try:
        resolver = dns.resolver.Resolver()
        resolver.timeout = timeout
        resolver.lifetime = timeout
        answers = resolver.resolve(subdomain, 'A')
        return [str(rdata) for rdata in answers]
    except Exception:
        return []


def check_subdomain_alive(subdomain: str, port: int = 80, timeout: int = 2) -> bool:
    """Check if subdomain is responding on given port"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((subdomain, port))
        sock.close()
        return result == 0
    except Exception:
        return False


def check_http_status(subdomain: str, timeout: int = 5) -> Optional[int]:
    """Check HTTP status code of subdomain"""
    try:
        import requests
        for protocol in ['https', 'http']:
            try:
                response = requests.get(
                    f"{protocol}://{subdomain}",
                    timeout=timeout,
                    allow_redirects=True,
                    verify=False
                )
                return response.status_code
            except Exception:
                continue
        return None
    except Exception:
        return None


def get_cname(subdomain: str) -> Optional[str]:
    """Get CNAME record for subdomain"""
    try:
        resolver = dns.resolver.Resolver()
        answers = resolver.resolve(subdomain, 'CNAME')
        return str(answers[0]) if answers else None
    except Exception:
        return None


def is_dnsx_available() -> bool:
    """Check if dnsx is available in system"""
    return shutil.which("dnsx") is not None


def format_timestamp(dt: datetime = None) -> str:
    """Format datetime for filenames and display"""
    if dt is None:
        dt = datetime.now()
    return dt.strftime("%Y%m%d_%H%M%S")


def format_display_time(dt: datetime = None) -> str:
    """Format datetime for display"""
    if dt is None:
        dt = datetime.now()
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def deduplicate_subdomains(subdomains: List[str]) -> List[str]:
    """Remove duplicates and sort subdomains"""
    return sorted(set(s.lower().strip() for s in subdomains if s))


def load_wordlist(filepath: str) -> List[str]:
    """Load wordlist from file"""
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            words = [line.strip() for line in f if line.strip() and not line.startswith('#')]
        return words
    except Exception as e:
        stream_print(f"[!] Error loading wordlist: {e}", "error")
        return []


def save_to_file(filepath: str, data: List[str], header: str = None):
    """Save list of strings to file"""
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            if header:
                f.write(f"# {header}\n")
            for item in data:
                f.write(f"{item}\n")
        return True
    except Exception as e:
        stream_print(f"[!] Error saving file: {e}", "error")
        return False


def calculate_diff(old_list: List[str], new_list: List[str]) -> Dict[str, List[str]]:
    """Calculate differences between two lists"""
    old_set = set(old_list)
    new_set = set(new_list)
    
    return {
        'added': sorted(new_set - old_set),
        'removed': sorted(old_set - new_set),
        'unchanged': sorted(old_set & new_set)
    }