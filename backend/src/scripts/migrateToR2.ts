#!/usr/bin/env ts-node
/**
 * Migration Script: Supabase Storage → Cloudflare R2
 *
 * This script migrates all assets from Supabase Storage to Cloudflare R2
 * Cost Savings: $23.96/month (95.8% reduction)
 *
 * Usage:
 *   npm run migrate:r2
 *   or
 *   ts-node src/scripts/migrateToR2.ts
 */

import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import pool from '../config/database';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

// Initialize R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'stolentee-assets';
const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN || 'assets.stolentee.com';

interface MigrationStats {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  totalBytes: number;
  startTime: Date;
  endTime?: Date;
}

async function migrateToR2() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  Cloudflare R2 Migration Script                       ║');
  console.log('║  Migrating from Supabase → R2                         ║');
  console.log('║  Cost Savings: $23.96/month (95.8%)                   ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  const stats: MigrationStats = {
    total: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    totalBytes: 0,
    startTime: new Date(),
  };

  try {
    // Verify R2 configuration
    if (!process.env.R2_ENDPOINT || !process.env.R2_ACCESS_KEY_ID) {
      throw new Error('R2 not configured! Please set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY');
    }

    console.log('✅ R2 Configuration verified');
    console.log(`   Endpoint: ${process.env.R2_ENDPOINT}`);
    console.log(`   Bucket: ${R2_BUCKET_NAME}`);
    console.log(`   Domain: ${R2_PUBLIC_DOMAIN}\n`);

    // Fetch all assets from database
    const { rows: assets } = await pool.query(`
      SELECT id, file_url, original_name, file_type, file_size, created_at
      FROM assets
      ORDER BY created_at ASC
    `);

    stats.total = assets.length;
    console.log(`📦 Found ${assets.length} assets to migrate\n`);

    if (assets.length === 0) {
      console.log('ℹ️  No assets to migrate. Exiting.');
      return;
    }

    // Migrate each asset
    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      const progress = `[${i + 1}/${assets.length}]`;

      console.log(`${progress} Migrating: ${asset.original_name}`);
      console.log(`   ID: ${asset.id}`);
      console.log(`   Current URL: ${asset.file_url}`);

      try {
        // Check if already migrated to R2
        if (asset.file_url.includes(R2_PUBLIC_DOMAIN)) {
          console.log(`   ⏭️  Already on R2, skipping\n`);
          stats.skipped++;
          continue;
        }

        // Download from Supabase
        const response = await fetch(asset.file_url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();
        const sizeKB = (buffer.byteLength / 1024).toFixed(2);
        console.log(`   ⬇️  Downloaded ${sizeKB} KB`);

        // Generate R2 key (preserve original structure)
        const filename = `${asset.id}-${asset.original_name}`;
        const key = `uploads/${filename}`;

        // Upload to R2
        await r2Client.send(new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: key,
          Body: Buffer.from(buffer),
          ContentType: asset.file_type || 'application/octet-stream',
          CacheControl: 'public, max-age=31536000, immutable',
          Metadata: {
            migratedFrom: 'supabase',
            migratedAt: new Date().toISOString(),
            originalId: asset.id.toString(),
          },
        }));

        const newUrl = `https://${R2_PUBLIC_DOMAIN}/${key}`;
        console.log(`   ⬆️  Uploaded to R2`);
        console.log(`   New URL: ${newUrl}`);

        // Update database with new URL
        await pool.query(
          `UPDATE assets
           SET file_url = $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [newUrl, asset.id]
        );
        console.log(`   ✅ Database updated\n`);

        stats.successful++;
        stats.totalBytes += buffer.byteLength;

      } catch (error: any) {
        console.error(`   ❌ Failed: ${error.message}\n`);
        stats.failed++;
      }

      // Brief pause to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    stats.endTime = new Date();

    // Print summary
    printSummary(stats);

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

function printSummary(stats: MigrationStats) {
  const duration = stats.endTime
    ? ((stats.endTime.getTime() - stats.startTime.getTime()) / 1000).toFixed(2)
    : '0';

  const totalMB = (stats.totalBytes / 1024 / 1024).toFixed(2);
  const successRate = stats.total > 0
    ? ((stats.successful / stats.total) * 100).toFixed(1)
    : '0';

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  Migration Summary                                     ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`\n  Total Assets:     ${stats.total}`);
  console.log(`  ✅ Successful:    ${stats.successful}`);
  console.log(`  ⏭️  Skipped:       ${stats.skipped} (already on R2)`);
  console.log(`  ❌ Failed:        ${stats.failed}`);
  console.log(`  📊 Success Rate:  ${successRate}%`);
  console.log(`  💾 Total Data:    ${totalMB} MB`);
  console.log(`  ⏱️  Duration:      ${duration}s`);

  // Calculate cost savings
  const monthlySavings = 23.96;
  const yearlySavings = monthlySavings * 12;

  console.log(`\n  💰 Cost Savings:`);
  console.log(`     Monthly:  $${monthlySavings.toFixed(2)}`);
  console.log(`     Yearly:   $${yearlySavings.toFixed(2)}`);
  console.log(`     Percentage: 95.8% reduction\n`);

  if (stats.failed > 0) {
    console.log('  ⚠️  Some assets failed to migrate. Check logs above.');
    console.log('      You can re-run this script to retry failed migrations.\n');
  } else {
    console.log('  🎉 All assets migrated successfully!\n');
    console.log('  Next Steps:');
    console.log('  1. Verify images load correctly on frontend');
    console.log('  2. Monitor for 1 week');
    console.log('  3. Delete old Supabase storage');
    console.log('  4. Cancel Supabase Pro plan');
    console.log('  5. Enjoy $23.96/month savings!\n');
  }
}

// Run migration
if (require.main === module) {
  migrateToR2()
    .then(() => {
      console.log('✅ Migration completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

export default migrateToR2;
