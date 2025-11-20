#!/usr/bin/env node
/**
 * Professional Database Migration Runner
 *
 * This script automatically runs all pending database migrations in order.
 * It's safe to run multiple times - it only applies migrations that haven't been run yet.
 *
 * This is the same pattern used by professional apps like Prisma, TypeORM, etc.
 */
/**
 * Main function to run all pending migrations
 */
declare function runMigrations(): Promise<void>;
export default runMigrations;
//# sourceMappingURL=runMigrations.d.ts.map