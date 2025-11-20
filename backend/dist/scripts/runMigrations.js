#!/usr/bin/env node
"use strict";
/**
 * Professional Database Migration Runner
 *
 * This script automatically runs all pending database migrations in order.
 * It's safe to run multiple times - it only applies migrations that haven't been run yet.
 *
 * This is the same pattern used by professional apps like Prisma, TypeORM, etc.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const database_1 = __importDefault(require("../config/database"));
/**
 * Create migrations tracking table if it doesn't exist
 */
async function createMigrationsTable() {
    await database_1.default.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
    console.log('✅ Migrations tracking table ready');
}
/**
 * Get list of already executed migrations
 */
async function getExecutedMigrations() {
    const result = await database_1.default.query('SELECT filename FROM migrations ORDER BY id');
    return result.rows.map(row => row.filename);
}
/**
 * Load all migration files from the migrations directory
 */
function loadMigrationFiles() {
    const migrationsDir = path_1.default.join(__dirname, '../../migrations');
    if (!fs_1.default.existsSync(migrationsDir)) {
        console.warn('⚠️  No migrations directory found');
        return [];
    }
    const files = fs_1.default.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort(); // Alphabetical order ensures 001, 002, 003, etc.
    return files.map(filename => ({
        filename,
        sql: fs_1.default.readFileSync(path_1.default.join(migrationsDir, filename), 'utf-8')
    }));
}
/**
 * Execute a single migration
 */
async function executeMigration(migration) {
    console.log(`📦 Running migration: ${migration.filename}`);
    // Start transaction
    const client = await database_1.default.connect();
    try {
        await client.query('BEGIN');
        // Execute the migration SQL
        await client.query(migration.sql);
        // Record that this migration was executed
        await client.query('INSERT INTO migrations (filename) VALUES ($1)', [migration.filename]);
        await client.query('COMMIT');
        console.log(`✅ Successfully applied: ${migration.filename}`);
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ Failed to apply migration: ${migration.filename}`);
        throw error;
    }
    finally {
        client.release();
    }
}
/**
 * Main function to run all pending migrations
 */
async function runMigrations() {
    try {
        console.log('🚀 Starting database migrations...');
        // Ensure migrations tracking table exists
        await createMigrationsTable();
        // Get list of already executed migrations
        const executedMigrations = await getExecutedMigrations();
        console.log(`📋 Already executed: ${executedMigrations.length} migrations`);
        // Load all migration files
        const allMigrations = loadMigrationFiles();
        console.log(`📂 Found: ${allMigrations.length} migration files`);
        // Filter out already executed migrations
        const pendingMigrations = allMigrations.filter(migration => !executedMigrations.includes(migration.filename));
        if (pendingMigrations.length === 0) {
            console.log('✅ All migrations are up to date!');
            return;
        }
        console.log(`⏳ Pending migrations: ${pendingMigrations.length}`);
        // Execute each pending migration in order
        for (const migration of pendingMigrations) {
            await executeMigration(migration);
        }
        console.log(`\n🎉 Successfully applied ${pendingMigrations.length} migrations!`);
    }
    catch (error) {
        console.error('\n❌ Migration failed:', error);
        throw error;
    }
    // Note: Don't close pool here - the main app will use it
}
// Run migrations if this script is executed directly
if (require.main === module) {
    runMigrations()
        .then(() => {
        console.log('✅ Migration process completed');
        process.exit(0);
    })
        .catch((error) => {
        console.error('❌ Migration process failed:', error);
        console.error('⚠️  Server will start anyway - check logs for migration errors');
        // Don't exit with error code - let the server start
        process.exit(0);
    });
}
exports.default = runMigrations;
//# sourceMappingURL=runMigrations.js.map