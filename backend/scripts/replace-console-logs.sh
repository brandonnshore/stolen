#!/bin/bash

# Script to replace console.* calls with logger.* calls in TypeScript files
# This improves observability by using structured logging

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Replacing console.* calls with logger.* calls${NC}"
echo "=================================================="

# Function to replace console calls in a file
replace_in_file() {
    local file=$1
    local temp_file=$(mktemp)

    # Check if file imports logger
    if ! grep -q "import.*logger.*from.*utils/logger" "$file"; then
        # Add logger import at the top after other imports
        sed -i.bak '1,/^import/!b; /^import/a\
import { logger } from'"'"'../utils/logger'"'"';
' "$file"
    fi

    # Replace console.log -> logger.info
    sed -i.bak "s/console\.log(/logger.info(/g" "$file"

    # Replace console.error -> logger.error (but keep the message, add empty context)
    sed -i.bak "s/console\.error(\([^,)]*\))/logger.error(\1, {})/g" "$file"
    sed -i.bak "s/console\.error(\([^,)]*\), \(.*\))/logger.error(\1, {}, \2)/g" "$file"

    # Replace console.warn -> logger.warn
    sed -i.bak "s/console\.warn(/logger.warn(/g" "$file"

    # Replace console.debug -> logger.debug
    sed -i.bak "s/console\.debug(/logger.debug(/g" "$file"

    # Clean up backup file
    rm -f "${file}.bak"

    echo -e "${GREEN}✓${NC} Updated: $file"
}

# Find all TypeScript files in src directory
echo "Finding TypeScript files..."
files=$(find ../src -name "*.ts" -type f)

count=0
for file in $files; do
    if grep -q "console\." "$file"; then
        replace_in_file "$file"
        count=$((count + 1))
    fi
done

echo ""
echo -e "${GREEN}✓ Successfully updated $count files${NC}"
echo ""
echo -e "${YELLOW}Note: Some files may need manual adjustment for complex console.error calls with multiple arguments.${NC}"
echo -e "${YELLOW}Please review the changes and test the application.${NC}"
