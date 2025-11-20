-- Migration: Update product images to use Supabase Storage URLs
-- This fixes the iOS app image loading issue

-- Update classic-tee product images
UPDATE products
SET images = '[
  "https://dntnjlodfcojzgovikic.supabase.co/storage/v1/object/public/product-images/mockups/black-front.png",
  "https://dntnjlodfcojzgovikic.supabase.co/storage/v1/object/public/product-images/mockups/black-back.png",
  "https://dntnjlodfcojzgovikic.supabase.co/storage/v1/object/public/product-images/mockups/black-neck.png"
]'::jsonb
WHERE slug = 'classic-tee';

-- Update classic-hoodie product images
UPDATE products
SET images = '[
  "https://dntnjlodfcojzgovikic.supabase.co/storage/v1/object/public/product-images/mockups/hoodie-black-front.png",
  "https://dntnjlodfcojzgovikic.supabase.co/storage/v1/object/public/product-images/mockups/hoodie-black-back.png"
]'::jsonb
WHERE slug = 'classic-hoodie';

-- Also update if slug is just 'hoodie'
UPDATE products
SET images = '[
  "https://dntnjlodfcojzgovikic.supabase.co/storage/v1/object/public/product-images/mockups/hoodie-black-front.png",
  "https://dntnjlodfcojzgovikic.supabase.co/storage/v1/object/public/product-images/mockups/hoodie-black-back.png"
]'::jsonb
WHERE slug = 'hoodie';