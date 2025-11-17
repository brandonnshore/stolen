-- Update product images to use Supabase Storage URLs
-- Run this in your Railway PostgreSQL database

-- Update Classic Hoodie
UPDATE products
SET images = '[
  "https://xezmvslgaclidlkpkkuc.supabase.co/storage/v1/object/public/product-images/mockups/hoodie-black-front.png",
  "https://xezmvslgaclidlkpkkuc.supabase.co/storage/v1/object/public/product-images/mockups/hoodie-black-back.png"
]'::jsonb
WHERE slug = 'classic-hoodie';

-- Update Classic T-Shirt
UPDATE products
SET images = '[
  "https://xezmvslgaclidlkpkkuc.supabase.co/storage/v1/object/public/product-images/mockups/black-front.png",
  "https://xezmvslgaclidlkpkkuc.supabase.co/storage/v1/object/public/product-images/mockups/black-back.png",
  "https://xezmvslgaclidlkpkkuc.supabase.co/storage/v1/object/public/product-images/mockups/black-neck.png"
]'::jsonb
WHERE slug = 'classic-tee';

-- Verify the update
SELECT slug, title, jsonb_array_length(images) as image_count, images->0 as first_image
FROM products;