-- Copy and paste this ENTIRE block into Railway's database console

UPDATE products SET images = '["https://xezmvslgaclidlkpkkuc.supabase.co/storage/v1/object/public/product-images/mockups/black-front.png","https://xezmvslgaclidlkpkkuc.supabase.co/storage/v1/object/public/product-images/mockups/black-back.png","https://xezmvslgaclidlkpkkuc.supabase.co/storage/v1/object/public/product-images/mockups/black-neck.png"]'::jsonb WHERE slug = 'classic-tee';

UPDATE products SET images = '["https://xezmvslgaclidlkpkkuc.supabase.co/storage/v1/object/public/product-images/mockups/hoodie-black-front.png","https://xezmvslgaclidlkpkkuc.supabase.co/storage/v1/object/public/product-images/mockups/hoodie-black-back.png"]'::jsonb WHERE slug = 'classic-hoodie';

UPDATE products SET images = '["https://xezmvslgaclidlkpkkuc.supabase.co/storage/v1/object/public/product-images/mockups/hoodie-black-front.png","https://xezmvslgaclidlkpkkuc.supabase.co/storage/v1/object/public/product-images/mockups/hoodie-black-back.png"]'::jsonb WHERE slug = 'hoodie';