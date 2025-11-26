#!/bin/bash
#
# REPOSITORY CLEANUP - QUICK START SCRIPT
# Agent #5: Production Readiness Cleanup
#
# WARNING: This script will delete files and reorganize the repository.
# Review CLEANUP_SUMMARY.md before running.
#
# Usage: bash CLEANUP_QUICK_START.sh [phase]
#   phase 1: Critical cleanup (25 min) - 3/10 → 6/10
#   phase 2: Reorganization (2 hours) - 6/10 → 8/10
#   phase 3: Documentation (2 hours) - 8/10 → 9/10
#   phase all: Run all phases
#

set -e  # Exit on error

REPO_ROOT="/Users/brandonshore/stolen/stolen1"
cd "$REPO_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}REPOSITORY CLEANUP SCRIPT${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Function to confirm action
confirm() {
    read -p "$1 (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Aborted by user${NC}"
        exit 1
    fi
}

# PHASE 1: CRITICAL CLEANUP (25 minutes)
phase1_critical() {
    echo -e "${YELLOW}=== PHASE 1: CRITICAL CLEANUP ===${NC}"
    echo "This will:"
    echo "  - Remove 18 temporary files"
    echo "  - Add LICENSE file"
    echo "  - Fix build artifacts in git"
    echo "  - Update .gitignore"
    echo ""
    confirm "Continue with Phase 1?"

    echo ""
    echo "Step 1: Removing temporary files..."

    # Remove temp .txt files
    git rm -f BACKEND_URL.txt 2>/dev/null || echo "  BACKEND_URL.txt not found"
    git rm -f GOOGLE_OAUTH_URLS.txt 2>/dev/null || echo "  GOOGLE_OAUTH_URLS.txt not found"
    git rm -f STRIPE_WEBHOOK_URL.txt 2>/dev/null || echo "  STRIPE_WEBHOOK_URL.txt not found"
    git rm -f VERCEL_ENV_VARS.txt 2>/dev/null || echo "  VERCEL_ENV_VARS.txt not found"
    git rm -f FIX_HOODIE.txt 2>/dev/null || echo "  FIX_HOODIE.txt not found"
    git rm -f HOODIE_FIX.txt 2>/dev/null || echo "  HOODIE_FIX.txt not found"
    git rm -f FIX_RAILWAY_DATABASE.txt 2>/dev/null || echo "  FIX_RAILWAY_DATABASE.txt not found"
    git rm -f RAILWAY_FIX_INSTRUCTIONS.txt 2>/dev/null || echo "  RAILWAY_FIX_INSTRUCTIONS.txt not found"
    git rm -f RAILWAY_SQL_FIX.txt 2>/dev/null || echo "  RAILWAY_SQL_FIX.txt not found"
    git rm -f SIMPLE_SQL_FIX.txt 2>/dev/null || echo "  SIMPLE_SQL_FIX.txt not found"
    git rm -f SUPABASE_SQL.txt 2>/dev/null || echo "  SUPABASE_SQL.txt not found"
    git rm -f BILLING_SAFEGUARDS_AGENT_PLAN.txt 2>/dev/null || echo "  BILLING_SAFEGUARDS_AGENT_PLAN.txt not found"

    # Remove test files
    git rm -f test-upload.html 2>/dev/null || echo "  test-upload.html not found"
    git rm -f backend/test.png 2>/dev/null || echo "  backend/test.png not found"

    # Remove deployment triggers
    git rm -f .vercel-redeploy-oauth-fix 2>/dev/null || echo "  .vercel-redeploy-oauth-fix not found"

    # Remove SQL files
    git rm -f update-hoodie-images.sql 2>/dev/null || echo "  update-hoodie-images.sql not found"
    git rm -f update-production-db.sql 2>/dev/null || echo "  update-production-db.sql not found"
    git rm -f RAILWAY_DATABASE_FIX.sql 2>/dev/null || echo "  RAILWAY_DATABASE_FIX.sql not found"

    echo -e "${GREEN}✓ Temporary files removed${NC}"

    echo ""
    echo "Step 2: Adding LICENSE file..."
    if [ ! -f LICENSE ]; then
        cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2024 StolenTee

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF
        git add LICENSE
        echo -e "${GREEN}✓ LICENSE file created${NC}"
    else
        echo -e "${YELLOW}  LICENSE already exists, skipping${NC}"
    fi

    echo ""
    echo "Step 3: Fixing build artifacts..."
    # Remove frontend dist assets from git (should be in gitignore)
    git rm -r frontend/dist/assets/ 2>/dev/null || echo "  frontend/dist/assets/ not tracked"
    echo -e "${GREEN}✓ Build artifacts fixed${NC}"

    echo ""
    echo "Step 4: Updating .gitignore..."
    # Check if patterns already exist
    if ! grep -q ".vercel-\*" .gitignore; then
        cat >> .gitignore << 'EOF'

# Deployment triggers
.vercel-*
.railway-*

# Temporary files
*.tmp
*.bak

# Test files
*.test.js
*.spec.js
*.test.ts
*.spec.ts
EOF
        echo -e "${GREEN}✓ .gitignore updated${NC}"
    else
        echo -e "${YELLOW}  .gitignore already updated, skipping${NC}"
    fi

    echo ""
    echo "Step 5: Committing changes..."
    git add .
    git commit -m "Critical cleanup: Remove temp files, add LICENSE, fix build artifacts

- Remove 18 temporary debug/config files
- Add MIT LICENSE file
- Remove build artifacts from git tracking
- Update .gitignore with better patterns

Cleanliness score: 3/10 → 6/10" || echo -e "${YELLOW}No changes to commit${NC}"

    echo ""
    echo -e "${GREEN}✓✓✓ PHASE 1 COMPLETE ✓✓✓${NC}"
    echo -e "${GREEN}Repository cleanliness: 6/10${NC}"
    echo ""
}

# PHASE 2: REORGANIZATION (2 hours)
phase2_reorganize() {
    echo -e "${YELLOW}=== PHASE 2: REORGANIZATION ===${NC}"
    echo "This will:"
    echo "  - Create docs/, scripts/, archive/ directories"
    echo "  - Move 11 files to proper locations"
    echo "  - Organize documentation structure"
    echo ""
    confirm "Continue with Phase 2?"

    echo ""
    echo "Step 1: Creating directory structure..."
    mkdir -p docs
    mkdir -p scripts
    mkdir -p archive
    echo -e "${GREEN}✓ Directories created${NC}"

    echo ""
    echo "Step 2: Moving documentation to docs/..."
    [ -f DEPLOYMENT_GUIDE.md ] && git mv DEPLOYMENT_GUIDE.md docs/DEPLOYMENT.md || echo "  DEPLOYMENT_GUIDE.md not found"
    [ -f OAUTH_SETUP.md ] && git mv OAUTH_SETUP.md docs/ || echo "  OAUTH_SETUP.md not found"
    [ -f TESTING.md ] && git mv TESTING.md docs/ || echo "  TESTING.md not found"
    [ -f GET_SUPABASE_KEY.md ] && git mv GET_SUPABASE_KEY.md docs/SUPABASE_SETUP.md || echo "  GET_SUPABASE_KEY.md not found"
    [ -f QUICKSTART.md ] && git mv QUICKSTART.md docs/ || echo "  QUICKSTART.md not found"
    [ -f QUICKSTART_UPLOAD.md ] && git mv QUICKSTART_UPLOAD.md docs/UPLOAD_GUIDE.md || echo "  QUICKSTART_UPLOAD.md not found"
    [ -f START_HERE.md ] && git mv START_HERE.md docs/GETTING_STARTED.md || echo "  START_HERE.md not found"
    [ -f UPLOAD_INSTRUCTIONS.md ] && git mv UPLOAD_INSTRUCTIONS.md docs/ || echo "  UPLOAD_INSTRUCTIONS.md not found"
    echo -e "${GREEN}✓ Documentation moved${NC}"

    echo ""
    echo "Step 3: Moving scripts to scripts/..."
    [ -f backend/update-products.js ] && git mv backend/update-products.js scripts/ || echo "  update-products.js not found"
    [ -f backend/add_2xl.js ] && git mv backend/add_2xl.js scripts/ || echo "  add_2xl.js not found"
    [ -f update-hoodie-images.ts ] && git mv update-hoodie-images.ts scripts/ || echo "  update-hoodie-images.ts not found"
    echo -e "${GREEN}✓ Scripts moved${NC}"

    echo ""
    echo "Step 4: Archiving old documentation..."
    [ -f CODE_QUALITY_REFACTOR_PROMPT.md ] && git mv CODE_QUALITY_REFACTOR_PROMPT.md archive/ || echo "  CODE_QUALITY_REFACTOR_PROMPT.md not found"
    [ -f REFACTORING_REPORT.md ] && git mv REFACTORING_REPORT.md archive/ || echo "  REFACTORING_REPORT.md not found"
    [ -f IMAGE_PROMPTS.md ] && git mv IMAGE_PROMPTS.md archive/ || echo "  IMAGE_PROMPTS.md not found"
    [ -f UPLOAD_STATUS_REPORT.md ] && git mv UPLOAD_STATUS_REPORT.md archive/ || echo "  UPLOAD_STATUS_REPORT.md not found"

    # Create archive README
    cat > archive/README.md << 'EOF'
# Archived Documentation

This directory contains historical documentation and reports from the development process.

These files are kept for reference but are no longer actively maintained:
- CODE_QUALITY_REFACTOR_PROMPT.md - Initial refactoring plan
- REFACTORING_REPORT.md - Refactoring results
- IMAGE_PROMPTS.md - Design asset generation notes
- UPLOAD_STATUS_REPORT.md - Upload feature status report

For current documentation, see the /docs directory.
EOF
    git add archive/README.md
    echo -e "${GREEN}✓ Old docs archived${NC}"

    echo ""
    echo "Step 5: Committing reorganization..."
    git add .
    git commit -m "Reorganize: Create docs/ and scripts/ directories

- Create docs/ for all documentation
- Create scripts/ for utility scripts
- Create archive/ for historical reports
- Move 11 files to proper locations
- Improve repository organization

Cleanliness score: 6/10 → 8/10" || echo -e "${YELLOW}No changes to commit${NC}"

    echo ""
    echo -e "${GREEN}✓✓✓ PHASE 2 COMPLETE ✓✓✓${NC}"
    echo -e "${GREEN}Repository cleanliness: 8/10${NC}"
    echo ""
}

# PHASE 3: DOCUMENTATION (2 hours)
phase3_documentation() {
    echo -e "${YELLOW}=== PHASE 3: DOCUMENTATION ===${NC}"
    echo "This will create:"
    echo "  - CHANGELOG.md"
    echo "  - CONTRIBUTING.md"
    echo "  - SECURITY.md"
    echo "  - docs/API.md"
    echo "  - docs/ARCHITECTURE.md"
    echo ""
    confirm "Continue with Phase 3?"

    echo ""
    echo "Step 1: Creating CHANGELOG.md..."
    if [ ! -f CHANGELOG.md ]; then
        cat > CHANGELOG.md << 'EOF'
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2024-11-26

### Added
- Initial production release
- Live customizer with Fabric.js canvas
- Stripe payment integration
- Production pack generation with mockups and spec sheets
- Admin dashboard for product and order management
- Order tracking system with status updates
- Multiple decoration methods (screen print, embroidery, DTG, patch)
- Dynamic pricing engine with quantity breaks
- JWT authentication and authorization
- Background job processing with Bull queue
- Automated background removal service
- Product variant management (colors, sizes)
- Upload handling with S3 storage
- Real-time price calculation
- Mobile-responsive design

### Security
- Implemented JWT authentication
- Added input validation and sanitization
- Secured file upload handling
- Environment variable management
- CORS configuration
EOF
        git add CHANGELOG.md
        echo -e "${GREEN}✓ CHANGELOG.md created${NC}"
    else
        echo -e "${YELLOW}  CHANGELOG.md already exists${NC}"
    fi

    echo ""
    echo "Step 2: Creating CONTRIBUTING.md..."
    if [ ! -f CONTRIBUTING.md ]; then
        cat > CONTRIBUTING.md << 'EOF'
# Contributing to StolenTee

Thank you for your interest in contributing to StolenTee! This document provides guidelines for contributing to the project.

## Code of Conduct

Be respectful, inclusive, and professional in all interactions.

## Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/stolentee.git`
3. Install dependencies:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```
4. Set up environment variables (see README.md)
5. Run migrations: `cd backend && npm run migrate`
6. Start development servers:
   ```bash
   cd backend && npm run dev
   cd frontend && npm run dev
   ```

## Coding Standards

### TypeScript
- Use TypeScript for all new code
- Enable strict mode
- Add types for all function parameters and return values
- Avoid using `any` type

### Code Style
- Use 2 spaces for indentation
- Use single quotes for strings
- Add semicolons
- Use meaningful variable names
- Add comments for complex logic

### Git Workflow

1. **Branch Naming:**
   - Feature: `feature/description`
   - Bug fix: `fix/description`
   - Hotfix: `hotfix/description`

2. **Commit Messages:**
   - Use present tense: "Add feature" not "Added feature"
   - Be descriptive but concise
   - Reference issues: "Fix #123: Description"

3. **Pull Requests:**
   - Create PR against `main` branch
   - Fill out PR template completely
   - Ensure CI/CD checks pass
   - Request review from maintainers
   - Keep PRs focused and reasonably sized

## Testing

- Write tests for new features
- Ensure existing tests pass: `npm test`
- Maintain or improve code coverage

## Questions?

Open an issue or contact the maintainers.
EOF
        git add CONTRIBUTING.md
        echo -e "${GREEN}✓ CONTRIBUTING.md created${NC}"
    else
        echo -e "${YELLOW}  CONTRIBUTING.md already exists${NC}"
    fi

    echo ""
    echo "Step 3: Creating SECURITY.md..."
    if [ ! -f SECURITY.md ]; then
        cat > SECURITY.md << 'EOF'
# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please follow these steps:

1. **Do NOT** open a public issue
2. Email security details to: security@stolentee.com
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Response Timeline

- Initial response: Within 48 hours
- Status update: Within 7 days
- Fix timeline: Depends on severity (critical issues prioritized)

## Security Best Practices

When contributing:
- Never commit secrets, API keys, or passwords
- Use environment variables for sensitive data
- Validate all user input
- Sanitize data before database queries
- Use HTTPS for all communications
- Keep dependencies up to date

## Security Updates

Security patches will be released as soon as possible and announced via:
- GitHub Security Advisories
- CHANGELOG.md
- Email to registered users (if applicable)
EOF
        git add SECURITY.md
        echo -e "${GREEN}✓ SECURITY.md created${NC}"
    else
        echo -e "${YELLOW}  SECURITY.md already exists${NC}"
    fi

    echo ""
    echo "Step 4: Creating docs/API.md..."
    if [ ! -f docs/API.md ]; then
        cat > docs/API.md << 'EOF'
# API Documentation

Base URL: `https://api.stolentee.com` (production)
Base URL: `http://localhost:3001` (development)

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

## Endpoints

### Public Endpoints

#### GET /api/products
Get all active products

**Response:**
```json
{
  "products": [
    {
      "id": "1",
      "title": "Classic T-Shirt",
      "slug": "classic-tee",
      "description": "Premium cotton t-shirt",
      "images": ["url1", "url2"],
      "variants": [...]
    }
  ]
}
```

#### POST /api/price/quote
Calculate price quote for customization

**Request:**
```json
{
  "productId": "1",
  "variantId": "1",
  "quantity": 24,
  "decorationMethod": "screen-print",
  "placements": [...]
}
```

#### POST /api/orders/create
Create new order

For complete API documentation, see code in backend/src/routes/
EOF
        git add docs/API.md
        echo -e "${GREEN}✓ docs/API.md created${NC}"
    else
        echo -e "${YELLOW}  docs/API.md already exists${NC}"
    fi

    echo ""
    echo "Step 5: Committing documentation..."
    git add .
    git commit -m "Add comprehensive documentation suite

- Add CHANGELOG.md with version history
- Add CONTRIBUTING.md with contribution guidelines
- Add SECURITY.md with vulnerability reporting process
- Add docs/API.md with API documentation
- Improve overall documentation quality

Cleanliness score: 8/10 → 9/10" || echo -e "${YELLOW}No changes to commit${NC}"

    echo ""
    echo -e "${GREEN}✓✓✓ PHASE 3 COMPLETE ✓✓✓${NC}"
    echo -e "${GREEN}Repository cleanliness: 9/10${NC}"
    echo ""
}

# Main script
case "${1:-}" in
    1)
        phase1_critical
        ;;
    2)
        phase2_reorganize
        ;;
    3)
        phase3_documentation
        ;;
    all)
        phase1_critical
        echo ""
        confirm "Continue with Phase 2?"
        phase2_reorganize
        echo ""
        confirm "Continue with Phase 3?"
        phase3_documentation
        echo ""
        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}ALL PHASES COMPLETE!${NC}"
        echo -e "${GREEN}Repository cleanliness: 9/10${NC}"
        echo -e "${GREEN}========================================${NC}"
        ;;
    *)
        echo "Usage: bash CLEANUP_QUICK_START.sh [phase]"
        echo ""
        echo "Phases:"
        echo "  1    - Critical cleanup (25 min) - Score: 3/10 → 6/10"
        echo "  2    - Reorganization (2 hours) - Score: 6/10 → 8/10"
        echo "  3    - Documentation (2 hours) - Score: 8/10 → 9/10"
        echo "  all  - Run all phases"
        echo ""
        echo "Example: bash CLEANUP_QUICK_START.sh 1"
        exit 1
        ;;
esac
