# 🗺️ DomainMapper Pro v2.0

**Advanced Subdomain Enumeration Platform**

A comprehensive, professional-grade subdomain enumeration tool with both CLI and Web interfaces, featuring passive/active enumeration, change detection, technology fingerprinting, threat intelligence, subdomain takeover detection, and beautiful reports.

---

## ✨ Features

### Core Enumeration
- **🔍 Passive Enumeration** - 6 sources (crt.sh, AlienVault, ThreatCrowd, Wayback, HackerTarget, RapidDNS)
- **⚡ Active Enumeration** - Fast wordlist-based brute-forcing with DNS resolution
- **🔄 Mixed Mode** - Combine passive and active for comprehensive results

### Advanced Features
- **📊 Change Detection** - Monitor subdomain changes over time
- **🔬 Technology Fingerprinting** - Identify web servers, CMS, frameworks
- **🛡️ Threat Intelligence** - Shodan & VirusTotal integration
- **🎯 Subdomain Takeover Detection** - Detect 18+ vulnerable services
- **📈 Report Generation** - HTML, JSON, CSV, PDF formats

### Platform Features
- **🖥️ CLI Interface** - Powerful command-line tool
- **🌐 Web Dashboard** - Modern React-based UI (FastAPI backend)
- **💾 MongoDB Storage** - Persistent scan history
- **⏰ Scheduled Scans** - Automated recurring scans
- **🔌 REST API** - Full-featured API for integrations

---

## 🚀 Quick Start

### Prerequisites
```bash
# Python 3.9+ required
python3 --version

# MongoDB (for web platform)
# Install from: https://www.mongodb.com/try/download/community
```

### Installation

```bash
# Clone or navigate to the project
cd DomainMapper

# Install dependencies
pip install -r requirements.txt

# Create necessary directories
mkdir -p history reports wordlists
```

### CLI Usage

#### Basic Passive Scan
```bash
python main.py -d example.com --passive
```

#### Active Scan with Wordlist
```bash
python main.py -d example.com --active -w wordlists/custom.txt
```

#### Full Scan with All Features
```bash
python main.py -d example.com --both -w wordlists/custom.txt --all --reports html,json,pdf
```

#### Specific Features
```bash
# With change detection
python main.py -d example.com --both -w wordlists/custom.txt --changes

# With fingerprinting
python main.py -d example.com --passive --fingerprint

# With takeover detection
python main.py -d example.com --passive --takeover

# Custom thread count
python main.py -d example.com --active -w wordlists/custom.txt -t 100
```

---

## 📖 CLI Command Reference

```
usage: main.py [-h] -d DOMAIN [--passive | --active | --both] 
               [-w WORDLIST] [-t THREADS] [--fingerprint] [--threat] 
               [--takeover] [--changes] [--all] [--reports REPORTS] 
               [--no-save] [--sources SOURCES] [-o OUTPUT] [--silent]

Required:
  -d DOMAIN, --domain DOMAIN    Target domain

Enumeration Mode:
  --passive                     Passive enumeration only
  --active                      Active enumeration only  
  --both                        Both passive and active (default)

Options:
  -w WORDLIST, --wordlist WORDLIST
                                Wordlist path for active enumeration
  -t THREADS, --threads THREADS
                                Number of threads (default: 50)

Advanced Features:
  --fingerprint                 Enable technology fingerprinting
  --threat                      Enable threat intelligence
  --takeover                    Enable subdomain takeover detection
  --changes                     Enable change detection
  --all                         Enable all advanced features

Reports:
  --reports REPORTS             Generate reports: html,json,csv,pdf
  --no-save                     Don't save results to history
  -o OUTPUT, --output OUTPUT    Custom output file path

Other:
  --sources SOURCES             Passive sources (comma-separated)
  --silent                      Silent mode (minimal output)
```

---

## 🌐 Web Platform

### Starting the Backend

```bash
# Set MongoDB URL (optional, defaults to localhost)
export MONGO_URL="mongodb://localhost:27017"

# Optional: Set API keys for enhanced features
export SHODAN_API_KEY="your_shodan_key"
export VIRUSTOTAL_API_KEY="your_virustotal_key"

# Start FastAPI server
cd backend
python server.py

# Or with uvicorn
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### API Endpoints

#### Start a Scan
```bash
POST /api/scan
{
  "domain": "example.com",
  "mode": "both",
  "wordlist": "/path/to/wordlist.txt",
  "threads": 50,
  "enable_fingerprint": true,
  "enable_threat": false,
  "enable_takeover": true,
  "enable_changes": true
}
```

#### Get Scan Status
```bash
GET /api/scan/{scan_id}
```

#### List All Scans
```bash
GET /api/scans?domain=example.com&status=completed&limit=10
```

#### Generate Report
```bash
GET /api/scan/{scan_id}/report/{format}
# format: html, json, csv, pdf
```

#### Get Statistics
```bash
GET /api/stats
```

---

## 📁 Project Structure

```
DomainMapper/
├── main.py                     # CLI application
├── config.py                   # Configuration management
├── utils.py                    # Utility functions
│
├── Enumeration Modules:
│   ├── passive_enum.py         # Passive enumeration (6 sources)
│   ├── active_enum.py          # Active enumeration (DNS brute-force)
│
├── Advanced Features:
│   ├── change_detect.py        # Change detection
│   ├── tech_fingerprint.py     # Technology fingerprinting
│   ├── threat_enrich.py        # Threat intelligence
│   ├── takeover_detect.py      # Subdomain takeover detection
│
├── Reporting:
│   ├── report_generator.py     # Multi-format report generation
│   ├── templates/              # HTML report templates
│   └── reports/                # Generated reports
│
├── Web Platform:
│   ├── backend/
│   │   └── server.py           # FastAPI backend
│   ├── frontend/               # React frontend (to be added)
│
├── Data Storage:
│   ├── history/                # Scan history files
│   ├── wordlists/              # Wordlist files
│   └── tools/                  # External tools (dnsx)
│
└── Configuration:
    ├── requirements.txt        # Python dependencies
    └── README.md              # This file
```

---

## 🎯 Use Cases

### Security Auditing
- Discover hidden subdomains
- Identify forgotten/abandoned subdomains
- Detect subdomain takeover vulnerabilities
- Map entire attack surface

### Bug Bounty Hunting
- Comprehensive target reconnaissance
- Automated change monitoring
- Technology stack identification
- Vulnerability detection

### DevOps & Asset Management
- Track infrastructure changes
- Monitor new deployments
- Maintain subdomain inventory
- Compliance reporting

---

## 🔧 Configuration

### Environment Variables

```bash
# MongoDB (for web platform)
MONGO_URL=mongodb://localhost:27017

# Optional API Keys (for enhanced features)
SHODAN_API_KEY=your_key_here
VIRUSTOTAL_API_KEY=your_key_here
SECURITYTRAILS_API_KEY=your_key_here
```

### Configuration File (`config.py`)

You can customize:
- Default threads
- DNS timeout
- Request timeout
- DNS resolvers
- Passive sources
- Report formats

---

## 📊 Output Formats

### Console Output
Beautiful colored output with progress indicators

### Text Files
Simple text files in `history/` folder:
```
domain_20250130_143022.txt
```

### HTML Reports
Professional HTML reports with:
- Executive summary
- Detailed findings table
- Statistics
- Source attribution

### JSON Reports
Machine-readable format with:
- Complete scan metadata
- Subdomain details
- Technology info
- Threat scores
- Takeover status

### CSV Reports
Spreadsheet-compatible format

### PDF Reports
Print-ready professional reports

---

## 🛠️ Advanced Usage

### Custom Wordlists

Create custom wordlists in `wordlists/` directory:
```bash
# Use common subdomain names
www
mail
api
admin
dev
staging
...
```

### Passive Source Selection

Use specific passive sources:
```bash
python main.py -d example.com --passive --sources crtsh,alienvault
```

Available sources:
- `crtsh` - Certificate Transparency Logs
- `alienvault` - AlienVault OTX
- `threatcrowd` - ThreatCrowd
- `wayback` - Wayback Machine
- `hackertarget` - HackerTarget API
- `rapiddns` - RapidDNS

### Automation

Schedule scans with cron:
```bash
# Daily scan at 2 AM
0 2 * * * cd /path/to/DomainMapper && python main.py -d example.com --all --reports html
```

---

## 🚧 Troubleshooting

### dnsx not found
```bash
# Install dnsx for faster active enumeration
go install -v github.com/projectdiscovery/dnsx/cmd/dnsx@latest

# Or use Python DNS resolver (automatic fallback)
```

### SSL Certificate Errors
```bash
# Some passive sources may have SSL issues
# The tool handles these gracefully and continues
```

### MongoDB Connection
```bash
# Ensure MongoDB is running
mongod --version

# Check connection
mongo mongodb://localhost:27017
```

### Memory Issues
```bash
# Reduce threads for large wordlists
python main.py -d example.com --active -w large.txt -t 10
```

---

## 📝 Examples

### Example 1: Quick Passive Scan
```bash
python main.py -d hackerone.com --passive
```

### Example 2: Comprehensive Audit
```bash
python main.py -d target.com \
  --both \
  -w wordlists/custom.txt \
  -t 100 \
  --all \
  --reports html,json,pdf
```

### Example 3: Monitor Changes
```bash
# First scan
python main.py -d example.com --passive

# Later scan with change detection
python main.py -d example.com --passive --changes
```

### Example 4: Takeover Hunting
```bash
python main.py -d target.com \
  --passive \
  --takeover \
  --reports html
```

---

## 🤝 Contributing

Contributions are welcome! Areas for improvement:
- Additional passive sources
- More takeover fingerprints
- React frontend completion
- Docker support
- Additional report formats

---

## 📜 License

MIT License - See LICENSE.md for details

---

## 🙏 Acknowledgments

- **Project Discovery** - dnsx tool
- **Certificate Transparency** - crt.sh
- **AlienVault** - OTX API
- **Shodan** - Threat intelligence
- **VirusTotal** - Malware detection

---

## 📞 Support

For issues, questions, or feature requests:
- GitHub Issues (if applicable)
- Documentation: This README
- API Docs: http://localhost:8001/docs (when server running)

---

## 🔐 Security Notes

**Responsible Usage:**
- Only scan domains you own or have permission to test
- Respect rate limits of passive sources
- Use API keys responsibly
- Don't abuse external services

**Data Privacy:**
- Scan results stored locally by default
- API keys never logged or transmitted
- MongoDB data encrypted at rest (configure)

---

## 🎓 Learning Resources

### Subdomain Enumeration
- OWASP Testing Guide
- Bug Bounty Methodology
- DNS Security

### Tools & Techniques
- Passive vs Active Reconnaissance
- Certificate Transparency Logs
- DNS Brute-forcing

---

**Built with ❤️ for Bug Bounty Hunters, Security Researchers, and DevOps Teams**

**Version:** 2.0.0  
**Last Updated:** January 2025  
**Status:** Production Ready ✅
