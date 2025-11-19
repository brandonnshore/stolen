#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

SUPABASE_URL="https://dntnjlodfcojzgovikic.supabase.co"
BUCKET_NAME="product-images"

if [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo -e "${RED}❌ SUPABASE_SERVICE_KEY not set${NC}"
    echo "  Please set it first:"
    echo "  export SUPABASE_SERVICE_KEY='your-service-key-here'"
    exit 1
fi

echo -e "${BLUE}📤 Uploading white t-shirt mockups to Supabase Storage...${NC}\n"

# Convert and upload blank-tshirt.png as white-front.png
echo "1. Converting blank-tshirt.png → white-front.png"
cp ../frontend/public/assets/blank-tshirt.png /tmp/white-front.png

curl -s -X POST \
    "$SUPABASE_URL/storage/v1/object/$BUCKET_NAME/mockups/white-front.png" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
    -H "Content-Type: image/png" \
    --data-binary @/tmp/white-front.png > /dev/null

if [ $? -eq 0 ]; then
    echo -e "   ${GREEN}✅ Uploaded white-front.png${NC}"
    echo "   https://dntnjlodfcojzgovikic.supabase.co/storage/v1/object/public/product-images/mockups/white-front.png"
else
    echo -e "   ${RED}❌ Failed to upload white-front.png${NC}"
fi

# Convert and upload back-tshirt.jpeg as white-back.png
echo -e "\n2. Converting back-tshirt.jpeg → white-back.png"
sips -s format png ../frontend/public/assets/back-tshirt.jpeg --out /tmp/white-back.png > /dev/null 2>&1

curl -s -X POST \
    "$SUPABASE_URL/storage/v1/object/$BUCKET_NAME/mockups/white-back.png" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
    -H "Content-Type: image/png" \
    --data-binary @/tmp/white-back.png > /dev/null

if [ $? -eq 0 ]; then
    echo -e "   ${GREEN}✅ Uploaded white-back.png${NC}"
    echo "   https://dntnjlodfcojzgovikic.supabase.co/storage/v1/object/public/product-images/mockups/white-back.png"
else
    echo -e "   ${RED}❌ Failed to upload white-back.png${NC}"
fi

# Convert and upload neck-tshirt.jpeg as white-neck.png
echo -e "\n3. Converting neck-tshirt.jpeg → white-neck.png"
sips -s format png ../frontend/public/assets/neck-tshirt.jpeg --out /tmp/white-neck.png > /dev/null 2>&1

curl -s -X POST \
    "$SUPABASE_URL/storage/v1/object/$BUCKET_NAME/mockups/white-neck.png" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
    -H "Content-Type: image/png" \
    --data-binary @/tmp/white-neck.png > /dev/null

if [ $? -eq 0 ]; then
    echo -e "   ${GREEN}✅ Uploaded white-neck.png${NC}"
    echo "   https://dntnjlodfcojzgovikic.supabase.co/storage/v1/object/public/product-images/mockups/white-neck.png"
else
    echo -e "   ${RED}❌ Failed to upload white-neck.png${NC}"
fi

echo -e "\n${GREEN}✅ Done! White t-shirt mockups uploaded to Supabase${NC}"
