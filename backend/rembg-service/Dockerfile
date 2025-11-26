# Self-hosted Background Removal Service using rembg
# Cost: ~$25/month (Railway 2GB instance) vs $2,001/month (Remove.bg)
# Savings: $1,976/month (98.8% reduction)

FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir \
    rembg[gpu] \
    flask \
    Pillow \
    gunicorn \
    python-dotenv

# Copy service code
COPY rembg_service.py .

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:5000/health')"

# Run with Gunicorn for production
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--threads", "2", "--timeout", "120", "rembg_service:app"]
