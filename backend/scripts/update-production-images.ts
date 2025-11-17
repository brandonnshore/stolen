import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateProductImages() {
  console.log('🔄 Updating product images in production database...\n');

  const updates = [
    {
      slug: 'classic-hoodie',
      images: [
        'https://dntnjlodfcojzgovikic.supabase.co/storage/v1/object/public/product-images/mockups/hoodie-black-front.png',
        'https://dntnjlodfcojzgovikic.supabase.co/storage/v1/object/public/product-images/mockups/hoodie-black-back.png'
      ]
    },
    {
      slug: 'classic-tee',
      images: [
        'https://dntnjlodfcojzgovikic.supabase.co/storage/v1/object/public/product-images/mockups/black-front.png',
        'https://dntnjlodfcojzgovikic.supabase.co/storage/v1/object/public/product-images/mockups/black-back.png',
        'https://dntnjlodfcojzgovikic.supabase.co/storage/v1/object/public/product-images/mockups/black-neck.png'
      ]
    }
  ];

  for (const update of updates) {
    console.log(`Updating ${update.slug}...`);

    const { data, error } = await supabase
      .from('products')
      .update({ images: update.images })
      .eq('slug', update.slug)
      .select();

    if (error) {
      console.error(`❌ Error updating ${update.slug}:`, error);
    } else {
      console.log(`✅ Updated ${update.slug}:`, data);
    }
  }

  console.log('\n✨ Done! Verifying...\n');

  // Verify
  const { data: products, error } = await supabase
    .from('products')
    .select('slug, title, images')
    .in('slug', ['classic-hoodie', 'classic-tee']);

  if (error) {
    console.error('Error fetching products:', error);
  } else {
    console.log('Current product images:');
    products?.forEach(p => {
      console.log(`\n${p.slug}:`);
      p.images?.forEach((img: string) => console.log(`  - ${img}`));
    });
  }
}

updateProductImages();