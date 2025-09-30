#!/bin/bash
# Install additional subdomain enumeration tools

echo "Installing modern subdomain enumeration tools..."

# Create tools directory if not exists
mkdir -p /app/tools
cd /app/tools

# Install Go if not present
if ! command -v go &> /dev/null; then
    echo "Installing Go..."
    wget https://go.dev/dl/go1.21.0.linux-arm64.tar.gz -O go.tar.gz
    tar -xf go.tar.gz
    export PATH=$PATH:/app/tools/go/bin
    echo 'export PATH=$PATH:/app/tools/go/bin' >> ~/.bashrc
fi

# Install Subfinder
if ! command -v subfinder &> /dev/null; then
    echo "Installing Subfinder..."
    go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest
fi

# Install Assetfinder
if ! command -v assetfinder &> /dev/null; then
    echo "Installing Assetfinder..."
    go install github.com/tomnomnom/assetfinder@latest
fi

# Install Amass
if ! command -v amass &> /dev/null; then
    echo "Installing Amass..."
    go install -v github.com/owasp-amass/amass/v3/...@latest
fi

# Install Httpx
if ! command -v httpx &> /dev/null; then
    echo "Installing Httpx..."
    go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest
fi

# Install Nuclei
if ! command -v nuclei &> /dev/null; then
    echo "Installing Nuclei..."
    go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
fi

# Download wordlists
echo "Downloading wordlists..."

# SecLists subdomains
if [ ! -f "subdomains-top1million-5000.txt" ]; then
    wget https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/DNS/subdomains-top1million-5000.txt
fi

# Best-dns-wordlist
if [ ! -f "best-dns-wordlist.txt" ]; then
    wget https://wordlists-cdn.assetnote.io/data/manual/best-dns-wordlist.txt
fi

# Bitquark subdomains
if [ ! -f "bitquark-subdomains-top100000.txt" ]; then
    wget https://raw.githubusercontent.com/bitquark/dnspop/master/results/bitquark-subdomains-top100000.txt
fi

echo "Installation complete!"
echo "Available tools:"
echo "- $(which subfinder 2>/dev/null || echo 'subfinder not found')"
echo "- $(which assetfinder 2>/dev/null || echo 'assetfinder not found')"
echo "- $(which amass 2>/dev/null || echo 'amass not found')"
echo "- $(which httpx 2>/dev/null || echo 'httpx not found')"
echo "- $(which nuclei 2>/dev/null || echo 'nuclei not found')"

# Copy tools to /usr/local/bin for global access
sudo cp ~/go/bin/* /usr/local/bin/ 2>/dev/null || true

echo "Tools installation script completed."