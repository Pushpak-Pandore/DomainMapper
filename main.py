"""
DomainMapper - Advanced Subdomain Enumeration Tool
Main CLI Application
"""
import argparse
import sys
from datetime import datetime
from pathlib import Path

from stream_output import stream_print
from passive_enum import passive_enum
from active_enum import active_enum
from change_detect import detect_changes, save_change_report
from tech_fingerprint import fingerprint_subdomains
from threat_enrich import enrich_subdomains
from takeover_detect import scan_takeover
from report_generator import generate_reports
from utils import (
    is_valid_domain, sanitize_domain, deduplicate_subdomains,
    save_to_file, format_timestamp, resolve_ips
)
from config import HISTORY_DIR, WORDLISTS_DIR


def print_banner():
    """Print tool banner"""
    banner = """
    ╔══════════════════════════════════════════════════════════╗
    ║                                                          ║
    ║              🗺️  DomainMapper Pro v2.0 🗺️               ║
    ║                                                          ║
    ║        Advanced Subdomain Enumeration Platform          ║
    ║                                                          ║
    ╚══════════════════════════════════════════════════════════╝
    """
    print(banner)


def save_results(domain: str, subdomains: list) -> str:
    """Save scan results to history folder"""
    timestamp = format_timestamp()
    filename = HISTORY_DIR / f"{domain}_{timestamp}.txt"
    
    header = f"Domain: {domain} | Timestamp: {datetime.now().isoformat()} | Count: {len(subdomains)}"
    save_to_file(filename, subdomains, header)
    
    return str(filename)


def main():
    print_banner()
    
    parser = argparse.ArgumentParser(
        description="DomainMapper Pro - Advanced Subdomain Enumeration",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Passive enumeration only
  python main.py -d example.com --passive
  
  # Active enumeration with custom wordlist
  python main.py -d example.com --active -w wordlists/custom.txt
  
  # Both modes with all features
  python main.py -d example.com --both -w wordlists/custom.txt --fingerprint --takeover
  
  # Full scan with reports
  python main.py -d example.com --both -w wordlists/custom.txt --all --reports html,json,pdf
        """
    )
    
    # Required arguments
    parser.add_argument("-d", "--domain", required=True, help="Target domain")
    
    # Enumeration mode
    mode_group = parser.add_mutually_exclusive_group()
    mode_group.add_argument("--passive", action="store_true", help="Passive enumeration only")
    mode_group.add_argument("--active", action="store_true", help="Active enumeration only")
    mode_group.add_argument("--both", action="store_true", help="Both passive and active (default)")
    
    # Wordlist for active enumeration
    parser.add_argument("-w", "--wordlist", help="Wordlist path for active enumeration")
    parser.add_argument("-t", "--threads", type=int, default=50, help="Number of threads (default: 50)")
    
    # Advanced features
    parser.add_argument("--fingerprint", action="store_true", help="Enable technology fingerprinting")
    parser.add_argument("--threat", action="store_true", help="Enable threat intelligence enrichment")
    parser.add_argument("--takeover", action="store_true", help="Enable subdomain takeover detection")
    parser.add_argument("--changes", action="store_true", help="Enable change detection")
    parser.add_argument("--all", action="store_true", help="Enable all advanced features")
    
    # Report options
    parser.add_argument("--reports", help="Generate reports (comma-separated: html,json,csv,pdf)")
    parser.add_argument("--no-save", action="store_true", help="Don't save results to history")
    
    # Passive sources
    parser.add_argument("--sources", help="Passive sources (comma-separated, default: all)")
    
    # Output options
    parser.add_argument("-o", "--output", help="Output file path")
    parser.add_argument("--silent", action="store_true", help="Silent mode (minimal output)")
    
    args = parser.parse_args()
    
    # Validate domain
    domain = sanitize_domain(args.domain)
    if not is_valid_domain(domain):
        stream_print(f"[!] Invalid domain: {domain}", "error")
        sys.exit(1)
    
    # Determine mode
    if args.passive:
        mode = "passive"
    elif args.active:
        mode = "active"
    else:
        mode = "both"
    
    # Enable all features if --all is set
    if args.all:
        args.fingerprint = True
        args.threat = True
        args.takeover = True
        args.changes = True
    
    stream_print(f"\n[*] Target: {domain}", "info")
    stream_print(f"[*] Mode: {mode}", "info")
    stream_print(f"[*] Threads: {args.threads}", "info")
    
    all_subdomains = []
    scan_data = {
        'timestamp': datetime.now(),
        'mode': mode,
        'subdomains': [],
        'ips': {},
        'sources': {},
        'passive_count': 0,
        'active_count': 0
    }
    
    # ========== PASSIVE ENUMERATION ==========
    if mode in ["passive", "both"]:
        stream_print(f"\n{'='*60}", "info")
        stream_print(f"[*] Starting Passive Enumeration", "info")
        stream_print(f"{'='*60}", "info")
        
        sources = args.sources.split(',') if args.sources else None
        passive_results = passive_enum(domain, sources)
        
        all_subdomains.extend(passive_results)
        scan_data['passive_count'] = len(passive_results)
        
        # Mark sources
        for sub in passive_results:
            scan_data['sources'][sub] = 'passive'
    
    # ========== ACTIVE ENUMERATION ==========
    if mode in ["active", "both"]:
        stream_print(f"\n{'='*60}", "info")
        stream_print(f"[*] Starting Active Enumeration", "info")
        stream_print(f"{'='*60}", "info")
        
        # Get wordlist
        if not args.wordlist:
            default_wordlist = WORDLISTS_DIR / "custom.txt"
            if default_wordlist.exists():
                args.wordlist = str(default_wordlist)
            else:
                stream_print("[!] No wordlist specified and default not found", "error")
                stream_print("[!] Use -w to specify a wordlist", "error")
                if mode == "active":
                    sys.exit(1)
        
        if args.wordlist:
            active_results = active_enum(domain, args.wordlist, threads=args.threads)
            all_subdomains.extend(active_results)
            scan_data['active_count'] = len(active_results)
            
            # Mark sources
            for sub in active_results:
                if sub not in scan_data['sources']:
                    scan_data['sources'][sub] = 'active'
    
    # Deduplicate subdomains
    all_subdomains = deduplicate_subdomains(all_subdomains)
    scan_data['subdomains'] = all_subdomains
    
    stream_print(f"\n{'='*60}", "success")
    stream_print(f"[✓] Total Unique Subdomains Found: {len(all_subdomains)}", "success")
    stream_print(f"{'='*60}", "success")
    
    if not args.silent:
        for i, sub in enumerate(all_subdomains[:20], 1):
            stream_print(f"  {i:3d}. {sub}", "highlight")
        if len(all_subdomains) > 20:
            stream_print(f"  ... and {len(all_subdomains) - 20} more", "info")
    
    # ========== CHANGE DETECTION ==========
    if args.changes:
        stream_print(f"\n{'='*60}", "info")
        stream_print(f"[*] Change Detection", "info")
        stream_print(f"{'='*60}", "info")
        
        change_data = detect_changes(domain, all_subdomains)
        if change_data['has_previous']:
            save_change_report(domain, change_data)
    
    # ========== TECHNOLOGY FINGERPRINTING ==========
    if args.fingerprint and all_subdomains:
        stream_print(f"\n{'='*60}", "info")
        stream_print(f"[*] Technology Fingerprinting", "info")
        stream_print(f"{'='*60}", "info")
        
        # Fingerprint a subset if too many
        to_fingerprint = all_subdomains[:50] if len(all_subdomains) > 50 else all_subdomains
        fingerprint_results = fingerprint_subdomains(to_fingerprint, threads=args.threads // 2)
        
        # Add to scan data
        scan_data['technologies'] = {}
        scan_data['http_status'] = {}
        for result in fingerprint_results:
            sub = result['subdomain']
            scan_data['http_status'][sub] = result.get('http_status')
            scan_data['technologies'][sub] = {
                'server': result.get('server'),
                'cms': result.get('cms'),
            }
    
    # ========== THREAT INTELLIGENCE ==========
    if args.threat and all_subdomains:
        stream_print(f"\n{'='*60}", "info")
        stream_print(f"[*] Threat Intelligence Enrichment", "info")
        stream_print(f"{'='*60}", "info")
        
        # Enrich a subset if too many
        to_enrich = all_subdomains[:30] if len(all_subdomains) > 30 else all_subdomains
        threat_results = enrich_subdomains(to_enrich, threads=5)
        
        # Add to scan data
        scan_data['threat_scores'] = {}
        for result in threat_results:
            sub = result['subdomain']
            scan_data['threat_scores'][sub] = result.get('threat_score', 0)
    
    # ========== SUBDOMAIN TAKEOVER DETECTION ==========
    if args.takeover and all_subdomains:
        stream_print(f"\n{'='*60}", "info")
        stream_print(f"[*] Subdomain Takeover Detection", "info")
        stream_print(f"{'='*60}", "info")
        
        takeover_results = scan_takeover(all_subdomains, threads=args.threads // 2)
        
        # Add to scan data
        scan_data['takeover_vulnerable'] = {}
        scan_data['cnames'] = {}
        for result in takeover_results:
            sub = result['subdomain']
            scan_data['takeover_vulnerable'][sub] = result.get('vulnerable', False)
            scan_data['cnames'][sub] = result.get('cname')
    
    # Resolve IPs for all subdomains (for reports)
    stream_print(f"\n[*] Resolving IP addresses...", "info")
    for sub in all_subdomains[:100]:  # Limit to first 100
        ips = resolve_ips(sub)
        if ips:
            scan_data['ips'][sub] = ', '.join(ips)
    
    # ========== SAVE RESULTS ==========
    if not args.no_save:
        stream_print(f"\n[*] Saving results...", "info")
        history_file = save_results(domain, all_subdomains)
        stream_print(f"[✓] Results saved to: {history_file}", "success")
    
    # ========== GENERATE REPORTS ==========
    if args.reports:
        stream_print(f"\n{'='*60}", "info")
        stream_print(f"[*] Generating Reports", "info")
        stream_print(f"{'='*60}", "info")
        
        formats = [f.strip().lower() for f in args.reports.split(',')]
        reports = generate_reports(domain, scan_data, formats)
        
        stream_print(f"\n[✓] Reports generated:", "success")
        for format_type, path in reports.items():
            stream_print(f"  - {format_type.upper()}: {path}", "highlight")
    
    # ========== CUSTOM OUTPUT ==========
    if args.output:
        save_to_file(args.output, all_subdomains)
        stream_print(f"\n[✓] Results exported to: {args.output}", "success")
    
    # ========== SUMMARY ==========
    stream_print(f"\n{'='*60}", "success")
    stream_print(f"[✓] Scan Complete!", "success")
    stream_print(f"{'='*60}", "success")
    stream_print(f"\n📊 Summary:", "info")
    stream_print(f"  • Total subdomains: {len(all_subdomains)}", "info")
    stream_print(f"  • Passive count: {scan_data['passive_count']}", "info")
    stream_print(f"  • Active count: {scan_data['active_count']}", "info")
    
    if args.fingerprint:
        live_count = len([s for s in scan_data.get('http_status', {}).values() if s])
        stream_print(f"  • Live subdomains: {live_count}", "info")
    
    if args.takeover:
        vuln_count = len([v for v in scan_data.get('takeover_vulnerable', {}).values() if v])
        stream_print(f"  • Vulnerable to takeover: {vuln_count}", "error" if vuln_count > 0 else "info")
    
    if args.threat:
        suspicious_count = len([s for s in scan_data.get('threat_scores', {}).values() if s > 50])
        stream_print(f"  • Suspicious subdomains: {suspicious_count}", "error" if suspicious_count > 0 else "info")
    
    stream_print(f"\n✨ Thank you for using DomainMapper Pro! ✨\n", "success")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        stream_print("\n\n[!] Scan interrupted by user", "error")
        sys.exit(1)
    except Exception as e:
        stream_print(f"\n[!] Fatal error: {e}", "error")
        import traceback
        traceback.print_exc()
        sys.exit(1)
