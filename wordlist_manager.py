#!/usr/bin/env python3
"""
Enhanced Wordlist Management System
Generates, manages, and optimizes wordlists for active enumeration
"""

import os
import requests
import gzip
import shutil
from pathlib import Path
from typing import List, Set, Dict, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
import tldextract
from stream_output import stream_print
from config import WORDLISTS_DIR


class WordlistManager:
    """
    Advanced wordlist management for subdomain enumeration
    """
    
    def __init__(self):
        self.wordlists_dir = Path(WORDLISTS_DIR)
        self.wordlists_dir.mkdir(exist_ok=True)
        
        # Popular wordlist sources
        self.sources = {
            'seclists_top1m': 'https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/DNS/subdomains-top1million-5000.txt',
            'assetnote_best': 'https://wordlists-cdn.assetnote.io/data/manual/best-dns-wordlist.txt',
            'bitquark_top100k': 'https://raw.githubusercontent.com/bitquark/dnspop/master/results/bitquark-subdomains-top100000.txt',
            'jhaddix_all': 'https://gist.githubusercontent.com/jhaddix/86a06c5dc309d08580a018c66354a056/raw/f58e82c9abfa46a932eb92edbe6b18214141439b/all.txt',
            'fierce_hostlist': 'https://raw.githubusercontent.com/mschwager/fierce/master/lists/hosts.txt',
        }
        
        # Common subdomain patterns by category
        self.patterns = {
            'common': [
                'www', 'mail', 'ftp', 'localhost', 'webmail', 'smtp', 'pop', 'ns1', 'webdisk',
                'ns2', 'cpanel', 'whm', 'autodiscover', 'autoconfig', 'ns', 'test', 'staging',
                'dev', 'api', 'cdn', 'admin', 'support', 'blog', 'shop', 'store'
            ],
            'technical': [
                'jenkins', 'jira', 'confluence', 'gitlab', 'github', 'bitbucket', 'grafana',
                'kibana', 'prometheus', 'monitoring', 'metrics', 'logs', 'elastic', 'splunk',
                'sonar', 'nexus', 'docker', 'k8s', 'kubernetes', 'rancher', 'portainer'
            ],
            'cloud': [
                'aws', 'azure', 's3', 'ec2', 'gcp', 'cloud', 'lambda', 'api-gateway',
                'cloudfront', 'storage', 'backup', 'cdn', 'static', 'assets', 'uploads'
            ],
            'security': [
                'vpn', 'firewall', 'proxy', 'gateway', 'auth', 'sso', 'ldap', 'ad',
                'radius', 'pki', 'vault', 'secret', 'cert', 'ssl', 'tls', 'security'
            ],
            'environment': [
                'prod', 'production', 'staging', 'stage', 'dev', 'development', 'test',
                'testing', 'qa', 'uat', 'sandbox', 'demo', 'preview', 'beta', 'alpha'
            ]
        }
    
    def download_wordlist(self, name: str, url: str, force: bool = False) -> bool:
        """Download wordlist from URL"""
        filepath = self.wordlists_dir / f"{name}.txt"
        
        if filepath.exists() and not force:
            stream_print(f"[*] Wordlist {name} already exists", "info")
            return True
        
        try:
            stream_print(f"[*] Downloading {name} wordlist...", "info")
            response = requests.get(url, timeout=60, stream=True)
            response.raise_for_status()
            
            # Handle gzipped content
            if url.endswith('.gz') or 'gzip' in response.headers.get('content-encoding', ''):
                with gzip.open(response.raw, 'rt', encoding='utf-8', errors='ignore') as gz_file:
                    content = gz_file.read()
            else:
                content = response.text
            
            # Clean and save
            lines = [line.strip() for line in content.split('\n') if line.strip() and not line.startswith('#')]
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write('\n'.join(lines))
            
            stream_print(f"[+] Downloaded {name}: {len(lines)} entries", "success")
            return True
            
        except Exception as e:
            stream_print(f"[!] Error downloading {name}: {e}", "error")
            return False
    
    def download_all_wordlists(self, force: bool = False) -> Dict[str, bool]:
        """Download all wordlists"""
        results = {}
        
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = {
                executor.submit(self.download_wordlist, name, url, force): name
                for name, url in self.sources.items()
            }
            
            for future in as_completed(futures):
                name = futures[future]
                results[name] = future.result()
        
        return results
    
    def generate_custom_wordlist(self, domain: str, categories: List[str] = None, 
                                include_numbers: bool = True, 
                                include_hyphens: bool = True) -> List[str]:
        """Generate custom wordlist based on domain and categories"""
        
        if categories is None:
            categories = ['common', 'technical', 'environment']
        
        # Extract domain info
        extracted = tldextract.extract(domain)
        domain_name = extracted.domain.lower()
        
        wordlist = set()
        
        # Add base patterns
        for category in categories:
            if category in self.patterns:
                wordlist.update(self.patterns[category])
        
        # Domain-specific variations
        domain_variations = [
            domain_name,
            domain_name[:3] if len(domain_name) > 3 else domain_name,
            domain_name[:4] if len(domain_name) > 4 else domain_name,
        ]
        
        # Combine with common prefixes/suffixes
        prefixes = ['', 'app-', 'api-', 'web-', 'mail-', 'ftp-', 'vpn-']
        suffixes = ['', '-api', '-web', '-app', '-mail', '-dev', '-prod', '-test']
        
        for variation in domain_variations:
            for prefix in prefixes:
                for suffix in suffixes:
                    word = f"{prefix}{variation}{suffix}".strip('-')
                    if word and len(word) > 1:
                        wordlist.add(word)
        
        # Add numbered variations
        if include_numbers:
            base_words = list(wordlist)[:20]  # Limit to prevent explosion
            for word in base_words:
                for i in range(1, 11):  # 1-10
                    wordlist.add(f"{word}{i}")
                    wordlist.add(f"{word}0{i}" if i < 10 else f"{word}{i}")
        
        # Add hyphenated variations
        if include_hyphens:
            base_words = list(wordlist)[:50]
            for word in base_words:
                if '-' not in word and len(word) > 4:
                    # Split at common points
                    mid = len(word) // 2
                    wordlist.add(f"{word[:mid]}-{word[mid:]}")
        
        return sorted(wordlist)
    
    def merge_wordlists(self, wordlist_names: List[str], output_name: str, 
                       deduplicate: bool = True, max_length: Optional[int] = None) -> str:
        """Merge multiple wordlists into one"""
        
        all_words = set() if deduplicate else []
        total_original = 0
        
        for name in wordlist_names:
            filepath = self.wordlists_dir / f"{name}.txt"
            if filepath.exists():
                try:
                    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                        words = [line.strip().lower() for line in f if line.strip()]
                        total_original += len(words)
                        
                        if deduplicate:
                            all_words.update(words)
                        else:
                            all_words.extend(words)
                        
                        stream_print(f"[+] Loaded {name}: {len(words)} entries", "info")
                except Exception as e:
                    stream_print(f"[!] Error loading {name}: {e}", "error")
        
        # Convert to list and sort
        final_words = sorted(all_words) if deduplicate else sorted(set(all_words))
        
        # Apply max length filter
        if max_length:
            final_words = [word for word in final_words if len(word) <= max_length]
        
        # Save merged wordlist
        output_path = self.wordlists_dir / f"{output_name}.txt"
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write('\n'.join(final_words))
            
            stream_print(f"[✓] Merged wordlist saved: {output_name}", "success")
            stream_print(f"  • Original entries: {total_original:,}", "info")
            stream_print(f"  • Final entries: {len(final_words):,}", "info")
            stream_print(f"  • Reduction: {((total_original - len(final_words)) / total_original * 100):.1f}%", "info")
            
        except Exception as e:
            stream_print(f"[!] Error saving merged wordlist: {e}", "error")
            return None
        
        return str(output_path)
    
    def optimize_wordlist(self, wordlist_name: str, min_length: int = 2, 
                         max_length: int = 63, remove_duplicates: bool = True,
                         remove_numbers_only: bool = True) -> str:
        """Optimize existing wordlist"""
        
        filepath = self.wordlists_dir / f"{wordlist_name}.txt"
        if not filepath.exists():
            stream_print(f"[!] Wordlist {wordlist_name} not found", "error")
            return None
        
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                words = [line.strip().lower() for line in f if line.strip()]
            
            original_count = len(words)
            stream_print(f"[*] Optimizing {wordlist_name}: {original_count:,} entries", "info")
            
            # Apply filters
            filtered_words = []
            for word in words:
                # Length filter
                if len(word) < min_length or len(word) > max_length:
                    continue
                
                # Numbers only filter
                if remove_numbers_only and word.isdigit():
                    continue
                
                # Valid subdomain characters
                if not all(c.isalnum() or c in '-_.' for c in word):
                    continue
                
                # Avoid starting/ending with hyphen or dot
                if word.startswith('-') or word.endswith('-') or word.startswith('.') or word.endswith('.'):
                    continue
                
                filtered_words.append(word)
            
            # Remove duplicates
            if remove_duplicates:
                filtered_words = list(dict.fromkeys(filtered_words))  # Preserve order
            
            # Save optimized version
            optimized_path = self.wordlists_dir / f"{wordlist_name}_optimized.txt"
            with open(optimized_path, 'w', encoding='utf-8') as f:
                f.write('\n'.join(filtered_words))
            
            stream_print(f"[✓] Optimized wordlist saved: {wordlist_name}_optimized", "success")
            stream_print(f"  • Original: {original_count:,} entries", "info")
            stream_print(f"  • Optimized: {len(filtered_words):,} entries", "info")
            stream_print(f"  • Reduction: {((original_count - len(filtered_words)) / original_count * 100):.1f}%", "info")
            
            return str(optimized_path)
            
        except Exception as e:
            stream_print(f"[!] Error optimizing wordlist: {e}", "error")
            return None
    
    def list_wordlists(self) -> Dict[str, Dict]:
        """List all available wordlists with stats"""
        wordlists = {}
        
        for filepath in self.wordlists_dir.glob('*.txt'):
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    lines = [line.strip() for line in f if line.strip()]
                
                wordlists[filepath.stem] = {
                    'path': str(filepath),
                    'entries': len(lines),
                    'size_mb': filepath.stat().st_size / 1024 / 1024,
                    'modified': filepath.stat().st_mtime
                }
            except Exception as e:
                stream_print(f"[!] Error reading {filepath}: {e}", "error")
        
        return wordlists
    
    def get_best_wordlist(self, domain: str, max_size: int = 50000) -> str:
        """Get the best wordlist for a domain"""
        wordlists = self.list_wordlists()
        
        # Priority order
        preferred = [
            'merged_optimized',
            'custom_' + domain.replace('.', '_'),
            'assetnote_best',
            'seclists_top1m',
            'bitquark_top100k',
            'custom'
        ]
        
        for name in preferred:
            if name in wordlists and wordlists[name]['entries'] <= max_size:
                return wordlists[name]['path']
        
        # Fallback to smallest available
        if wordlists:
            smallest = min(wordlists.items(), key=lambda x: x[1]['entries'])
            return smallest[1]['path']
        
        # Generate custom if none available
        custom_words = self.generate_custom_wordlist(domain)
        custom_path = self.wordlists_dir / 'custom.txt'
        with open(custom_path, 'w') as f:
            f.write('\n'.join(custom_words))
        
        return str(custom_path)


def setup_wordlists(force_download: bool = False) -> bool:
    """Setup wordlists for the first time"""
    manager = WordlistManager()
    
    stream_print("[*] Setting up wordlists...", "info")
    
    # Download popular wordlists
    results = manager.download_all_wordlists(force=force_download)
    
    # Create merged wordlist
    available = [name for name, success in results.items() if success]
    if available:
        merged_path = manager.merge_wordlists(
            available[:3],  # Use top 3 to avoid huge files
            'merged',
            max_length=50
        )
        
        if merged_path:
            manager.optimize_wordlist('merged')
    
    stream_print(f"[✓] Wordlist setup complete!", "success")
    
    # Show summary
    wordlists = manager.list_wordlists()
    stream_print(f"\n📊 Available Wordlists:", "info")
    for name, stats in wordlists.items():
        stream_print(f"  • {name}: {stats['entries']:,} entries ({stats['size_mb']:.1f} MB)", "highlight")
    
    return True


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "setup":
            setup_wordlists()
        elif command == "generate" and len(sys.argv) > 2:
            domain = sys.argv[2]
            manager = WordlistManager()
            words = manager.generate_custom_wordlist(domain)
            
            output_path = manager.wordlists_dir / f"custom_{domain.replace('.', '_')}.txt"
            with open(output_path, 'w') as f:
                f.write('\n'.join(words))
            
            print(f"Generated custom wordlist for {domain}: {len(words)} entries")
            print(f"Saved to: {output_path}")
        elif command == "list":
            manager = WordlistManager()
            wordlists = manager.list_wordlists()
            
            print("\nAvailable Wordlists:")
            for name, stats in wordlists.items():
                print(f"  {name}: {stats['entries']:,} entries ({stats['size_mb']:.1f} MB)")
        else:
            print("Usage: python wordlist_manager.py [setup|generate <domain>|list]")
    else:
        setup_wordlists()