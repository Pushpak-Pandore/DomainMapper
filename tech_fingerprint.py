"""
Technology fingerprinting - Identify tech stack on subdomains
"""
import requests
from typing import Dict, List, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
import builtwith
from Wappalyzer import Wappalyzer, WebPage
from stream_output import stream_print
from config import REQUEST_TIMEOUT


def fingerprint_with_wappalyzer(url: str) -> Dict:
    """
    Use Wappalyzer to detect technologies
    
    Returns:
        Dictionary of detected technologies
    """
    try:
        wappalyzer = Wappalyzer.latest()
        webpage = WebPage.new_from_url(url, timeout=REQUEST_TIMEOUT)
        technologies = wappalyzer.analyze(webpage)
        return {'technologies': list(technologies), 'success': True}
    except Exception as e:
        return {'technologies': [], 'success': False, 'error': str(e)}


def fingerprint_with_builtwith(url: str) -> Dict:
    """
    Use BuiltWith to detect technologies
    
    Returns:
        Dictionary of detected technologies
    """
    try:
        technologies = builtwith.parse(url)
        return {'technologies': technologies, 'success': True}
    except Exception as e:
        return {'technologies': {}, 'success': False, 'error': str(e)}


def detect_webserver(url: str) -> Optional[str]:
    """Detect web server from HTTP headers"""
    try:
        response = requests.head(url, timeout=REQUEST_TIMEOUT, allow_redirects=True, verify=False)
        return response.headers.get('Server', 'Unknown')
    except Exception:
        return None


def detect_cms(url: str) -> List[str]:
    """Detect CMS/Framework from common patterns"""
    cms_patterns = []
    try:
        response = requests.get(url, timeout=REQUEST_TIMEOUT, allow_redirects=True, verify=False)
        content = response.text.lower()
        
        # WordPress
        if 'wp-content' in content or 'wp-includes' in content:
            cms_patterns.append('WordPress')
        
        # Joomla
        if 'joomla' in content or '/components/com_' in content:
            cms_patterns.append('Joomla')
        
        # Drupal
        if 'drupal' in content or 'sites/all/modules' in content:
            cms_patterns.append('Drupal')
        
        # Laravel
        if 'laravel' in content or 'csrf-token' in content:
            cms_patterns.append('Laravel')
        
        # Django
        if 'csrfmiddlewaretoken' in content:
            cms_patterns.append('Django')
        
        # React
        if 'react' in content or '__react' in content:
            cms_patterns.append('React')
        
        # Vue.js
        if 'vue' in content or 'v-app' in content:
            cms_patterns.append('Vue.js')
        
        # Angular
        if 'ng-app' in content or 'angular' in content:
            cms_patterns.append('Angular')
    
    except Exception:
        pass
    
    return cms_patterns


def fingerprint_subdomain(subdomain: str, use_external: bool = True) -> Dict:
    """
    Fingerprint a single subdomain
    
    Args:
        subdomain: Subdomain to fingerprint
        use_external: Use external APIs (Wappalyzer, BuiltWith)
    
    Returns:
        Dictionary with fingerprinting results
    """
    result = {
        'subdomain': subdomain,
        'success': False,
        'http_status': None,
        'server': None,
        'cms': [],
        'technologies': {},
        'error': None
    }
    
    # Try HTTPS first, then HTTP
    for protocol in ['https', 'http']:
        url = f"{protocol}://{subdomain}"
        
        try:
            response = requests.get(url, timeout=REQUEST_TIMEOUT, allow_redirects=True, verify=False)
            result['http_status'] = response.status_code
            result['server'] = response.headers.get('Server', 'Unknown')
            result['success'] = True
            
            # Detect CMS
            result['cms'] = detect_cms(url)
            
            # Use external APIs if enabled
            if use_external:
                # Try Wappalyzer
                wapp_result = fingerprint_with_wappalyzer(url)
                if wapp_result['success']:
                    result['technologies']['wappalyzer'] = wapp_result['technologies']
                
                # Try BuiltWith
                built_result = fingerprint_with_builtwith(url)
                if built_result['success']:
                    result['technologies']['builtwith'] = built_result['technologies']
            
            break  # Success, no need to try other protocol
        
        except Exception as e:
            result['error'] = str(e)
            continue
    
    return result


def fingerprint_subdomains(subdomains: List[str], threads: int = 10, use_external: bool = False) -> List[Dict]:
    """
    Fingerprint multiple subdomains
    
    Args:
        subdomains: List of subdomains to fingerprint
        threads: Number of concurrent threads
        use_external: Use external APIs (slower but more accurate)
    
    Returns:
        List of fingerprinting results
    """
    stream_print(f"[*] Fingerprinting {len(subdomains)} subdomains with {threads} threads...", "info")
    
    results = []
    
    with ThreadPoolExecutor(max_workers=threads) as executor:
        future_to_sub = {
            executor.submit(fingerprint_subdomain, sub, use_external): sub 
            for sub in subdomains
        }
        
        completed = 0
        for future in as_completed(future_to_sub):
            subdomain = future_to_sub[future]
            try:
                result = future.result()
                results.append(result)
                
                if result['success']:
                    tech_info = []
                    if result['server']:
                        tech_info.append(f"Server: {result['server']}")
                    if result['cms']:
                        tech_info.append(f"CMS: {', '.join(result['cms'])}")
                    
                    if tech_info:
                        stream_print(f"  [+] {subdomain}: {' | '.join(tech_info)}", "success")
                
                completed += 1
                if completed % 10 == 0:
                    stream_print(f"[*] Progress: {completed}/{len(subdomains)}", "info")
            
            except Exception as e:
                stream_print(f"[!] Error fingerprinting {subdomain}: {e}", "error")
    
    stream_print(f"[✓] Fingerprinting complete: {len(results)} subdomains analyzed", "success")
    return results


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python tech_fingerprint.py <subdomain> [--external]")
        sys.exit(1)
    
    subdomain = sys.argv[1]
    use_external = '--external' in sys.argv
    
    result = fingerprint_subdomain(subdomain, use_external)
    
    print(f"\n[*] Fingerprinting Results for {subdomain}:")
    print(f"  Success: {result['success']}")
    if result['http_status']:
        print(f"  HTTP Status: {result['http_status']}")
    if result['server']:
        print(f"  Server: {result['server']}")
    if result['cms']:
        print(f"  CMS/Framework: {', '.join(result['cms'])}")
    if result['technologies']:
        print(f"  Technologies: {result['technologies']}")