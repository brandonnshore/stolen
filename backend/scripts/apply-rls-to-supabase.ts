#!/usr/bin/env ts-node
/**
 * Apply RLS security migration to SUPABASE (not local database)
 *
 * IMPORTANT: This connects directly to Supabase, not your local database!
 */

import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

// SUPABASE connection info
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD || '';

if (!SUPABASE_URL) {
  console.error('❌ SUPABASE_URL not set in .env file');
  console.log('\nTo fix:');
  console.log('1. Go to your Supabase project dashboard');
  console.log('2. Go to Settings → Database');
  console.log('3. Copy the "Connection string" (Connection pooling mode)');
  console.log('4. Add to backend/.env file as:');
  console.log('   SUPABASE_DB_PASSWORD=your_database_password');
  process.exit(1);
}

// Extract project ref from Supabase URL
// Format: https://dntnjlodfcojzgovikic.supabase.co
const projectRef = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');

// Try connection pooler format (more reliable):
// postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
const supabaseDbUrl = SUPABASE_DB_PASSWORD
  ? `postgresql://postgres.${projectRef}:${SUPABASE_DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
  : null;

if (!supabaseDbUrl) {
  console.error('❌ SUPABASE_DB_PASSWORD not set in .env file');
  console.log('\n📋 Follow these steps:');
  console.log('1. Go to: https://supabase.com/dashboard/project/' + projectRef);
  console.log('2. Click Settings (gear icon) → Database');
  console.log('3. Under "Connection string", select "Transaction pooler" mode');
  console.log('4. Copy the password (it will be shown once)');
  console.log('5. Add to backend/.env file:');
  console.log('   SUPABASE_DB_PASSWORD=your_password_here\n');
  process.exit(1);
}

async function applyRLSToSupabase() {
  console.log('🔐 Applying RLS migration to SUPABASE cloud database...\n');
  console.log('⚠️  This will modify your PRODUCTION Supabase database!');
  console.log('Database:', supabaseDbUrl.split('@')[1].split('/')[0]);
  console.log('Project:', projectRef);
  console.log('');

  const pool = new Pool({
    connectionString: supabaseDbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Connected to Supabase database\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/007_enable_rls_security.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Execute the migration
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      console.log('📦 Executing RLS migration...');
      await client.query(sql);

      // Record in migrations table
      await client.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          filename VARCHAR(255) UNIQUE NOT NULL,
          executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(
        'INSERT INTO migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
        ['007_enable_rls_security.sql']
      );

      await client.query('COMMIT');
      console.log('\n✅ RLS migration applied successfully to Supabase!\n');
      console.log('📊 Summary:');
      console.log('   - Enabled RLS on 14 tables');
      console.log('   - Created 4 public read-only policies');
      console.log('   - Locked down sensitive data');
      console.log('\n🎉 Your Supabase security warnings should now be resolved!\n');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);

    if (error.message.includes('password authentication failed')) {
      console.log('\n⚠️  Password authentication failed!');
      console.log('Please check your SUPABASE_DB_PASSWORD in .env file\n');
    } else if (error.message.includes('no pg_hba.conf entry')) {
      console.log('\n⚠️  Connection blocked!');
      console.log('Make sure you are using the Transaction pooler connection string\n');
    }

    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyRLSToSupabase();
