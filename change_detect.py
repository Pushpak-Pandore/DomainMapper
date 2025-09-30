"""
Change detection - Monitor subdomain changes over time
"""
from typing import Dict, List, Optional
from datetime import datetime
from pathlib import Path
from config import HISTORY_DIR
from utils import calculate_diff, save_to_file, format_timestamp
from stream_output import stream_print


def get_latest_scan(domain: str) -> Optional[tuple]:
    """
    Get the latest scan results for a domain
    
    Returns:
        Tuple of (filepath, subdomains_list) or None
    """
    try:
        # Find all scan files for this domain
        scan_files = sorted(HISTORY_DIR.glob(f"{domain}_*.txt"), reverse=True)
        
        if not scan_files:
            return None
        
        latest_file = scan_files[0]
        
        # Read subdomains from file
        with open(latest_file, 'r', encoding='utf-8') as f:
            subdomains = [line.strip() for line in f if line.strip() and not line.startswith('#')]
        
        return (str(latest_file), subdomains)
    
    except Exception as e:
        stream_print(f"[!] Error loading previous scan: {e}", "error")
        return None


def detect_changes(domain: str, current_subdomains: List[str]) -> Dict:
    """
    Compare current scan with previous scan and detect changes
    
    Args:
        domain: Target domain
        current_subdomains: List of current subdomains
    
    Returns:
        Dictionary with change information
    """
    result = {
        'has_previous': False,
        'previous_file': None,
        'previous_count': 0,
        'current_count': len(current_subdomains),
        'added': [],
        'removed': [],
        'unchanged': [],
        'timestamp': datetime.now().isoformat()
    }
    
    # Get previous scan
    previous_scan = get_latest_scan(domain)
    
    if previous_scan is None:
        stream_print("[*] No previous scan found - this is the first scan", "info")
        return result
    
    previous_file, previous_subdomains = previous_scan
    
    result['has_previous'] = True
    result['previous_file'] = previous_file
    result['previous_count'] = len(previous_subdomains)
    
    # Calculate differences
    diff = calculate_diff(previous_subdomains, current_subdomains)
    
    result['added'] = diff['added']
    result['removed'] = diff['removed']
    result['unchanged'] = diff['unchanged']
    
    # Print summary
    stream_print(f"\n[*] Change Detection Results:", "info")
    stream_print(f"  Previous scan: {len(previous_subdomains)} subdomains", "info")
    stream_print(f"  Current scan: {len(current_subdomains)} subdomains", "info")
    
    if diff['added']:
        stream_print(f"  [+] New subdomains: {len(diff['added'])}", "success")
        for sub in diff['added'][:10]:  # Show first 10
            stream_print(f"      + {sub}", "highlight")
        if len(diff['added']) > 10:
            stream_print(f"      ... and {len(diff['added']) - 10} more", "info")
    
    if diff['removed']:
        stream_print(f"  [-] Removed subdomains: {len(diff['removed'])}", "error")
        for sub in diff['removed'][:10]:  # Show first 10
            stream_print(f"      - {sub}", "error")
        if len(diff['removed']) > 10:
            stream_print(f"      ... and {len(diff['removed']) - 10} more", "info")
    
    if not diff['added'] and not diff['removed']:
        stream_print(f"  [=] No changes detected", "info")
    
    return result


def save_change_report(domain: str, change_data: Dict) -> Optional[str]:
    """
    Save change detection report to file
    
    Returns:
        Path to saved report or None
    """
    try:
        timestamp = format_timestamp()
        report_file = HISTORY_DIR / f"{domain}_changes_{timestamp}.txt"
        
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(f"# Change Detection Report\n")
            f.write(f"# Domain: {domain}\n")
            f.write(f"# Timestamp: {change_data['timestamp']}\n")
            f.write(f"# Previous scan: {change_data['previous_count']} subdomains\n")
            f.write(f"# Current scan: {change_data['current_count']} subdomains\n")
            f.write(f"\n")
            
            if change_data['added']:
                f.write(f"\n## New Subdomains ({len(change_data['added'])})\n")
                for sub in change_data['added']:
                    f.write(f"+ {sub}\n")
            
            if change_data['removed']:
                f.write(f"\n## Removed Subdomains ({len(change_data['removed'])})\n")
                for sub in change_data['removed']:
                    f.write(f"- {sub}\n")
            
            if change_data['unchanged']:
                f.write(f"\n## Unchanged Subdomains ({len(change_data['unchanged'])})\n")
                for sub in change_data['unchanged']:
                    f.write(f"= {sub}\n")
        
        stream_print(f"[✓] Change report saved: {report_file}", "success")
        return str(report_file)
    
    except Exception as e:
        stream_print(f"[!] Error saving change report: {e}", "error")
        return None


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python change_detect.py <domain> [subdomains_file]")
        sys.exit(1)
    
    domain = sys.argv[1]
    
    # Load current subdomains
    if len(sys.argv) > 2:
        with open(sys.argv[2], 'r') as f:
            current = [line.strip() for line in f if line.strip()]
    else:
        current = []
    
    # Detect changes
    changes = detect_changes(domain, current)
    
    # Save report
    if changes['has_previous']:
        save_change_report(domain, changes)