import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { Pool } from 'pg';
import * as path from 'path';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const databaseUrl = process.env.DATABASE_URL;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env file');
  console.error('\nPlease add these to /Users/brandonshore/stolen/stolen1/backend/.env:');
  console.error('SUPABASE_URL=https://dntnjlodfcojzgovikic.supabase.co');
  console.error('SUPABASE_SERVICE_KEY=your_service_role_key_here');
  process.exit(1);
}

if (!databaseUrl) {
  console.error('❌ DATABASE_URL must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const pool = new Pool({
  connectionString: databaseUrl,
});

const BUCKET_NAME = 'product-images';
const ASSETS_DIR = path.resolve(__dirname, '../../frontend/public/assets');

interface UploadedImage {
  filename: string;
  publicUrl: string;
}

async function ensureBucketExists(): Promise<void> {
  try {
    console.log('📦 Checking if bucket exists...');

    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      throw listError;
    }

    const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);

    if (!bucketExists) {
      console.log(`📦 Creating bucket: ${BUCKET_NAME}`);
      const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg']
      });

      if (createError) {
        console.error('❌ Error creating bucket:', createError);
        throw createError;
      }

      console.log('✅ Bucket created successfully!');
    } else {
      console.log('✅ Bucket already exists');
    }
  } catch (error) {
    console.error('❌ Failed to ensure bucket exists:', error);
    throw error;
  }
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

    console.log(`  ✅ ${path.basename(localPath)} -> ${data.publicUrl}`);
    return data.publicUrl;
  } catch (error) {
    console.error(`  ❌ Error uploading ${localPath}:`, error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting product image upload to Supabase...\n');
    console.log(`📁 Source directory: ${ASSETS_DIR}`);
    console.log(`🌐 Supabase URL: ${supabaseUrl}`);
    console.log(`🪣 Bucket name: ${BUCKET_NAME}\n`);

    // Ensure bucket exists
    await ensureBucketExists();

    // Get all image files from assets directory
    const files = readdirSync(ASSETS_DIR).filter(f =>
      f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg')
    );

    console.log(`\n📸 Found ${files.length} images to upload:\n`);

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

    console.log(`\n✅ Successfully uploaded ${uploadedImages.length} images!\n`);

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

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();