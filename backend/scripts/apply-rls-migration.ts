#!/usr/bin/env ts-node
/**
 * Apply RLS security migration
 * This script applies migration 007_enable_rls_security.sql
 */

import fs from 'fs';
import path from 'path';
import pool from '../src/config/database';

async function applyRLSMigration() {
  try {
    console.log('🔐 Applying RLS security migration...\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/007_enable_rls_security.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Execute the migration
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);

      // Record in migrations table
      await client.query(
        'INSERT INTO migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
        ['007_enable_rls_security.sql']
      );

      await client.query('COMMIT');
      console.log('\n✅ RLS migration applied successfully!');
      console.log('\n📊 Summary:');
      console.log('   - Enabled RLS on 14 tables');
      console.log('   - Created 19 security policies');
      console.log('   - Public catalog: read-only');
      console.log('   - Sensitive data: backend-only');
      console.log('   - User data: owner-only\n');
      console.log('🎉 Your Supabase security warnings should now be resolved!\n');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyRLSMigration();
