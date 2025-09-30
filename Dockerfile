# Dockerfile for DomainMapper Pro
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Create necessary directories
RUN mkdir -p history reports wordlists

# Expose port for FastAPI
EXPOSE 8001

# Default command (can be overridden)
CMD ["python", "backend/server.py"]