#!/bin/bash

# Manual Image Upload Script using cURL
# This uploads product images to Supabase Storage via HTTP API

set -e

# Configuration
SUPABASE_URL="https://dntnjlodfcojzgovikic.supabase.co"
BUCKET_NAME="product-images"
ASSETS_DIR="../frontend/public/assets"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🚀 Manual Product Image Upload to Supabase"
echo "=========================================="
echo ""

# Check if SERVICE_ROLE_KEY is set
if [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo -e "${RED}❌ SUPABASE_SERVICE_KEY not set${NC}"
    echo ""
    echo "Please set your Supabase service role key:"
    echo ""
    echo "  export SUPABASE_SERVICE_KEY='eyJ...your-key-here'"
    echo ""
    echo "To get your key:"
    echo "1. Go to: https://supabase.com/dashboard/project/dntnjlodfcojzgovikic/settings/api"
    echo "2. Copy the 'service_role' key"
    echo "3. Run the export command above"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Found Supabase service key${NC}"
echo ""

# Function to upload a single file
upload_file() {
    local file_path="$1"
    local filename=$(basename "$file_path")
    local remote_path="mockups/$filename"

    echo -n "Uploading $filename... "

    # Determine content type
    local content_type="image/png"
    if [[ "$filename" == *.jpg ]] || [[ "$filename" == *.jpeg ]]; then
        content_type="image/jpeg"
    fi

    # Upload using cURL
    response=$(curl -s -X POST \
        "$SUPABASE_URL/storage/v1/object/$BUCKET_NAME/$remote_path" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
        -H "Content-Type: $content_type" \
        -H "cache-control: max-age=31536000" \
        -H "x-upsert: true" \
        --data-binary "@$file_path" \
        -w "\n%{http_code}")

    http_code=$(echo "$response" | tail -n1)

    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo -e "${GREEN}✅${NC}"
        echo "$SUPABASE_URL/storage/v1/object/public/$BUCKET_NAME/$remote_path"
    else
        echo -e "${RED}❌ (HTTP $http_code)${NC}"
        echo "$response" | head -n-1
    fi
}

# Upload all images
echo "📸 Uploading images from: $ASSETS_DIR"
echo ""

cd "$(dirname "$0")"

for file in $ASSETS_DIR/*.{png,jpg,jpeg}; do
    if [ -f "$file" ]; then
        upload_file "$file"
    fi
done

echo ""
echo -e "${GREEN}✅ Upload complete!${NC}"
echo ""
echo "Next step: Update database with new URLs"
echo "Run: npx tsx scripts/update-database-urls.ts"