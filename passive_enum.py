# # passive_enum.py
# import requests
# import json
# import re

# def fetch_crtsh(domain):
#     """Fetch subdomains from crt.sh"""
#     url = f"https://crt.sh/?q=%25.{domain}&output=json"
#     try:
#         r = requests.get(url, timeout=10)
#         if r.status_code != 200:
#             return []
#         data = r.json()
#         subdomains = set()
#         for entry in data:
#             name = entry.get("name_value", "")
#             for sub in name.split("\n"):
#                 if domain in sub:
#                     subdomains.add(sub.strip())
#         return list(subdomains)
#     except Exception as e:
#         print(f"[!] crt.sh error: {e}")
#         return []

# def fetch_alienvault(domain):
#     """Fetch subdomains from AlienVault OTX"""
#     url = f"https://otx.alienvault.com/api/v1/indicators/domain/{domain}/passive_dns"
#     try:
#         r = requests.get(url, timeout=10)
#         if r.status_code != 200:
#             return []
#         data = r.json()
#         subdomains = set()
#         for record in data.get("passive_dns", []):
#             hostname = record.get("hostname", "")
#             if domain in hostname:
#                 subdomains.add(hostname)
#         return list(subdomains)
#     except Exception as e:
#         print(f"[!] AlienVault OTX error: {e}")
#         return []

# def fetch_threatcrowd(domain):
#     """Fetch subdomains from ThreatCrowd"""
#     url = f"https://www.threatcrowd.org/searchApi/v2/domain/report/?domain={domain}"
#     try:
#         r = requests.get(url, timeout=10)
#         data = r.json()
#         return data.get("subdomains", [])
#     except Exception as e:
#         print(f"[!] ThreatCrowd error: {e}")
#         return []

# def fetch_wayback(domain):
#     """Fetch subdomains from Wayback Machine"""
#     url = f"http://web.archive.org/cdx/search/cdx?url=*.{domain}/*&output=json&fl=original&collapse=urlkey"
#     try:
#         r = requests.get(url, timeout=10)
#         results = r.json()
#         subdomains = set()
#         for entry in results[1:]:
#             url_match = re.findall(r"https?://([^/]+)/?", entry[0])
#             if url_match:
#                 subdomains.add(url_match[0])
#         return list(subdomains)
#     except Exception as e:
#         print(f"[!] Wayback Machine error: {e}")
#         return []

# def passive_enum(domain):
#     """Run all passive methods and return unique subdomains"""
#     all_subs = set()

#     print(f"[*] Gathering subdomains for: {domain}")

#     sources = [fetch_crtsh, fetch_alienvault, fetch_threatcrowd, fetch_wayback]
#     for source in sources:
#         subs = source(domain)
#         print(f"[+] {source.__name__}: {len(subs)} found")
#         all_subs.update(subs)

#     return sorted(all_subs)

# if __name__ == "__main__":
#     target = input("Enter domain: ").strip()
#     results = passive_enum(target)
#     print(f"\n[✓] Total unique subdomains found: {len(results)}")
#     for sub in results:
#         print(sub)

#------------------------2----------------------------#








import requests
import re
from stream_output import stream_print

def fetch_crtsh(domain):
    """Fetch subdomains from crt.sh"""
    subs = set()
    try:
        url = f"https://crt.sh/?q=%25.{domain}&output=json"
        r = requests.get(url, timeout=10)
        if r.status_code == 200:
            for entry in r.json():
                name_value = entry.get("name_value", "")
                found = re.findall(rf"[a-zA-Z0-9.-]*\.{domain}", name_value)
                subs.update(found)
    except Exception as e:
        stream_print(f"[!] crt.sh error: {e}", "error")
    return subs

def fetch_alienvault(domain):
    """Fetch subdomains from AlienVault OTX"""
    subs = set()
    try:
        url = f"https://otx.alienvault.com/api/v1/indicators/domain/{domain}/passive_dns"
        r = requests.get(url, timeout=10)
        if r.status_code == 200:
            data = r.json()
            for record in data.get("passive_dns", []):
                hostname = record.get("hostname", "")
                if hostname.endswith(domain):
                    subs.add(hostname)
    except Exception as e:
        stream_print(f"[!] AlienVault error: {e}", "error")
    return subs

def fetch_threatcrowd(domain):
    """Fetch subdomains from ThreatCrowd"""
    subs = set()
    try:
        url = f"https://threatcrowd.org/searchApi/v2/domain/report/?domain={domain}"
        r = requests.get(url, timeout=10)
        if r.status_code == 200:
            data = r.json()
            subs.update([s for s in data.get("subdomains", []) if s.endswith(domain)])
    except Exception as e:
        stream_print(f"[!] ThreatCrowd error: {e}", "error")
    return subs

def fetch_wayback(domain):
    """Fetch subdomains from Wayback Machine"""
    subs = set()
    try:
        url = f"http://web.archive.org/cdx/search/cdx?url=*.{domain}/*&output=text&fl=original&collapse=urlkey"
        r = requests.get(url, timeout=10)
        if r.status_code == 200:
            found = re.findall(rf"https?://([a-zA-Z0-9.-]*\.{domain})", r.text)
            subs.update(found)
    except Exception as e:
        stream_print(f"[!] Wayback error: {e}", "error")
    return subs

def passive_enum(domain):
    """Run all passive methods and return unique subdomains"""
    all_subs = set()
    sources = [fetch_crtsh, fetch_alienvault, fetch_threatcrowd, fetch_wayback]

    for source in sources:
        subs = source(domain)
        stream_print(f"[+] {source.__name__}: {len(subs)} found", "success")
        all_subs.update(subs)

    return sorted(all_subs)
