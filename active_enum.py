# # active_enum.py
# """
# Active subdomain enumeration (wordlist brute-force + DNS resolution).
# - Uses dnsx (if available) for fastest resolution.
# - Falls back to dnspython + ThreadPoolExecutor if dnsx isn't installed.
# - Returns a sorted list of resolved subdomains (unique).
# """

# import argparse
# import os
# import re
# import shutil
# import subprocess
# import tempfile
# from concurrent.futures import ThreadPoolExecutor, as_completed
# from pathlib import Path

# try:
#     import dns.resolver
# except Exception:
#     dns = None  # dnspython not installed; dnsx path will be preferred

# from stream_output import stream_print

# DEFAULT_WORDLIST = Path("wordlists/subdomains.txt")

# def load_wordlist(path: Path):
#     """Load prefixes from a wordlist file. Returns a list of cleaned prefixes."""
#     if not path or not path.exists():
#         stream_print(f"[!] Wordlist {path} not found — using small default list.", "error")
#         # small default fallback (expand or replace with a proper list)
#         return ["www", "mail", "dev", "api", "staging", "test", "admin"]
#     with path.open("r", encoding="utf-8", errors="ignore") as fh:
#         prefixes = []
#         for line in fh:
#             line = line.strip()
#             if not line or line.startswith("#"):
#                 continue
#             # allow entries like "www" or "www." or "www." + domain prefix
#             prefixes.append(line.rstrip("."))
#     return prefixes

# def generate_candidates(domain: str, prefixes: list):
#     """Return a list of candidate hostnames from prefixes and the domain."""
#     domain = domain.strip().lower()
#     candidates = [f"{p}.{domain}" for p in prefixes]
#     # include common root entries if present as full hostname in list
#     candidates = list(dict.fromkeys(candidates))  # preserve order, uniq
#     return candidates

# def resolve_with_dnsx(candidates_file: str, domain: str):
#     """
#     Use dnsx to resolve hostnames in candidates_file.
#     Returns a set of resolved hostnames.
#     """
#     stream_print("[*] dnsx found — using dnsx for bulk resolution.", "info")
#     # dnsx flags may vary by version; using -silent to minimize noise and output full lines.
#     # We call dnsx to resolve all hostnames in the file.
#     try:
#         cmd = ["dnsx", "-l", candidates_file, "-resp", "-silent"]
#         proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
#         out = proc.stdout or ""
#         resolved = set()
#         # parse any hostname that contains the domain
#         for line in out.splitlines():
#             # dnsx output lines may have "host A 1.2.3.4" or just "host"
#             found = re.findall(rf"([a-zA-Z0-9\-.]*\.{re.escape(domain)})", line)
#             for f in found:
#                 resolved.add(f.lower())
#         return resolved
#     except FileNotFoundError:
#         stream_print("[!] dnsx not found at runtime.", "error")
#         return set()
#     except Exception as e:
#         stream_print(f"[!] dnsx error: {e}", "error")
#         return set()

# def resolve_with_dnspython(candidates: list, threads: int = 50, timeout: int = 3):
#     """Resolve hostnames with dnspython using a ThreadPoolExecutor."""
#     if dns is None:
#         stream_print("[!] dnspython not installed — cannot resolve without dnsx.", "error")
#         return set()

#     resolver = dns.resolver.Resolver()
#     # use popular public resolvers — you can change or make configurable
#     resolver.nameservers = ["1.1.1.1", "8.8.8.8"]
#     resolver.lifetime = timeout

#     resolved = set()

#     def try_resolve(name):
#         try:
#             # attempt A record resolution
#             answers = resolver.resolve(name, "A", lifetime=timeout)
#             # if no exception, consider it resolved
#             return name.lower()
#         except Exception:
#             return None

#     stream_print(f"[*] Resolving {len(candidates)} candidates with {threads} threads...", "info")

#     with ThreadPoolExecutor(max_workers=max(2, threads)) as ex:
#         futures = {ex.submit(try_resolve, name): name for name in candidates}
#         for future in as_completed(futures):
#             res = future.result()
#             if res:
#                 resolved.add(res)

#     return resolved

# def write_candidates_to_tempfile(candidates: list):
#     """Write candidates to a temporary file and return the filename (path)."""
#     tf = tempfile.NamedTemporaryFile(delete=False, mode="w", encoding="utf-8")
#     for c in candidates:
#         tf.write(c + "\n")
#     tf.flush()
#     tf.close()
#     return tf.name

# def active_enum(domain: str,
#                 wordlist_path: str = None,
#                 threads: int = 50,
#                 timeout: int = 3,
#                 prefer_dnsx: bool = True,
#                 force_dnsx: bool = False):
#     """
#     Orchestrator: generate candidates, resolve using dnsx (if present) or dnspython.
#     Returns sorted list of unique resolved subdomains.
#     """
#     # load wordlist
#     path = Path(wordlist_path) if wordlist_path else DEFAULT_WORDLIST
#     prefixes = load_wordlist(path)
#     stream_print(f"[*] Loaded {len(prefixes)} prefixes from wordlist.", "info")

#     candidates = generate_candidates(domain, prefixes)
#     stream_print(f"[*] Generated {len(candidates)} candidate hostnames.", "info")

#     dnsx_path = shutil.which("dnsx")

#     # Decide resolution strategy
#     if dnsx_path and (prefer_dnsx or force_dnsx):
#         # Use dnsx via temporary file
#         tmpfile = write_candidates_to_tempfile(candidates)
#         try:
#             resolved = resolve_with_dnsx(tmpfile, domain)
#             # If dnsx returns nothing (rare), fallback to dnspython if available
#             if not resolved and dns is not None and not force_dnsx:
#                 stream_print("[!] dnsx resolved nothing, falling back to dnspython...", "warning")
#                 resolved = resolve_with_dnspython(candidates, threads=threads, timeout=timeout)
#         finally:
#             try:
#                 os.remove(tmpfile)
#             except Exception:
#                 pass
#     else:
#         if force_dnsx and not dnsx_path:
#             stream_print("[!] dnsx was forced but is not installed — falling back to dnspython.", "warning")
#         resolved = resolve_with_dnspython(candidates, threads=threads, timeout=timeout)

#     # report
#     stream_print(f"[+] Active enumeration complete — {len(resolved)} resolved hosts found.", "success")
#     return sorted(resolved)


# # CLI usability
# def cli():
#     parser = argparse.ArgumentParser(description="Active subdomain enumerator (wordlist + DNS resolve)")
#     parser.add_argument("-d", "--domain", required=True, help="Target domain (e.g. example.com)")
#     parser.add_argument("-w", "--wordlist", help="Wordlist path (one prefix per line). Default: wordlists/subdomains.txt")
#     parser.add_argument("-t", "--threads", type=int, default=50, help="Number of threads for DNS resolving (dnspython). Default 50")
#     parser.add_argument("--timeout", type=int, default=3, help="DNS timeout (seconds) per query. Default 3")
#     parser.add_argument("--no-dnsx", action="store_true", help="Disable dnsx even if installed (force Python resolver)")
#     parser.add_argument("--force-dnsx", action="store_true", help="Force dnsx usage; failover to Python only if dnsx returns nothing")
#     args = parser.parse_args()

#     resolved = active_enum(
#         domain=args.domain,
#         wordlist_path=args.wordlist,
#         threads=args.threads,
#         timeout=args.timeout,
#         prefer_dnsx=not args.no_dnsx,
#         force_dnsx=args.force_dnsx
#     )

#     # print results plainly (suitable for piping to a file)
#     for r in resolved:
#         print(r)


# if __name__ == "__main__":
#     cli()




#--------------------------2--------------------------#



# import subprocess
# import shutil
# import dns.resolver
# from concurrent.futures import ThreadPoolExecutor
# from stream_output import stream_print

# def resolve_dns_python(subdomain):
#     """Fallback DNS resolution using dnspython"""
#     try:
#         dns.resolver.resolve(subdomain, 'A')
#         return subdomain
#     except Exception:
#         return None

# def resolve_with_dnsx(subdomains):
#     """Use dnsx if installed"""
#     try:
#         # Run dnsx and capture output
#         process = subprocess.run(
#             ["dnsx", "-silent"],
#             input="\n".join(subdomains).encode(),
#             capture_output=True,
#             text=True
#         )
#         return process.stdout.strip().split("\n") if process.stdout else []
#     except Exception as e:
#         stream_print(f"[!] dnsx error: {e}", "error")
#         return []

# def active_enum(domain, wordlist_path):
#     """Active subdomain enumeration with dnsx fallback"""
#     # Load wordlist
#     with open(wordlist_path, "r") as f:
#         words = [line.strip() for line in f if line.strip()]

#     # Generate possible subdomains
#     subdomains = [f"{word}.{domain}" for word in words]

#     stream_print(f"[*] Generated {len(subdomains)} subdomains to check", "info")

#     # Check if dnsx exists
#     if shutil.which("dnsx"):
#         stream_print("[+] dnsx found! Using dnsx for fast resolution...", "success")
#         live_subs = resolve_with_dnsx(subdomains)
#     else:
#         stream_print("[!] dnsx not found, falling back to Python DNS resolver...", "warning")
#         with ThreadPoolExecutor(max_workers=50) as executor:
#             results = executor.map(resolve_dns_python, subdomains)
#         live_subs = [sub for sub in results if sub]

#     stream_print(f"[+] Found {len(live_subs)} live subdomains", "success")
#     return live_subs

# if __name__ == "__main__":
#     # Example usage
#     domain = "example.com"
#     wordlist = "subdomains.txt"
#     results = active_enum(domain, wordlist)
#     for sub in results:
#         print(sub)


#--------------------------3------------------------------------#







import subprocess
import shutil
import dns.resolver
from concurrent.futures import ThreadPoolExecutor
import argparse
from stream_output import stream_print

def resolve_dns_python(subdomain):
    """Fallback DNS resolution using dnspython"""
    try:
        dns.resolver.resolve(subdomain, 'A')
        return subdomain
    except Exception:
        return None

# def resolve_with_dnsx(subdomains):
#     """Use dnsx if installed"""
#     try:
#         process = subprocess.run(
#             [r"C:\Users\ASUS\OneDrive\Desktop\Cybersecurity\intership projects\Subdomain_Enumeration\tools\dnsx.exe", "-h" ],
#             input="\n".join(subdomains).encode(),
#             capture_output=True,
#             text=True,
#             timeout=60
#         )
#         return process.stdout.strip().split("\n") if process.stdout else []
#     except Exception as e:
#         stream_print(f"[!] dnsx error: {e}", "error")
#         return []
def resolve_with_dnsx(subdomains):
    """Use dnsx if installed"""
    try:
        process = subprocess.run(
            [r"C:\Users\ASUS\OneDrive\Desktop\Cybersecurity\intership projects\Subdomain_Enumeration\tools\dnsx.exe", "-silent"],
            input="\n".join(subdomains),  # pass as string, not bytes
            capture_output=True,
            text=True,
            timeout=60
        )
        return process.stdout.strip().split("\n") if process.stdout else []
    except Exception as e:
        stream_print(f"[!] dnsx error: {e}", "error")
        return []

def active_enum(domain, wordlist_path):
    """Active subdomain enumeration with dnsx fallback"""
    # Load wordlist
    try:
        with open(wordlist_path, "r") as f:
            words = [line.strip() for line in f if line.strip()]
    except FileNotFoundError:
        stream_print(f"[!] Wordlist file not found: {wordlist_path}", "error")
        return []

    # Generate possible subdomains
    subdomains = [f"{word}.{domain}" for word in words]

    stream_print(f"[*] Generated {len(subdomains)} subdomains to check", "info")

    # Check if dnsx exists
    if shutil.which("dnsx"):
        stream_print("[+] dnsx found! Using dnsx for fast resolution...", "success")
        live_subs = resolve_with_dnsx(subdomains)
    else:
        stream_print("[!] dnsx not found, falling back to Python DNS resolver...", "warning")
        with ThreadPoolExecutor(max_workers=50) as executor:
            results = executor.map(resolve_dns_python, subdomains)
        live_subs = [sub for sub in results if sub]

    stream_print(f"[+] Found {len(live_subs)} live subdomains", "success")
    return live_subs

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Active Subdomain Enumeration")
    parser.add_argument("-d", "--domain", required=True, help="Target domain")
    parser.add_argument("-w", "--wordlist", required=True, help="Path to subdomain wordlist file")
    args = parser.parse_args()

    results = active_enum(args.domain, args.wordlist)
    for sub in results:
        print(sub)

