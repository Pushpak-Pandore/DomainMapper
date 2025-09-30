import asyncio
import aiohttp
import dns.resolver
from typing import List, Set, Dict, Optional, AsyncGenerator
import logging
from datetime import datetime
import socket
import ssl
import certifi
from urllib.parse import urlparse
import json

logger = logging.getLogger(__name__)


class SubdomainEnumerator:
    def __init__(self):
        self.discovered_subdomains: Set[str] = set()
        self.session: Optional[aiohttp.ClientSession] = None
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=10),
            connector=aiohttp.TCPConnector(ssl=False)
        )
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def enumerate_subdomains(
        self, 
        target_domain: str, 
        methods: List[str],
        progress_callback: Optional[callable] = None
    ) -> AsyncGenerator[Dict, None]:
        """
        Main enumeration function that yields discovered subdomains
        """
        self.discovered_subdomains.clear()
        total_methods = len(methods)
        
        for i, method in enumerate(methods):
            try:
                if progress_callback:
                    await progress_callback(
                        method=method,
                        progress=(i / total_methods) * 100,
                        status="running"
                    )
                
                async for subdomain_info in self._run_method(target_domain, method):
                    if subdomain_info["subdomain"] not in self.discovered_subdomains:
                        self.discovered_subdomains.add(subdomain_info["subdomain"])
                        yield subdomain_info
                        
            except Exception as e:
                logger.error(f"Error in method {method}: {e}")
                yield {
                    "subdomain": f"error-{method}",
                    "error": str(e),
                    "discovery_method": method,
                    "discovered_at": datetime.utcnow()
                }
        
        if progress_callback:
            await progress_callback(
                method="completed",
                progress=100,
                status="completed"
            )

    async def _run_method(self, domain: str, method: str) -> AsyncGenerator[Dict, None]:
        """Run specific enumeration method"""
        if method == "dns_bruteforce":
            async for result in self._dns_bruteforce(domain):
                yield result
        elif method == "certificate_transparency":
            async for result in self._certificate_transparency(domain):
                yield result
        elif method == "search_engines":
            async for result in self._search_engines(domain):
                yield result

    async def _dns_bruteforce(self, domain: str) -> AsyncGenerator[Dict, None]:
        """DNS bruteforce enumeration"""
        common_subdomains = [
            "www", "mail", "ftp", "admin", "test", "dev", "staging", "api", 
            "cdn", "blog", "shop", "store", "support", "help", "docs",
            "portal", "dashboard", "app", "mobile", "secure", "vpn",
            "webmail", "email", "pop", "imap", "smtp", "ns1", "ns2",
            "mx", "dns", "dns1", "dns2", "server", "host", "gateway"
        ]
        
        for subdomain in common_subdomains:
            full_domain = f"{subdomain}.{domain}"
            try:
                # Try to resolve DNS
                resolver = dns.resolver.Resolver()
                resolver.timeout = 3
                resolver.lifetime = 3
                
                answers = resolver.resolve(full_domain, 'A')
                ip_addresses = [str(rdata) for rdata in answers]
                
                # Get additional info
                subdomain_info = await self._get_subdomain_info(full_domain, ip_addresses)
                subdomain_info.update({
                    "subdomain": full_domain,
                    "discovery_method": "dns_bruteforce",
                    "discovered_at": datetime.utcnow()
                })
                
                yield subdomain_info
                
            except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.resolver.Timeout):
                continue
            except Exception as e:
                logger.debug(f"DNS bruteforce error for {full_domain}: {e}")
                continue

    async def _certificate_transparency(self, domain: str) -> AsyncGenerator[Dict, None]:
        """Certificate Transparency log enumeration"""
        try:
            # Use crt.sh API
            url = f"https://crt.sh/?q=%.{domain}&output=json"
            
            async with self.session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    seen_domains = set()
                    
                    for cert in data[:50]:  # Limit to first 50 results
                        name_value = cert.get("name_value", "")
                        
                        # Parse multiple domain names
                        domains = name_value.split('\n')
                        for cert_domain in domains:
                            cert_domain = cert_domain.strip()
                            if (cert_domain.endswith(f".{domain}") and 
                                cert_domain not in seen_domains and
                                "*" not in cert_domain):
                                
                                seen_domains.add(cert_domain)
                                
                                # Get IP and additional info
                                try:
                                    resolver = dns.resolver.Resolver()
                                    resolver.timeout = 2
                                    answers = resolver.resolve(cert_domain, 'A')
                                    ip_addresses = [str(rdata) for rdata in answers]
                                    
                                    subdomain_info = await self._get_subdomain_info(cert_domain, ip_addresses)
                                    subdomain_info.update({
                                        "subdomain": cert_domain,
                                        "discovery_method": "certificate_transparency",
                                        "discovered_at": datetime.utcnow()
                                    })
                                    
                                    yield subdomain_info
                                    
                                except:
                                    # Even if DNS fails, still report the subdomain
                                    yield {
                                        "subdomain": cert_domain,
                                        "ip_addresses": [],
                                        "discovery_method": "certificate_transparency",
                                        "discovered_at": datetime.utcnow(),
                                        "status": "unknown"
                                    }
                                    
        except Exception as e:
            logger.error(f"Certificate transparency error: {e}")

    async def _search_engines(self, domain: str) -> AsyncGenerator[Dict, None]:
        """Search engine enumeration (simulated for demo)"""
        # This would integrate with Google, Bing, etc. APIs
        # For demo purposes, we'll simulate some common patterns
        simulated_subdomains = [
            f"blog.{domain}",
            f"shop.{domain}", 
            f"support.{domain}",
            f"careers.{domain}"
        ]
        
        for subdomain in simulated_subdomains:
            try:
                resolver = dns.resolver.Resolver()
                resolver.timeout = 2
                answers = resolver.resolve(subdomain, 'A')
                ip_addresses = [str(rdata) for rdata in answers]
                
                subdomain_info = await self._get_subdomain_info(subdomain, ip_addresses)
                subdomain_info.update({
                    "subdomain": subdomain,
                    "discovery_method": "search_engines",
                    "discovered_at": datetime.utcnow()
                })
                
                yield subdomain_info
                
            except:
                continue

    async def _get_subdomain_info(self, subdomain: str, ip_addresses: List[str]) -> Dict:
        """Get additional information about a subdomain"""
        info = {
            "ip_addresses": ip_addresses,
            "status": "active" if ip_addresses else "inactive",
            "http_status_codes": {},
            "response_time_ms": None,
            "title": None,
            "technologies": []
        }
        
        if not ip_addresses:
            return info
            
        # Check HTTP/HTTPS status
        for protocol in ["http", "https"]:
            try:
                start_time = datetime.utcnow()
                url = f"{protocol}://{subdomain}"
                
                async with self.session.get(
                    url,
                    allow_redirects=False,
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as response:
                    end_time = datetime.utcnow()
                    response_time = (end_time - start_time).total_seconds() * 1000
                    
                    info["http_status_codes"][protocol] = response.status
                    info["response_time_ms"] = response_time
                    
                    # Try to get page title for successful responses
                    if response.status == 200 and protocol == "https":
                        try:
                            content = await response.text()
                            import re
                            title_match = re.search(r'<title[^>]*>([^<]+)</title>', content, re.IGNORECASE)
                            if title_match:
                                info["title"] = title_match.group(1).strip()[:100]
                        except:
                            pass
                    
                    break  # If we get a response, no need to try other protocol
                    
            except asyncio.TimeoutError:
                info["http_status_codes"][protocol] = 408  # Timeout
            except Exception:
                continue
                
        return info