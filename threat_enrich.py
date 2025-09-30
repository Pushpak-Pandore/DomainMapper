"""
Threat intelligence enrichment for subdomains
"""
import requests
from typing import Dict, List, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
import shodan
from stream_output import stream_print
from config import SHODAN_API_KEY, VIRUSTOTAL_API_KEY, REQUEST_TIMEOUT
from utils import resolve_ip


def check_shodan(ip: str, api_key: str = None) -> Dict:
    """
    Check IP on Shodan for open ports and services
    
    Returns:
        Dictionary with Shodan information
    """
    if not api_key:
        api_key = SHODAN_API_KEY
    
    if not api_key:
        return {'success': False, 'error': 'No Shodan API key'}
    
    try:
        api = shodan.Shodan(api_key)
        host = api.host(ip)
        
        return {
            'success': True,
            'ip': ip,
            'ports': host.get('ports', []),
            'vulns': host.get('vulns', []),
            'os': host.get('os'),
            'organization': host.get('org'),
            'country': host.get('country_name'),
            'city': host.get('city'),
            'isp': host.get('isp'),
            'asn': host.get('asn'),
            'services': [
                {
                    'port': item.get('port'),
                    'transport': item.get('transport'),
                    'product': item.get('product'),
                    'version': item.get('version')
                }
                for item in host.get('data', [])
            ]
        }
    
    except shodan.APIError as e:
        return {'success': False, 'error': f'Shodan API error: {e}'}
    except Exception as e:
        return {'success': False, 'error': str(e)}


def check_virustotal(domain: str, api_key: str = None) -> Dict:
    """
    Check domain on VirusTotal for malicious activity
    
    Returns:
        Dictionary with VirusTotal information
    """
    if not api_key:
        api_key = VIRUSTOTAL_API_KEY
    
    if not api_key:
        return {'success': False, 'error': 'No VirusTotal API key'}
    
    try:
        url = f"https://www.virustotal.com/api/v3/domains/{domain}"
        headers = {'x-apikey': api_key}
        
        response = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT)
        
        if response.status_code == 200:
            data = response.json()
            attributes = data.get('data', {}).get('attributes', {})
            last_analysis = attributes.get('last_analysis_stats', {})
            
            return {
                'success': True,
                'domain': domain,
                'malicious': last_analysis.get('malicious', 0),
                'suspicious': last_analysis.get('suspicious', 0),
                'harmless': last_analysis.get('harmless', 0),
                'undetected': last_analysis.get('undetected', 0),
                'reputation': attributes.get('reputation', 0),
                'categories': attributes.get('categories', {}),
                'is_malicious': last_analysis.get('malicious', 0) > 0
            }
        else:
            return {'success': False, 'error': f'HTTP {response.status_code}'}
    
    except Exception as e:
        return {'success': False, 'error': str(e)}


def check_threat_intelligence(subdomain: str, check_shodan_api: bool = False) -> Dict:
    """
    Comprehensive threat intelligence check
    
    Args:
        subdomain: Subdomain to check
        check_shodan_api: Use Shodan API (requires API key)
    
    Returns:
        Dictionary with threat intelligence data
    """
    result = {
        'subdomain': subdomain,
        'ip': None,
        'shodan': None,
        'virustotal': None,
        'threat_score': 0,
        'is_suspicious': False
    }
    
    # Resolve IP
    ip = resolve_ip(subdomain)
    result['ip'] = ip
    
    if not ip:
        return result
    
    # Check Shodan
    if check_shodan_api and SHODAN_API_KEY:
        shodan_result = check_shodan(ip)
        result['shodan'] = shodan_result
        
        if shodan_result.get('success'):
            # Increase threat score for vulnerabilities
            vulns = shodan_result.get('vulns', [])
            if vulns:
                result['threat_score'] += len(vulns) * 10
    
    # Check VirusTotal
    if VIRUSTOTAL_API_KEY:
        vt_result = check_virustotal(subdomain)
        result['virustotal'] = vt_result
        
        if vt_result.get('success'):
            # Increase threat score for malicious detections
            malicious = vt_result.get('malicious', 0)
            suspicious = vt_result.get('suspicious', 0)
            result['threat_score'] += (malicious * 20) + (suspicious * 10)
            
            if malicious > 0:
                result['is_suspicious'] = True
    
    # Determine if suspicious based on threat score
    if result['threat_score'] > 50:
        result['is_suspicious'] = True
    
    return result


def enrich_subdomains(subdomains: List[str], threads: int = 5, use_shodan: bool = False) -> List[Dict]:
    """
    Enrich multiple subdomains with threat intelligence
    
    Args:
        subdomains: List of subdomains to enrich
        threads: Number of concurrent threads
        use_shodan: Use Shodan API (slower, requires API key)
    
    Returns:
        List of enrichment results
    """
    stream_print(f"[*] Enriching {len(subdomains)} subdomains with threat intelligence...", "info")
    
    if not SHODAN_API_KEY and not VIRUSTOTAL_API_KEY:
        stream_print("[!] No API keys configured. Set SHODAN_API_KEY or VIRUSTOTAL_API_KEY", "warning")
        stream_print("[*] Proceeding with basic checks only...", "info")
    
    results = []
    
    with ThreadPoolExecutor(max_workers=threads) as executor:
        future_to_sub = {
            executor.submit(check_threat_intelligence, sub, use_shodan): sub 
            for sub in subdomains
        }
        
        completed = 0
        for future in as_completed(future_to_sub):
            subdomain = future_to_sub[future]
            try:
                result = future.result()
                results.append(result)
                
                if result['is_suspicious']:
                    stream_print(f"  [!] SUSPICIOUS: {subdomain} (threat score: {result['threat_score']})", "error")
                elif result['threat_score'] > 0:
                    stream_print(f"  [~] {subdomain}: threat score {result['threat_score']}", "warning")
                
                completed += 1
                if completed % 5 == 0:
                    stream_print(f"[*] Progress: {completed}/{len(subdomains)}", "info")
            
            except Exception as e:
                stream_print(f"[!] Error enriching {subdomain}: {e}", "error")
    
    suspicious_count = sum(1 for r in results if r['is_suspicious'])
    stream_print(f"[✓] Enrichment complete: {suspicious_count} suspicious subdomains found", "success")
    
    return results


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python threat_enrich.py <subdomain> [--shodan]")
        sys.exit(1)
    
    subdomain = sys.argv[1]
    use_shodan = '--shodan' in sys.argv
    
    result = check_threat_intelligence(subdomain, use_shodan)
    
    print(f"\n[*] Threat Intelligence for {subdomain}:")
    print(f"  IP: {result['ip']}")
    print(f"  Threat Score: {result['threat_score']}")
    print(f"  Suspicious: {result['is_suspicious']}")
    
    if result['shodan']:
        print(f"\n  Shodan Data:")
        if result['shodan']['success']:
            print(f"    Ports: {result['shodan'].get('ports', [])}")
            print(f"    Vulnerabilities: {result['shodan'].get('vulns', [])}")
        else:
            print(f"    Error: {result['shodan'].get('error')}")
    
    if result['virustotal']:
        print(f"\n  VirusTotal Data:")
        if result['virustotal']['success']:
            print(f"    Malicious: {result['virustotal'].get('malicious', 0)}")
            print(f"    Suspicious: {result['virustotal'].get('suspicious', 0)}")
        else:
            print(f"    Error: {result['virustotal'].get('error')}")