#!/usr/bin/env ts-node
/**
 * Verify RLS is enabled on all tables
 */

import pool from '../src/config/database';

async function verifyRLS() {
  try {
    console.log('🔍 Verifying RLS status...\n');

    // Check RLS status for all tables
    const result = await pool.query(`
      SELECT
        schemaname,
        tablename,
        rowsecurity as rls_enabled,
        (SELECT COUNT(*)
         FROM pg_policies
         WHERE schemaname = pgc.schemaname
         AND tablename = pgc.tablename) as policy_count
      FROM pg_class AS c
      JOIN pg_namespace AS n ON n.oid = c.relnamespace
      JOIN pg_catalog.pg_tables AS pgc ON pgc.tablename = c.relname
      WHERE schemaname = 'public'
        AND tablename IN (
          'products', 'variants', 'customers', 'orders', 'order_items',
          'order_status_history', 'users', 'saved_designs', 'decoration_methods',
          'price_rules', 'assets', 'jobs', 'settings', 'migrations'
        )
      ORDER BY tablename;
    `);

    console.log('Table Name                | RLS Enabled | Policies');
    console.log('--------------------------|-------------|----------');

    let allEnabled = true;
    let totalPolicies = 0;

    result.rows.forEach(row => {
      const enabled = row.rls_enabled ? '✅ Yes' : '❌ No';
      const policies = row.policy_count || 0;
      totalPolicies += policies;

      if (!row.rls_enabled) allEnabled = false;

      console.log(`${row.tablename.padEnd(25)} | ${enabled.padEnd(11)} | ${policies}`);
    });

    console.log('\n📊 Summary:');
    console.log(`   - Tables checked: ${result.rows.length}`);
    console.log(`   - RLS enabled: ${result.rows.filter(r => r.rls_enabled).length}/${result.rows.length}`);
    console.log(`   - Total policies: ${totalPolicies}`);

    if (allEnabled) {
      console.log('\n✅ All tables have RLS enabled!');
      console.log('🎉 Your Supabase security warnings should be resolved.\n');
    } else {
      console.log('\n⚠️  Some tables still need RLS enabled.\n');
    }

  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verifyRLS();
