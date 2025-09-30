"""
Subdomain takeover detection
"""
import requests
from typing import Dict, List, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
from stream_output import stream_print
from config import REQUEST_TIMEOUT
from utils import get_cname, resolve_ip


# Subdomain takeover fingerprints
TAKEOVER_FINGERPRINTS = {
    'GitHub Pages': {
        'cname': ['github.io', 'github.com'],
        'response': ['There isn\'t a GitHub Pages site here', 'For root URLs']
    },
    'Heroku': {
        'cname': ['herokuapp.com', 'herokussl.com'],
        'response': ['No such app', 'no-such-app']
    },
    'AWS S3': {
        'cname': ['s3.amazonaws.com', 's3-website'],
        'response': ['NoSuchBucket', 'The specified bucket does not exist']
    },
    'Azure': {
        'cname': ['azurewebsites.net', 'cloudapp.net', 'cloudapp.azure.com'],
        'response': ['404 Web Site not found', 'This site has been disabled']
    },
    'Netlify': {
        'cname': ['netlify.com', 'netlify.app'],
        'response': ['Not Found - Request ID']
    },
    'Vercel': {
        'cname': ['vercel.app', 'now.sh'],
        'response': ['The deployment could not be found', 'The page you were looking for doesn\'t exist']
    },
    'Wordpress': {
        'cname': ['wordpress.com'],
        'response': ['Do you want to register']
    },
    'Shopify': {
        'cname': ['myshopify.com'],
        'response': ['Sorry, this shop is currently unavailable']
    },
    'Tumblr': {
        'cname': ['tumblr.com'],
        'response': ['There\'s nothing here', 'Whatever you were looking for doesn\'t currently exist']
    },
    'Bitbucket': {
        'cname': ['bitbucket.io'],
        'response': ['Repository not found']
    },
    'Ghost': {
        'cname': ['ghost.io'],
        'response': ['The thing you were looking for is no longer here']
    },
    'Pantheon': {
        'cname': ['pantheonsite.io'],
        'response': ['404 error unknown site']
    },
    'Fastly': {
        'cname': ['fastly.net'],
        'response': ['Fastly error: unknown domain']
    },
    'Zendesk': {
        'cname': ['zendesk.com'],
        'response': ['Help Center Closed']
    },
    'HelpJuice': {
        'cname': ['helpjuice.com'],
        'response': ['We could not find what you\'re looking for']
    },
    'Cargo': {
        'cname': ['cargocollective.com'],
        'response': ['If you\'re moving your domain away from Cargo']
    },
    'StatusPage': {
        'cname': ['statuspage.io'],
        'response': ['Status page not found']
    },
    'Surge': {
        'cname': ['surge.sh'],
        'response': ['project not found']
    },
}


def check_cname_vulnerable(cname: str) -> Optional[str]:
    """
    Check if CNAME points to a vulnerable service
    
    Returns:
        Service name if vulnerable, None otherwise
    """
    if not cname:
        return None
    
    cname = cname.lower()
    
    for service, fingerprint in TAKEOVER_FINGERPRINTS.items():
        for pattern in fingerprint['cname']:
            if pattern in cname:
                return service
    
    return None


def check_response_vulnerable(content: str, service: str) -> bool:
    """
    Check if response content indicates vulnerability
    
    Returns:
        True if vulnerable response detected
    """
    if not content or not service:
        return False
    
    content = content.lower()
    fingerprint = TAKEOVER_FINGERPRINTS.get(service, {})
    
    for pattern in fingerprint.get('response', []):
        if pattern.lower() in content:
            return True
    
    return False


def check_subdomain_takeover(subdomain: str) -> Dict:
    """
    Check if subdomain is vulnerable to takeover
    
    Returns:
        Dictionary with vulnerability information
    """
    result = {
        'subdomain': subdomain,
        'vulnerable': False,
        'confidence': 'none',  # none, low, medium, high
        'service': None,
        'cname': None,
        'ip': None,
        'status_code': None,
        'evidence': []
    }
    
    # Resolve IP and CNAME
    result['ip'] = resolve_ip(subdomain)
    result['cname'] = get_cname(subdomain)
    
    # Check CNAME
    if result['cname']:
        service = check_cname_vulnerable(result['cname'])
        if service:
            result['service'] = service
            result['evidence'].append(f"CNAME points to {service}: {result['cname']}")
            result['confidence'] = 'low'
            
            # Try to fetch content
            try:
                for protocol in ['https', 'http']:
                    try:
                        url = f"{protocol}://{subdomain}"
                        response = requests.get(
                            url,
                            timeout=REQUEST_TIMEOUT,
                            allow_redirects=True,
                            verify=False
                        )
                        
                        result['status_code'] = response.status_code
                        
                        # Check response content
                        if check_response_vulnerable(response.text, service):
                            result['vulnerable'] = True
                            result['confidence'] = 'high'
                            result['evidence'].append(f"Vulnerable response pattern detected")
                            break
                        
                        # 404 with service CNAME is suspicious
                        if response.status_code == 404:
                            result['confidence'] = 'medium'
                            result['evidence'].append(f"404 response with service CNAME")
                        
                        break
                    
                    except requests.exceptions.SSLError:
                        result['evidence'].append("SSL error (common with takeover)")
                        result['confidence'] = 'medium'
                        continue
                    except Exception:
                        continue
            
            except Exception as e:
                result['evidence'].append(f"Connection error: {str(e)}")
    
    # No IP resolved but has CNAME
    elif result['cname'] and not result['ip']:
        result['evidence'].append("CNAME exists but doesn't resolve to IP")
        result['confidence'] = 'medium'
    
    return result


def scan_takeover(subdomains: List[str], threads: int = 10) -> List[Dict]:
    """
    Scan multiple subdomains for takeover vulnerabilities
    
    Args:
        subdomains: List of subdomains to scan
        threads: Number of concurrent threads
    
    Returns:
        List of scan results
    """
    stream_print(f"[*] Scanning {len(subdomains)} subdomains for takeover vulnerabilities...", "info")
    
    results = []
    vulnerable_count = 0
    
    with ThreadPoolExecutor(max_workers=threads) as executor:
        future_to_sub = {
            executor.submit(check_subdomain_takeover, sub): sub 
            for sub in subdomains
        }
        
        completed = 0
        for future in as_completed(future_to_sub):
            subdomain = future_to_sub[future]
            try:
                result = future.result()
                results.append(result)
                
                if result['vulnerable']:
                    vulnerable_count += 1
                    stream_print(
                        f"  [!] VULNERABLE: {subdomain} -> {result['service']} ({result['confidence']} confidence)",
                        "error"
                    )
                elif result['confidence'] != 'none':
                    stream_print(
                        f"  [~] Suspicious: {subdomain} -> {result['service']} ({result['confidence']} confidence)",
                        "warning"
                    )
                
                completed += 1
                if completed % 10 == 0:
                    stream_print(f"[*] Progress: {completed}/{len(subdomains)}", "info")
            
            except Exception as e:
                stream_print(f"[!] Error scanning {subdomain}: {e}", "error")
    
    stream_print(f"[✓] Takeover scan complete: {vulnerable_count} vulnerable subdomains found", "success")
    
    return results


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python takeover_detect.py <subdomain>")
        sys.exit(1)
    
    subdomain = sys.argv[1]
    result = check_subdomain_takeover(subdomain)
    
    print(f"\n[*] Takeover Detection for {subdomain}:")
    print(f"  Vulnerable: {result['vulnerable']}")
    print(f"  Confidence: {result['confidence']}")
    print(f"  Service: {result['service']}")
    print(f"  CNAME: {result['cname']}")
    print(f"  IP: {result['ip']}")
    
    if result['evidence']:
        print(f"\n  Evidence:")
        for evidence in result['evidence']:
            print(f"    - {evidence}")