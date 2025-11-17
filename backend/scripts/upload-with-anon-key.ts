import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { Pool } from 'pg';
import * as path from 'path';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = 'https://xezmvslgaclidlkpkkuc.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const databaseUrl = process.env.DATABASE_URL;

console.log('🔑 Using anon key for uploads...');
console.log('⚠️  This requires the bucket to already exist and be public!\n');

if (!supabaseAnonKey || supabaseAnonKey.includes('your_')) {
  console.error('❌ SUPABASE_ANON_KEY must be set in .env file');
  console.error('\nTo get your anon key:');
  console.error('1. Go to: https://supabase.com/dashboard/project/xezmvslgaclidlkpkkuc/settings/api');
  console.error('2. Copy the "anon" / "public" key');
  console.error('3. Add to .env: SUPABASE_ANON_KEY=eyJ...\n');
  process.exit(1);
}

if (!databaseUrl) {
  console.error('❌ DATABASE_URL must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const pool = new Pool({
  connectionString: databaseUrl,
});

const BUCKET_NAME = 'product-images';
const ASSETS_DIR = path.resolve(__dirname, '../../frontend/public/assets');

interface UploadedImage {
  filename: string;
  publicUrl: string;
}

async function uploadImage(localPath: string, remotePath: string): Promise<string> {
  try {
    // Read the image file
    const imageBuffer = readFileSync(localPath);

    // Determine content type
    const ext = path.extname(localPath).toLowerCase();
    const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';

    // Upload to Supabase
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(remotePath, imageBuffer, {
        contentType,
        cacheControl: '31536000', // 1 year cache
        upsert: true
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(remotePath);

    console.log(`  ✅ ${path.basename(localPath)}`);
    return data.publicUrl;
  } catch (error) {
    console.error(`  ❌ Error uploading ${path.basename(localPath)}:`, error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting product image upload to Supabase...\n');
    console.log(`📁 Source: ${ASSETS_DIR}`);
    console.log(`🪣 Bucket: ${BUCKET_NAME}\n`);

    // Get all image files from assets directory
    const files = readdirSync(ASSETS_DIR).filter(f =>
      f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg')
    );

    console.log(`📸 Found ${files.length} images to upload:\n`);

    const uploadedImages: UploadedImage[] = [];

    // Upload all images
    for (const file of files) {
      const localPath = path.join(ASSETS_DIR, file);
      const remotePath = `mockups/${file}`;

      try {
        const publicUrl = await uploadImage(localPath, remotePath);
        uploadedImages.push({ filename: file, publicUrl });
      } catch (error) {
        console.error(`Failed to upload ${file}, continuing...`);
      }
    }

    console.log(`\n✅ Successfully uploaded ${uploadedImages.length}/${files.length} images!\n`);

    // Display all uploaded URLs
    console.log('📋 Uploaded Image URLs:\n');
    uploadedImages.forEach(img => {
      console.log(`${img.filename}:`);
      console.log(`  ${img.publicUrl}\n`);
    });

    // Update database with new URLs
    console.log('🗄️  Updating database...\n');

    // Update hoodie product
    const hoodieImages = uploadedImages
      .filter(img => img.filename.includes('hoodie'))
      .sort((a, b) => {
        if (a.filename.includes('front')) return -1;
        if (b.filename.includes('front')) return 1;
        return 0;
      });

    if (hoodieImages.length > 0) {
      const hoodieUrls = hoodieImages.map(img => img.publicUrl);
      const hoodieResult = await pool.query(
        `UPDATE products
         SET images = $1
         WHERE slug = 'classic-hoodie'
         RETURNING id, slug, title, images;`,
        [hoodieUrls]
      );

      if (hoodieResult.rows.length > 0) {
        console.log('✅ Updated hoodie product:');
        console.log(`   Title: ${hoodieResult.rows[0].title}`);
        console.log(`   Images: ${hoodieResult.rows[0].images.length} URLs`);
      }
    }

    // Update t-shirt product
    const tshirtImages = uploadedImages
      .filter(img =>
        (img.filename.includes('black') || img.filename.includes('navy')) &&
        !img.filename.includes('hoodie')
      )
      .sort((a, b) => {
        if (a.filename.includes('front')) return -1;
        if (b.filename.includes('front')) return 1;
        return 0;
      });

    if (tshirtImages.length > 0) {
      const tshirtUrls = tshirtImages.map(img => img.publicUrl);
      const tshirtResult = await pool.query(
        `UPDATE products
         SET images = $1
         WHERE slug = 'classic-tee'
         RETURNING id, slug, title, images;`,
        [tshirtUrls]
      );

      if (tshirtResult.rows.length > 0) {
        console.log('✅ Updated t-shirt product:');
        console.log(`   Title: ${tshirtResult.rows[0].title}`);
        console.log(`   Images: ${tshirtResult.rows[0].images.length} URLs`);
      }
    }

    // Display final product URLs
    console.log('\n📊 Final product database state:\n');
    const allProducts = await pool.query(
      `SELECT slug, title, images FROM products ORDER BY slug;`
    );

    allProducts.rows.forEach(product => {
      console.log(`${product.slug} (${product.title}):`);
      product.images.forEach((url: string, idx: number) => {
        console.log(`  ${idx + 1}. ${url}`);
      });
      console.log();
    });

    console.log('✨ All done! Images are now stored in Supabase and database is updated.\n');
    console.log('🧪 Test image access:');
    console.log(`curl -I "${uploadedImages[0]?.publicUrl}"\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    console.error('\n💡 Troubleshooting:');
    console.error('1. Make sure the bucket "product-images" exists in Supabase');
    console.error('2. Make sure the bucket is set to PUBLIC');
    console.error('3. Go to: https://supabase.com/dashboard/project/xezmvslgaclidlkpkkuc/storage/buckets');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();