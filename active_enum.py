"""
Active subdomain enumeration (wordlist brute-force + DNS resolution)
"""
import subprocess
import shutil
import tempfile
import os
from typing import List, Set
from concurrent.futures import ThreadPoolExecutor, as_completed
import dns.resolver
from stream_output import stream_print
from config import DEFAULT_THREADS, DNS_TIMEOUT, DNS_RESOLVERS
from utils import load_wordlist, is_dnsx_available


def resolve_dns_python(subdomain: str, timeout: int = DNS_TIMEOUT) -> bool:
    """Resolve subdomain using dnspython"""
    try:
        resolver = dns.resolver.Resolver()
        resolver.nameservers = DNS_RESOLVERS
        resolver.timeout = timeout
        resolver.lifetime = timeout
        resolver.resolve(subdomain, 'A')
        return True
    except Exception:
        return False


def resolve_with_dnsx(candidates_file: str) -> Set[str]:
    """Use dnsx for fast bulk DNS resolution"""
    resolved = set()
    try:
        # Check for dnsx in tools directory first
        dnsx_path = None
        if os.path.exists("/app/tools/dnsx"):
            dnsx_path = "/app/tools/dnsx"
        elif shutil.which("dnsx"):
            dnsx_path = "dnsx"
        
        if not dnsx_path:
            stream_print("[!] dnsx not found", "error")
            return resolved
        
        stream_print("[*] Using dnsx for fast resolution...", "info")
        
        cmd = [dnsx_path, "-l", candidates_file, "-silent", "-resp"]
        process = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300  # 5 minutes timeout
        )
        
        if process.returncode == 0:
            for line in process.stdout.strip().split('\n'):
                if line:
                    # Parse dnsx output (format: subdomain [IP])
                    subdomain = line.split()[0].strip()
                    resolved.add(subdomain.lower())
        
        stream_print(f"[+] dnsx resolved {len(resolved)} subdomains", "success")
        
    except subprocess.TimeoutExpired:
        stream_print("[!] dnsx timeout - falling back to Python resolver", "error")
    except Exception as e:
        stream_print(f"[!] dnsx error: {e}", "error")
    
    return resolved


def resolve_with_python(candidates: List[str], threads: int = DEFAULT_THREADS) -> Set[str]:
    """Resolve subdomains using Python DNS resolver with threading"""
    resolved = set()
    stream_print(f"[*] Resolving {len(candidates)} candidates with {threads} threads...", "info")
    
    with ThreadPoolExecutor(max_workers=threads) as executor:
        future_to_sub = {executor.submit(resolve_dns_python, sub): sub for sub in candidates}
        
        completed = 0
        for future in as_completed(future_to_sub):
            subdomain = future_to_sub[future]
            try:
                if future.result():
                    resolved.add(subdomain.lower())
                
                completed += 1
                if completed % 100 == 0:
                    stream_print(f"[*] Progress: {completed}/{len(candidates)} checked", "info")
            except Exception:
                pass
    
    stream_print(f"[+] Python resolver found {len(resolved)} live subdomains", "success")
    return resolved


def generate_candidates(domain: str, wordlist: List[str]) -> List[str]:
    """Generate candidate subdomains from wordlist"""
    candidates = []
    for word in wordlist:
        word = word.strip().lower()
        if word and not word.startswith('#'):
            # Handle words with and without dots
            if '.' in word:
                candidates.append(f"{word}.{domain}")
            else:
                candidates.append(f"{word}.{domain}")
    return list(set(candidates))  # Remove duplicates


def active_enum(domain: str, wordlist_path: str, threads: int = DEFAULT_THREADS, use_dnsx: bool = True) -> List[str]:
    """
    Active subdomain enumeration using wordlist
    
    Args:
        domain: Target domain
        wordlist_path: Path to wordlist file
        threads: Number of threads for Python resolver
        use_dnsx: Try to use dnsx if available
    
    Returns:
        Sorted list of resolved subdomains
    """
    stream_print(f"[*] Starting active enumeration for {domain}", "info")
    
    # Load wordlist
    wordlist = load_wordlist(wordlist_path)
    if not wordlist:
        stream_print("[!] Empty or invalid wordlist", "error")
        return []
    
    stream_print(f"[*] Loaded {len(wordlist)} words from wordlist", "info")
    
    # Generate candidates
    candidates = generate_candidates(domain, wordlist)
    stream_print(f"[*] Generated {len(candidates)} candidate subdomains", "info")
    
    resolved = set()
    
    # Try dnsx first if available and requested
    if use_dnsx and is_dnsx_available():
        # Write candidates to temp file
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as tmp:
            tmp.write('\n'.join(candidates))
            tmp_path = tmp.name
        
        try:
            resolved = resolve_with_dnsx(tmp_path)
        finally:
            os.unlink(tmp_path)
        
        # If dnsx found nothing, fall back to Python
        if not resolved:
            stream_print("[!] dnsx found nothing, falling back to Python resolver", "warning")
            resolved = resolve_with_python(candidates, threads)
    else:
        # Use Python resolver
        if use_dnsx:
            stream_print("[!] dnsx not available, using Python resolver", "warning")
        resolved = resolve_with_python(candidates, threads)
    
    result = sorted(resolved)
    stream_print(f"[✓] Active enumeration complete: {len(result)} live subdomains", "success")
    return result


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        print("Usage: python active_enum.py <domain> <wordlist>")
        sys.exit(1)
    
    target = sys.argv[1]
    wordlist = sys.argv[2]
    
    results = active_enum(target, wordlist)
    
    print(f"\n[✓] Total: {len(results)} live subdomains")
    for sub in results:
        print(f"  - {sub}")