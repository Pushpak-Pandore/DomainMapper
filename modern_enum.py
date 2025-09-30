#!/usr/bin/env python3
"""
Modern Subdomain Enumeration Integration
Integrates with cutting-edge tools like Subfinder, Amass, Assetfinder
"""

import os
import subprocess
import tempfile
import json
from typing import List, Set, Dict, Optional
from concurrent.futures import ThreadPoolExecutor
from stream_output import stream_print
from config import DEFAULT_THREADS


class ModernEnumerator:
    """
    Modern subdomain enumeration using latest tools
    """
    
    def __init__(self):
        self.tools = {
            'subfinder': self._check_subfinder(),
            'assetfinder': self._check_assetfinder(),
            'amass': self._check_amass(),
            'httpx': self._check_httpx(),
            'nuclei': self._check_nuclei()
        }
        
    def _check_tool(self, tool_name: str) -> bool:
        """Check if a tool is available"""
        return subprocess.run(['which', tool_name], 
                            capture_output=True, text=True).returncode == 0
    
    def _check_subfinder(self) -> bool:
        return self._check_tool('subfinder')
    
    def _check_assetfinder(self) -> bool:
        return self._check_tool('assetfinder')
    
    def _check_amass(self) -> bool:
        return self._check_tool('amass')
    
    def _check_httpx(self) -> bool:
        return self._check_tool('httpx')
    
    def _check_nuclei(self) -> bool:
        return self._check_tool('nuclei')
    
    def enumerate_with_subfinder(self, domain: str, sources: List[str] = None) -> Set[str]:
        """Enumerate subdomains using Subfinder"""
        if not self.tools['subfinder']:
            stream_print("[!] Subfinder not available", "warning")
            return set()
        
        subdomains = set()
        try:
            cmd = ['subfinder', '-d', domain, '-silent', '-all']
            
            if sources:
                cmd.extend(['-sources', ','.join(sources)])
            
            stream_print("[*] Running Subfinder enumeration...", "info")
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            if result.returncode == 0:
                for line in result.stdout.strip().split('\n'):
                    if line and domain in line:
                        subdomains.add(line.strip().lower())
            
            stream_print(f"[+] Subfinder: {len(subdomains)} found", "success")
            
        except subprocess.TimeoutExpired:
            stream_print("[!] Subfinder timeout", "error")
        except Exception as e:
            stream_print(f"[!] Subfinder error: {e}", "error")
        
        return subdomains
    
    def enumerate_with_assetfinder(self, domain: str) -> Set[str]:
        """Enumerate subdomains using Assetfinder"""
        if not self.tools['assetfinder']:
            stream_print("[!] Assetfinder not available", "warning")
            return set()
        
        subdomains = set()
        try:
            cmd = ['assetfinder', '--subs-only', domain]
            
            stream_print("[*] Running Assetfinder enumeration...", "info")
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            if result.returncode == 0:
                for line in result.stdout.strip().split('\n'):
                    if line and domain in line:
                        subdomains.add(line.strip().lower())
            
            stream_print(f"[+] Assetfinder: {len(subdomains)} found", "success")
            
        except subprocess.TimeoutExpired:
            stream_print("[!] Assetfinder timeout", "error")
        except Exception as e:
            stream_print(f"[!] Assetfinder error: {e}", "error")
        
        return subdomains
    
    def enumerate_with_amass(self, domain: str, timeout: int = 600) -> Set[str]:
        """Enumerate subdomains using Amass"""
        if not self.tools['amass']:
            stream_print("[!] Amass not available", "warning")
            return set()
        
        subdomains = set()
        try:
            cmd = ['amass', 'enum', '-d', domain, '-passive', '-silent']
            
            stream_print("[*] Running Amass enumeration (this may take a while)...", "info")
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
            
            if result.returncode == 0:
                for line in result.stdout.strip().split('\n'):
                    if line and domain in line:
                        subdomains.add(line.strip().lower())
            
            stream_print(f"[+] Amass: {len(subdomains)} found", "success")
            
        except subprocess.TimeoutExpired:
            stream_print("[!] Amass timeout", "error")
        except Exception as e:
            stream_print(f"[!] Amass error: {e}", "error")
        
        return subdomains
    
    def probe_with_httpx(self, subdomains: List[str], threads: int = DEFAULT_THREADS) -> Dict[str, Dict]:
        """Probe subdomains using Httpx"""
        if not self.tools['httpx'] or not subdomains:
            return {}
        
        results = {}
        
        # Create temporary file with subdomains
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as tmp:
            tmp.write('\n'.join(subdomains))
            tmp_path = tmp.name
        
        try:
            cmd = [
                'httpx', 
                '-l', tmp_path,
                '-silent',
                '-json',
                '-status-code',
                '-title',
                '-tech-detect',
                '-server',
                '-threads', str(threads),
                '-timeout', '10',
                '-retries', '2'
            ]
            
            stream_print(f"[*] Probing {len(subdomains)} subdomains with Httpx...", "info")
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
            
            if result.returncode == 0:
                for line in result.stdout.strip().split('\n'):
                    if line:
                        try:
                            data = json.loads(line)
                            url = data.get('url', '')
                            if url:
                                # Extract hostname from URL
                                hostname = url.replace('https://', '').replace('http://', '').split('/')[0]
                                results[hostname] = {
                                    'url': url,
                                    'status_code': data.get('status_code'),
                                    'title': data.get('title', ''),
                                    'server': data.get('server', ''),
                                    'tech': data.get('tech', []),
                                    'content_length': data.get('content_length', 0)
                                }
                        except json.JSONDecodeError:
                            continue
            
            stream_print(f"[+] Httpx: {len(results)} live subdomains found", "success")
            
        except subprocess.TimeoutExpired:
            stream_print("[!] Httpx timeout", "error")
        except Exception as e:
            stream_print(f"[!] Httpx error: {e}", "error")
        finally:
            os.unlink(tmp_path)
        
        return results
    
    def scan_with_nuclei(self, targets: List[str], templates: str = "cves,vulnerabilities", threads: int = 10) -> List[Dict]:
        """Scan for vulnerabilities using Nuclei"""
        if not self.tools['nuclei'] or not targets:
            return []
        
        vulnerabilities = []
        
        # Create temporary file with targets
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as tmp:
            tmp.write('\n'.join(targets))
            tmp_path = tmp.name
        
        try:
            cmd = [
                'nuclei',
                '-l', tmp_path,
                '-silent',
                '-json',
                '-t', templates,
                '-c', str(threads),
                '-timeout', '10',
                '-retries', '1'
            ]
            
            stream_print(f"[*] Scanning {len(targets)} targets with Nuclei...", "info")
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=900)  # 15 minutes
            
            if result.returncode == 0:
                for line in result.stdout.strip().split('\n'):
                    if line:
                        try:
                            vuln = json.loads(line)
                            vulnerabilities.append({
                                'host': vuln.get('host', ''),
                                'template_id': vuln.get('template-id', ''),
                                'name': vuln.get('info', {}).get('name', ''),
                                'severity': vuln.get('info', {}).get('severity', ''),
                                'description': vuln.get('info', {}).get('description', ''),
                                'matched_at': vuln.get('matched-at', '')
                            })
                        except json.JSONDecodeError:
                            continue
            
            stream_print(f"[+] Nuclei: {len(vulnerabilities)} vulnerabilities found", "success" if len(vulnerabilities) == 0 else "warning")
            
        except subprocess.TimeoutExpired:
            stream_print("[!] Nuclei timeout", "error")
        except Exception as e:
            stream_print(f"[!] Nuclei error: {e}", "error")
        finally:
            os.unlink(tmp_path)
        
        return vulnerabilities
    
    def comprehensive_enum(self, domain: str, 
                          use_subfinder: bool = True,
                          use_assetfinder: bool = True, 
                          use_amass: bool = False,  # Slower, off by default
                          probe_http: bool = True,
                          vulnerability_scan: bool = False,
                          threads: int = DEFAULT_THREADS) -> Dict:
        """Run comprehensive enumeration using multiple tools"""
        
        stream_print(f"\n[*] Starting comprehensive enumeration for {domain}", "info")
        stream_print(f"[*] Available tools: {list(k for k, v in self.tools.items() if v)}", "info")
        
        all_subdomains = set()
        results = {
            'subdomains': [],
            'live_subdomains': {},
            'vulnerabilities': [],
            'tool_results': {}
        }
        
        # Passive enumeration with multiple tools
        if use_subfinder and self.tools['subfinder']:
            subfinder_subs = self.enumerate_with_subfinder(domain)
            all_subdomains.update(subfinder_subs)
            results['tool_results']['subfinder'] = len(subfinder_subs)
        
        if use_assetfinder and self.tools['assetfinder']:
            assetfinder_subs = self.enumerate_with_assetfinder(domain)
            all_subdomains.update(assetfinder_subs)
            results['tool_results']['assetfinder'] = len(assetfinder_subs)
        
        if use_amass and self.tools['amass']:
            amass_subs = self.enumerate_with_amass(domain)
            all_subdomains.update(amass_subs)
            results['tool_results']['amass'] = len(amass_subs)
        
        results['subdomains'] = sorted(all_subdomains)
        
        # HTTP probing
        if probe_http and all_subdomains and self.tools['httpx']:
            live_results = self.probe_with_httpx(list(all_subdomains), threads)
            results['live_subdomains'] = live_results
        
        # Vulnerability scanning
        if vulnerability_scan and results['live_subdomains'] and self.tools['nuclei']:
            live_targets = [data['url'] for data in results['live_subdomains'].values()]
            vulnerabilities = self.scan_with_nuclei(live_targets, threads=threads//2)
            results['vulnerabilities'] = vulnerabilities
        
        stream_print(f"\n[✓] Comprehensive enumeration complete:", "success")
        stream_print(f"  • Total subdomains: {len(results['subdomains'])}", "info")
        stream_print(f"  • Live subdomains: {len(results['live_subdomains'])}", "info")
        stream_print(f"  • Vulnerabilities: {len(results['vulnerabilities'])}", "warning" if results['vulnerabilities'] else "info")
        
        return results


def modern_enum(domain: str, 
               use_subfinder: bool = True,
               use_assetfinder: bool = True,
               use_amass: bool = False,
               probe_http: bool = True,
               vulnerability_scan: bool = False,
               threads: int = DEFAULT_THREADS) -> List[str]:
    """Modern enumeration function compatible with existing codebase"""
    
    enumerator = ModernEnumerator()
    results = enumerator.comprehensive_enum(
        domain=domain,
        use_subfinder=use_subfinder,
        use_assetfinder=use_assetfinder,
        use_amass=use_amass,
        probe_http=probe_http,
        vulnerability_scan=vulnerability_scan,
        threads=threads
    )
    
    return results['subdomains']


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python modern_enum.py <domain> [--amass] [--vuln]")
        sys.exit(1)
    
    domain = sys.argv[1]
    use_amass = '--amass' in sys.argv
    vuln_scan = '--vuln' in sys.argv
    
    enumerator = ModernEnumerator()
    results = enumerator.comprehensive_enum(
        domain=domain,
        use_amass=use_amass,
        vulnerability_scan=vuln_scan
    )
    
    print(f"\n📊 Results Summary:")
    print(f"Total subdomains: {len(results['subdomains'])}")
    print(f"Live subdomains: {len(results['live_subdomains'])}")
    print(f"Vulnerabilities: {len(results['vulnerabilities'])}")
    
    print(f"\n🎯 Subdomains Found:")
    for sub in results['subdomains'][:20]:  # Show first 20
        print(f"  - {sub}")
    if len(results['subdomains']) > 20:
        print(f"  ... and {len(results['subdomains']) - 20} more")