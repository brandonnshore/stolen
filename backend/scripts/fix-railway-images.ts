import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function updateProductImages() {
  // Use DATABASE_URL from Railway environment
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔄 Updating product images to Supabase Storage URLs...\n');

    // Update classic-tee
    const teeResult = await pool.query(`
      UPDATE products
      SET images = $1::jsonb
      WHERE slug = 'classic-tee'
      RETURNING slug, title, images
    `, [JSON.stringify([
      'https://xezmvslgaclidlkpkkuc.supabase.co/storage/v1/object/public/product-images/mockups/black-front.png',
      'https://xezmvslgaclidlkpkkuc.supabase.co/storage/v1/object/public/product-images/mockups/black-back.png',
      'https://xezmvslgaclidlkpkkuc.supabase.co/storage/v1/object/public/product-images/mockups/black-neck.png'
    ])]);

    if (teeResult.rowCount && teeResult.rowCount > 0) {
      console.log('✅ Updated classic-tee:', teeResult.rowCount, 'row(s)');
    } else {
      console.log('⚠️  No classic-tee product found');
    }

    // Update classic-hoodie
    const hoodieResult = await pool.query(`
      UPDATE products
      SET images = $1::jsonb
      WHERE slug = 'classic-hoodie'
      RETURNING slug, title, images
    `, [JSON.stringify([
      'https://xezmvslgaclidlkpkkuc.supabase.co/storage/v1/object/public/product-images/mockups/hoodie-black-front.png',
      'https://xezmvslgaclidlkpkkuc.supabase.co/storage/v1/object/public/product-images/mockups/hoodie-black-back.png'
    ])]);

    if (hoodieResult.rowCount && hoodieResult.rowCount > 0) {
      console.log('✅ Updated classic-hoodie:', hoodieResult.rowCount, 'row(s)');
    } else {
      console.log('⚠️  No classic-hoodie product found');
    }

    // Verify the update
    console.log('\n📋 Current product images:');
    const verifyResult = await pool.query(`
      SELECT slug, title, images
      FROM products
      ORDER BY created_at
    `);

    verifyResult.rows.forEach(row => {
      console.log(`\n${row.slug}:`);
      if (Array.isArray(row.images)) {
        row.images.forEach((img: string) => {
          const status = img.includes('supabase.co') ? '✅' : '❌';
          console.log(`  ${status} ${img}`);
        });
      }
    });

    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error updating images:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

updateProductImages();