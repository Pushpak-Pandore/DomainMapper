# 🚀 Quick Start Guide - DomainMapper Pro

## 5-Minute Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Run Your First Scan

```bash
# Simple passive scan
python main.py -d example.com --passive

# Full featured scan
python main.py -d example.com --both -w wordlists/custom.txt --all --reports html
```

### 3. View Results

Results are saved in:
- `history/` - Text files with subdomains
- `reports/` - HTML/JSON/PDF reports

---

## Common Commands

### Quick Passive Scan
```bash
python main.py -d target.com --passive
```

### Active Scan with Custom Wordlist
```bash
python main.py -d target.com --active -w wordlists/custom.txt
```

### Full Scan with All Features
```bash
python main.py -d target.com --both -w wordlists/custom.txt --all
```

### Generate Reports
```bash
python main.py -d target.com --passive --reports html,json,pdf
```

---

## Web Platform (Optional)

### Using Docker (Recommended)

```bash
# Start everything
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop
docker-compose down
```

Access API: http://localhost:8001/docs

### Manual Setup

```bash
# Start MongoDB
mongod

# Start backend
cd backend
python server.py

# Or with uvicorn
uvicorn server:app --reload
```

---

## API Quick Test

```bash
# Start a scan
curl -X POST "http://localhost:8001/api/scan" \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "example.com",
    "mode": "passive",
    "enable_fingerprint": true
  }'

# Get scan status (use scan_id from previous response)
curl "http://localhost:8001/api/scan/{scan_id}"

# List all scans
curl "http://localhost:8001/api/scans"

# Get statistics
curl "http://localhost:8001/api/stats"
```

---

## Configuration (Optional)

### Set API Keys for Enhanced Features

```bash
# Shodan (for threat intelligence)
export SHODAN_API_KEY="your_key_here"

# VirusTotal (for malware checking)
export VIRUSTOTAL_API_KEY="your_key_here"
```

### Customize Settings

Edit `config.py` to change:
- Default threads
- DNS resolvers
- Passive sources
- Timeouts

---

## Troubleshooting

### Issue: "Module not found"
```bash
pip install -r requirements.txt
```

### Issue: "MongoDB connection failed"
```bash
# Make sure MongoDB is running
docker-compose up -d mongodb
# OR
mongod
```

### Issue: "dnsx not found" (for active scans)
```bash
# Tool will automatically use Python DNS resolver
# For faster scanning, install dnsx:
go install -v github.com/projectdiscovery/dnsx/cmd/dnsx@latest
```

---

## Next Steps

1. ✅ Run your first scan
2. 📖 Read full [README_NEW.md](README_NEW.md)
3. 🌐 Try the Web API
4. 🎯 Customize for your use case
5. 🐛 Report issues or contribute

---

## Support

- 📖 Documentation: README_NEW.md
- 🔧 API Docs: http://localhost:8001/docs
- 💬 CLI Help: `python main.py --help`

---

**Happy Subdomain Hunting! 🗺️**