const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://postgres.dntnjlodfcojzgovikic:Bubbleboy2413!@aws-1-us-east-1.pooler.supabase.com:6543/postgres"
});

async function add2XL() {
  try {
    console.log('Adding 2XL to both products...\n');

    // Get product IDs
    const products = await pool.query(`
      SELECT id, slug, title FROM products
    `);

    for (const product of products.rows) {
      if (product.slug === 'classic-tee') {
        // Add 2XL for t-shirt (Black and White)
        await pool.query(`
          INSERT INTO variants (product_id, color, size, sku, base_cost, base_price, stock_level)
          VALUES
            ($1, 'Black', '2XL', 'TEE-BLK-2XL', 9.50, 26.99, 0),
            ($1, 'White', '2XL', 'TEE-WHT-2XL', 9.50, 26.99, 0)
          ON CONFLICT (sku) DO NOTHING
        `, [product.id]);
        console.log('✅ Added 2XL to t-shirts (Black & White)');
      } else if (product.slug === 'classic-hoodie') {
        // Add 2XL for hoodie
        await pool.query(`
          INSERT INTO variants (product_id, color, size, sku, base_cost, base_price, stock_level)
          VALUES
            ($1, 'Black', '2XL', 'HOODIE-BLK-2XL', 20.00, 39.99, 0)
          ON CONFLICT (sku) DO NOTHING
        `, [product.id]);
        console.log('✅ Added 2XL to hoodie (Black)');
      }
    }

    // Show final sizes
    console.log('\n📦 Final product sizes:');
    for (const product of products.rows) {
      const variants = await pool.query(`
        SELECT DISTINCT size FROM variants WHERE product_id = $1 ORDER BY
        CASE size
          WHEN 'S' THEN 1
          WHEN 'M' THEN 2
          WHEN 'L' THEN 3
          WHEN 'XL' THEN 4
          WHEN '2XL' THEN 5
        END
      `, [product.id]);

      const sizes = variants.rows.map(r => r.size).join(', ');
      console.log(`  ${product.title}: ${sizes}`);
    }

    await pool.end();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

add2XL();
