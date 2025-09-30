"""
Report generation in multiple formats (HTML, JSON, CSV, PDF)
"""
import json
import csv
from typing import List, Dict
from datetime import datetime
from pathlib import Path
from jinja2 import Environment, FileSystemLoader
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from stream_output import stream_print
from config import REPORTS_DIR, TEMPLATES_DIR
from utils import format_display_time


def generate_html_report(domain: str, scan_data: Dict, output_path: str = None) -> str:
    """
    Generate HTML report using Jinja2 template
    
    Returns:
        Path to generated report
    """
    try:
        # Load Jinja2 template
        env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)))
        template = env.get_template('report_template.html')
        
        # Prepare data for template
        results = []
        for sub in scan_data.get('subdomains', []):
            results.append({
                'subdomain': sub,
                'ip': scan_data.get('ips', {}).get(sub, '-'),
                'source': scan_data.get('sources', {}).get(sub, '-')
            })
        
        meta = {
            'scan_date': format_display_time(scan_data.get('timestamp')),
            'mode': scan_data.get('mode', 'mixed'),
            'total': len(results)
        }
        
        # Render template
        html_content = template.render(
            domain=domain,
            results=results,
            meta=meta
        )
        
        # Save to file
        if not output_path:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = REPORTS_DIR / f"{domain}_report_{timestamp}.html"
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        stream_print(f"[✓] HTML report saved: {output_path}", "success")
        return str(output_path)
    
    except Exception as e:
        stream_print(f"[!] Error generating HTML report: {e}", "error")
        return None


def generate_json_report(domain: str, scan_data: Dict, output_path: str = None) -> str:
    """
    Generate JSON report
    
    Returns:
        Path to generated report
    """
    try:
        report_data = {
            'domain': domain,
            'scan_date': format_display_time(scan_data.get('timestamp')),
            'mode': scan_data.get('mode', 'mixed'),
            'total_subdomains': len(scan_data.get('subdomains', [])),
            'subdomains': []
        }
        
        # Add subdomain details
        for sub in scan_data.get('subdomains', []):
            subdomain_data = {
                'subdomain': sub,
                'ip': scan_data.get('ips', {}).get(sub),
                'cname': scan_data.get('cnames', {}).get(sub),
                'source': scan_data.get('sources', {}).get(sub),
                'http_status': scan_data.get('http_status', {}).get(sub),
                'technologies': scan_data.get('technologies', {}).get(sub),
                'threat_score': scan_data.get('threat_scores', {}).get(sub),
                'takeover_vulnerable': scan_data.get('takeover_vulnerable', {}).get(sub)
            }
            report_data['subdomains'].append(subdomain_data)
        
        # Add summary statistics
        report_data['statistics'] = {
            'passive_count': scan_data.get('passive_count', 0),
            'active_count': scan_data.get('active_count', 0),
            'live_count': len([s for s in scan_data.get('http_status', {}).values() if s]),
            'vulnerable_count': len([v for v in scan_data.get('takeover_vulnerable', {}).values() if v]),
            'suspicious_count': len([s for s in scan_data.get('threat_scores', {}).values() if s > 50])
        }
        
        # Save to file
        if not output_path:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = REPORTS_DIR / f"{domain}_report_{timestamp}.json"
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(report_data, f, indent=2, ensure_ascii=False)
        
        stream_print(f"[✓] JSON report saved: {output_path}", "success")
        return str(output_path)
    
    except Exception as e:
        stream_print(f"[!] Error generating JSON report: {e}", "error")
        return None


def generate_csv_report(domain: str, scan_data: Dict, output_path: str = None) -> str:
    """
    Generate CSV report
    
    Returns:
        Path to generated report
    """
    try:
        if not output_path:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = REPORTS_DIR / f"{domain}_report_{timestamp}.csv"
        
        with open(output_path, 'w', newline='', encoding='utf-8') as f:
            fieldnames = ['subdomain', 'ip', 'cname', 'http_status', 'source', 'threat_score', 'takeover_vulnerable']
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            
            writer.writeheader()
            
            for sub in scan_data.get('subdomains', []):
                writer.writerow({
                    'subdomain': sub,
                    'ip': scan_data.get('ips', {}).get(sub, ''),
                    'cname': scan_data.get('cnames', {}).get(sub, ''),
                    'http_status': scan_data.get('http_status', {}).get(sub, ''),
                    'source': scan_data.get('sources', {}).get(sub, ''),
                    'threat_score': scan_data.get('threat_scores', {}).get(sub, ''),
                    'takeover_vulnerable': scan_data.get('takeover_vulnerable', {}).get(sub, '')
                })
        
        stream_print(f"[✓] CSV report saved: {output_path}", "success")
        return str(output_path)
    
    except Exception as e:
        stream_print(f"[!] Error generating CSV report: {e}", "error")
        return None


def generate_pdf_report(domain: str, scan_data: Dict, output_path: str = None) -> str:
    """
    Generate PDF report
    
    Returns:
        Path to generated report
    """
    try:
        if not output_path:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = REPORTS_DIR / f"{domain}_report_{timestamp}.pdf"
        
        doc = SimpleDocTemplate(str(output_path), pagesize=A4)
        story = []
        styles = getSampleStyleSheet()
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#2c3e50'),
            spaceAfter=30,
            alignment=TA_CENTER
        )
        story.append(Paragraph(f"Subdomain Enumeration Report", title_style))
        story.append(Spacer(1, 0.2*inch))
        
        # Metadata
        meta_style = styles['Normal']
        story.append(Paragraph(f"<b>Target Domain:</b> {domain}", meta_style))
        story.append(Paragraph(f"<b>Scan Date:</b> {format_display_time(scan_data.get('timestamp'))}", meta_style))
        story.append(Paragraph(f"<b>Mode:</b> {scan_data.get('mode', 'mixed')}", meta_style))
        story.append(Paragraph(f"<b>Total Subdomains:</b> {len(scan_data.get('subdomains', []))}", meta_style))
        story.append(Spacer(1, 0.3*inch))
        
        # Summary statistics
        story.append(Paragraph("<b>Summary Statistics</b>", styles['Heading2']))
        stats_data = [
            ['Metric', 'Count'],
            ['Passive Enumeration', str(scan_data.get('passive_count', 0))],
            ['Active Enumeration', str(scan_data.get('active_count', 0))],
            ['Live Subdomains', str(len([s for s in scan_data.get('http_status', {}).values() if s]))],
            ['Vulnerable to Takeover', str(len([v for v in scan_data.get('takeover_vulnerable', {}).values() if v]))],
            ['Suspicious (Threat)', str(len([s for s in scan_data.get('threat_scores', {}).values() if s > 50]))]
        ]
        
        stats_table = Table(stats_data, colWidths=[3*inch, 2*inch])
        stats_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(stats_table)
        story.append(Spacer(1, 0.3*inch))
        
        # Subdomains table (first 50)
        story.append(Paragraph("<b>Discovered Subdomains (first 50)</b>", styles['Heading2']))
        
        table_data = [['#', 'Subdomain', 'IP', 'Status']]
        subdomains = scan_data.get('subdomains', [])[:50]
        
        for i, sub in enumerate(subdomains, 1):
            table_data.append([
                str(i),
                sub,
                scan_data.get('ips', {}).get(sub, '-')[:15],  # Truncate long IPs
                str(scan_data.get('http_status', {}).get(sub, '-'))
            ])
        
        sub_table = Table(table_data, colWidths=[0.5*inch, 3*inch, 1.5*inch, 1*inch])
        sub_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey])
        ]))
        story.append(sub_table)
        
        if len(scan_data.get('subdomains', [])) > 50:
            story.append(Spacer(1, 0.2*inch))
            story.append(Paragraph(f"<i>... and {len(scan_data.get('subdomains', [])) - 50} more subdomains</i>", styles['Normal']))
        
        # Build PDF
        doc.build(story)
        
        stream_print(f"[✓] PDF report saved: {output_path}", "success")
        return str(output_path)
    
    except Exception as e:
        stream_print(f"[!] Error generating PDF report: {e}", "error")
        return None


def generate_reports(domain: str, scan_data: Dict, formats: List[str] = None) -> Dict[str, str]:
    """
    Generate reports in multiple formats
    
    Args:
        domain: Target domain
        scan_data: Scan results data
        formats: List of formats to generate (default: all)
    
    Returns:
        Dictionary mapping format to file path
    """
    if formats is None:
        formats = ['html', 'json', 'csv', 'pdf']
    
    reports = {}
    
    for format_type in formats:
        if format_type == 'html':
            path = generate_html_report(domain, scan_data)
            if path:
                reports['html'] = path
        elif format_type == 'json':
            path = generate_json_report(domain, scan_data)
            if path:
                reports['json'] = path
        elif format_type == 'csv':
            path = generate_csv_report(domain, scan_data)
            if path:
                reports['csv'] = path
        elif format_type == 'pdf':
            path = generate_pdf_report(domain, scan_data)
            if path:
                reports['pdf'] = path
    
    return reports


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python report_generator.py <domain>")
        sys.exit(1)
    
    # Example usage
    domain = sys.argv[1]
    scan_data = {
        'timestamp': datetime.now(),
        'mode': 'both',
        'subdomains': [f'test{i}.{domain}' for i in range(10)],
        'ips': {f'test{i}.{domain}': f'192.168.1.{i}' for i in range(10)},
        'sources': {f'test{i}.{domain}': 'passive' for i in range(10)},
        'passive_count': 10,
        'active_count': 0
    }
    
    reports = generate_reports(domain, scan_data)
    print(f"\n[✓] Generated reports:")
    for format_type, path in reports.items():
        print(f"  - {format_type.upper()}: {path}")