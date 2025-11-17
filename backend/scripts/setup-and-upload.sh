#!/bin/bash

# Interactive Setup and Upload Script
# This script helps you get the Supabase key and upload images

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

clear
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Product Images Upload to Supabase - Setup Wizard         ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo ""

PROJECT_ID="dntnjlodfcojzgovikic"
SUPABASE_URL="https://$PROJECT_ID.supabase.co"

echo -e "${YELLOW}Step 1: Get Your Supabase Service Role Key${NC}"
echo "─────────────────────────────────────────────────"
echo ""
echo "We'll open your Supabase API settings page..."
echo ""
read -p "Press ENTER to open Supabase Dashboard..."

# Open Supabase API settings
open "https://supabase.com/dashboard/project/$PROJECT_ID/settings/api" 2>/dev/null || \
    xdg-open "https://supabase.com/dashboard/project/$PROJECT_ID/settings/api" 2>/dev/null || \
    echo "Please open: https://supabase.com/dashboard/project/$PROJECT_ID/settings/api"

echo ""
echo "In the Supabase Dashboard:"
echo "  1. Scroll to 'Project API keys'"
echo "  2. Find the ${GREEN}service_role${NC} key (NOT the anon key)"
echo "  3. Click to reveal and copy the key"
echo ""
echo "The key starts with: eyJ..."
echo ""

# Prompt for service key
read -p "Paste your service_role key here: " SERVICE_KEY
echo ""

if [ -z "$SERVICE_KEY" ]; then
    echo -e "${RED}❌ No key provided. Exiting.${NC}"
    exit 1
fi

# Validate key format (basic check)
if [[ ! "$SERVICE_KEY" =~ ^eyJ ]]; then
    echo -e "${RED}❌ Invalid key format. Key should start with 'eyJ'${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Key looks valid!${NC}"
echo ""

# Update .env file
echo -e "${YELLOW}Step 2: Updating .env file${NC}"
echo "─────────────────────────────────────────────────"

ENV_FILE="../.env"

if grep -q "^SUPABASE_SERVICE_KEY=" "$ENV_FILE" 2>/dev/null; then
    # Update existing
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|^SUPABASE_SERVICE_KEY=.*|SUPABASE_SERVICE_KEY=$SERVICE_KEY|" "$ENV_FILE"
    else
        sed -i "s|^SUPABASE_SERVICE_KEY=.*|SUPABASE_SERVICE_KEY=$SERVICE_KEY|" "$ENV_FILE"
    fi
    echo -e "${GREEN}✅ Updated existing SUPABASE_SERVICE_KEY in .env${NC}"
else
    # Append new
    echo "SUPABASE_SERVICE_KEY=$SERVICE_KEY" >> "$ENV_FILE"
    echo -e "${GREEN}✅ Added SUPABASE_SERVICE_KEY to .env${NC}"
fi

echo ""

# Check for bucket
echo -e "${YELLOW}Step 3: Verify Storage Bucket${NC}"
echo "─────────────────────────────────────────────────"
echo ""
echo "Opening Supabase Storage page..."
read -p "Press ENTER to continue..."

open "https://supabase.com/dashboard/project/$PROJECT_ID/storage/buckets" 2>/dev/null || \
    xdg-open "https://supabase.com/dashboard/project/$PROJECT_ID/storage/buckets" 2>/dev/null || \
    echo "Please open: https://supabase.com/dashboard/project/$PROJECT_ID/storage/buckets"

echo ""
echo "Check if a bucket named '${GREEN}product-images${NC}' exists."
echo ""
echo "If it DOES NOT exist:"
echo "  1. Click 'New bucket'"
echo "  2. Name: product-images"
echo "  3. ✅ Check 'Public bucket'"
echo "  4. File size limit: 10 MB"
echo "  5. Click 'Create'"
echo ""

read -p "Bucket ready? Press ENTER when done..."
echo ""

# Run upload
echo -e "${YELLOW}Step 4: Upload Images${NC}"
echo "─────────────────────────────────────────────────"
echo ""
echo "Starting upload..."
echo ""

cd "$(dirname "$0")"
npx tsx upload-all-products-to-supabase.ts

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ UPLOAD COMPLETE!                                       ║${NC}"
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo ""
echo "Your product images are now stored in Supabase!"
echo ""
echo "Next steps:"
echo "  • Test image URLs in your browser"
echo "  • Rebuild your iOS app"
echo "  • Verify images load correctly"
echo ""