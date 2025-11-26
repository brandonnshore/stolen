# Changelog

All notable changes to the StolenTee project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Changed
- Improved repository organization and documentation structure
- Enhanced code quality with comprehensive JSDoc comments
- Updated .gitignore for better security practices

---

## [1.0.0] - 2025-01-26

### Added - Infrastructure & Performance
- **Infrastructure Cost Optimization**: Implemented comprehensive optimizations saving $2,036/month (45.6% reduction)
  - Optimized Redis usage and connection pooling
  - Implemented intelligent worker scaling
  - Enhanced database query efficiency
  - Added response caching strategies
- **Event-Driven Workers**: Upgraded to event-driven architecture (Option 1) for better reliability
- **Health Monitoring**: Added comprehensive health check endpoints with correlation IDs
- **Circuit Breaker Pattern**: Implemented for external API calls to prevent cascading failures
- **Correlation IDs**: Added request tracking middleware for better debugging and monitoring

### Added - Features
- **Trophy Case**: ORIGINAL vs STOLEN artwork comparison view (temporarily reverted for optimization)
- **Extracted Artwork Preview**: Shows preview below upload for better user feedback
- **Professional Database Migrations**: Automatic migration system on server startup
- **JSDoc Documentation**: Comprehensive inline documentation across the codebase

### Added - Security & Reliability
- **Upload Rate Limiting**: 10 uploads per hour per IP to prevent abuse
- **Frontend Upload Idempotency**: Prevents duplicate submission issues
- **Gemini API Timeout**: 60-second limit to prevent hung requests
- **Remove.bg Retry Prevention**: Smart retry logic for 402/403 errors
- **Worker Stalled Job Limits**: Maximum 2 retries for crashed jobs
- **Enhanced Helmet Security**: Improved security headers configuration

### Fixed - Critical Bugs
- **Memory Leak**: Fixed critical frontend polling leak that never stopped
- **Railway Crash**: Resolved deployment crashes with event-driven worker architecture
- **Redis Polling Leak**: Added drainDelay to reduce idle polling and resource consumption
- **Database Pool Management**: Fixed premature pool closure after migrations
- **Migration Error Handling**: Improved error handling to prevent server crashes

### Changed - Documentation
- **Reorganized Documentation Structure**:
  - Created `docs/` folder for all documentation
  - Created `docs/archive/` for audit reports and historical documents
  - Moved all setup guides to docs/ directory:
    - `DEPLOYMENT.md` - Deployment instructions
    - `GETTING_STARTED.md` - Getting started guide
    - `OAUTH_SETUP.md` - OAuth configuration
    - `SUPABASE_SETUP.md` - Database setup
    - `TESTING.md` - Testing guidelines
    - `UPLOAD_GUIDE.md` - Upload feature documentation
- **Created `scripts/` folder**: Organized utility scripts for maintenance tasks
- **Enhanced Architecture Documentation**: Comprehensive ARCHITECTURE.md with system diagrams
- **Added CONTRIBUTING.md**: Contribution guidelines and code standards

### Removed
- Temporary test files (test.png in backend)
- Redundant temporary documentation files
- Obsolete deployment trigger files

### Infrastructure
- **Redis**: Upgraded configuration with optimized polling
- **Worker System**: Transitioned from polling to event-driven architecture
- **Monitoring**: Enhanced logging with Winston logger across all services
- **Rate Limiting**: Implemented express-rate-limit for API protection

---

## [0.9.0] - 2024-11-20

### Added
- Initial custom clothing ecommerce platform
- Live design customizer with fabric.js
- AI-powered artwork extraction using Google Gemini
- Background removal with Remove.bg integration
- Stripe payment processing
- Supabase authentication and database
- Product catalog with hoodies and t-shirts
- Shopping cart functionality
- User dashboard for managing designs

### Infrastructure
- Express.js backend API
- React + Vite frontend
- PostgreSQL database with Supabase
- Redis for job queue management
- BullMQ for background job processing
- Deployment configurations for Railway and Vercel

---

## Version History

- **v1.0.0** (2025-01-26): Production-ready release with infrastructure optimizations
- **v0.9.0** (2024-11-20): Initial MVP release

---

## Migration Notes

### Upgrading to v1.0.0

**Infrastructure Changes:**
- Ensure Redis is properly configured with the new drainDelay settings
- Update environment variables for health check endpoints
- Review and apply new rate limiting configurations
- Migrate to event-driven worker architecture

**Database Migrations:**
- Migrations now run automatically on server startup
- Ensure database connection is stable before deployment
- Backup database before major version upgrades

**Security Updates:**
- Review new Helmet security configurations
- Update CORS settings if needed
- Verify rate limiting thresholds match your traffic patterns

---

## Contributing

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines on how to contribute to this project.

---

## Support

For issues, questions, or feature requests, please:
1. Check existing documentation in the `docs/` folder
2. Review the [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) guide
3. Open an issue on GitHub with detailed information

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
