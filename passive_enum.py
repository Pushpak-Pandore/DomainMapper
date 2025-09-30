"""
Passive subdomain enumeration from multiple sources
"""
import requests
import re
from typing import List, Set
from stream_output import stream_print
from config import REQUEST_TIMEOUT


def fetch_crtsh(domain: str) -> Set[str]:
    """Fetch subdomains from crt.sh (Certificate Transparency Logs)"""
    subs = set()
    try:
        url = f"https://crt.sh/?q=%25.{domain}&output=json"
        response = requests.get(url, timeout=REQUEST_TIMEOUT)
        if response.status_code == 200:
            data = response.json()
            for entry in data:
                name_value = entry.get("name_value", "")
                # Extract all subdomains from certificate
                for line in name_value.split('\n'):
                    line = line.strip().replace('*.', '')
                    if domain in line and line.endswith(domain):
                        subs.add(line.lower())
        stream_print(f"[+] crt.sh: {len(subs)} found", "success")
    except Exception as e:
        stream_print(f"[!] crt.sh error: {e}", "error")
    return subs


def fetch_alienvault(domain: str) -> Set[str]:
    """Fetch subdomains from AlienVault OTX"""
    subs = set()
    try:
        url = f"https://otx.alienvault.com/api/v1/indicators/domain/{domain}/passive_dns"
        response = requests.get(url, timeout=REQUEST_TIMEOUT)
        if response.status_code == 200:
            data = response.json()
            for record in data.get("passive_dns", []):
                hostname = record.get("hostname", "")
                if hostname.endswith(domain):
                    subs.add(hostname.lower())
        stream_print(f"[+] AlienVault: {len(subs)} found", "success")
    except Exception as e:
        stream_print(f"[!] AlienVault error: {e}", "error")
    return subs


def fetch_threatcrowd(domain: str) -> Set[str]:
    """Fetch subdomains from ThreatCrowd"""
    subs = set()
    try:
        url = f"https://threatcrowd.org/searchApi/v2/domain/report/?domain={domain}"
        response = requests.get(url, timeout=REQUEST_TIMEOUT)
        if response.status_code == 200:
            data = response.json()
            subdomains = data.get("subdomains", [])
            for sub in subdomains:
                if sub.endswith(domain):
                    subs.add(sub.lower())
        stream_print(f"[+] ThreatCrowd: {len(subs)} found", "success")
    except Exception as e:
        stream_print(f"[!] ThreatCrowd error: {e}", "error")
    return subs


def fetch_wayback(domain: str) -> Set[str]:
    """Fetch subdomains from Wayback Machine"""
    subs = set()
    try:
        url = f"http://web.archive.org/cdx/search/cdx?url=*.{domain}/*&output=text&fl=original&collapse=urlkey"
        response = requests.get(url, timeout=REQUEST_TIMEOUT * 2)
        if response.status_code == 200:
            # Extract subdomains from URLs
            pattern = rf"https?://([a-zA-Z0-9.-]*\.{re.escape(domain)})"
            matches = re.findall(pattern, response.text)
            for match in matches:
                subs.add(match.lower())
        stream_print(f"[+] Wayback: {len(subs)} found", "success")
    except Exception as e:
        stream_print(f"[!] Wayback error: {e}", "error")
    return subs


def fetch_hackertarget(domain: str) -> Set[str]:
    """Fetch subdomains from HackerTarget"""
    subs = set()
    try:
        url = f"https://api.hackertarget.com/hostsearch/?q={domain}"
        response = requests.get(url, timeout=REQUEST_TIMEOUT)
        if response.status_code == 200:
            lines = response.text.strip().split('\n')
            for line in lines:
                if ',' in line:
                    subdomain = line.split(',')[0].strip()
                    if subdomain.endswith(domain):
                        subs.add(subdomain.lower())
        stream_print(f"[+] HackerTarget: {len(subs)} found", "success")
    except Exception as e:
        stream_print(f"[!] HackerTarget error: {e}", "error")
    return subs


def fetch_rapiddns(domain: str) -> Set[str]:
    """Fetch subdomains from RapidDNS"""
    subs = set()
    try:
        url = f"https://rapiddns.io/subdomain/{domain}?full=1"
        response = requests.get(url, timeout=REQUEST_TIMEOUT)
        if response.status_code == 200:
            pattern = rf'([a-zA-Z0-9]([a-zA-Z0-9\-]{{0,61}}[a-zA-Z0-9])?\.)+{re.escape(domain)}'
            matches = re.findall(pattern, response.text)
            for match in matches:
                if isinstance(match, tuple):
                    subdomain = match[0] + domain
                else:
                    subdomain = match
                if subdomain.endswith(domain):
                    subs.add(subdomain.lower())
        stream_print(f"[+] RapidDNS: {len(subs)} found", "success")
    except Exception as e:
        stream_print(f"[!] RapidDNS error: {e}", "error")
    return subs


def passive_enum(domain: str, sources: List[str] = None) -> List[str]:
    """
    Run passive enumeration from multiple sources
    
    Args:
        domain: Target domain
        sources: List of sources to use (default: all)
    
    Returns:
        Sorted list of unique subdomains
    """
    all_sources = {
        'crtsh': fetch_crtsh,
        'alienvault': fetch_alienvault,
        'threatcrowd': fetch_threatcrowd,
        'wayback': fetch_wayback,
        'hackertarget': fetch_hackertarget,
        'rapiddns': fetch_rapiddns,
    }
    
    # Use all sources if none specified
    if sources is None:
        sources = list(all_sources.keys())
    
    stream_print(f"[*] Starting passive enumeration for {domain}", "info")
    stream_print(f"[*] Using sources: {', '.join(sources)}", "info")
    
    all_subs = set()
    
    for source_name in sources:
        if source_name in all_sources:
            try:
                subs = all_sources[source_name](domain)
                all_subs.update(subs)
            except Exception as e:
                stream_print(f"[!] Error with {source_name}: {e}", "error")
    
    result = sorted(all_subs)
    stream_print(f"[✓] Passive enumeration complete: {len(result)} unique subdomains", "success")
    return result


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python passive_enum.py <domain>")
        sys.exit(1)
    
    target = sys.argv[1]
    results = passive_enum(target)
    
    print(f"\n[✓] Total: {len(results)} subdomains")
    for sub in results:
        print(f"  - {sub}")