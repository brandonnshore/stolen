import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Product } from '../types';
// import TweetWall3D from '../components/TweetWall3D';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [heistCount, setHeistCount] = useState(12847);

  useEffect(() => {
    // Hardcoded products - no API calls
    const products = [
      {
        id: '1',
        title: 'Classic Cotton T-Shirt',
        slug: 'classic-tee',
        description: 'Premium 100% cotton t-shirt',
        images: ['/assets/blank-tshirt.png'],
        status: 'active' as const,
        variants: [
          { id: '1', product_id: '1', color: 'White', size: 'M', sku: 'TEE-WHT-M', base_price: 12.99, stock_level: 100 }
        ]
      },
      {
        id: '2',
        title: 'Classic Hoodie',
        slug: 'classic-hoodie',
        description: 'Premium heavyweight hoodie',
        images: ['/assets/hoodie-black-front.png'],
        status: 'active' as const,
        variants: [
          { id: '2', product_id: '2', color: 'Black', size: 'M', sku: 'HOODIE-BLK-M', base_price: 35.99, stock_level: 100 }
        ]
      }
    ];

    setProducts(products);
    setLoading(false);

    // Animate heist counter
    const interval = setInterval(() => {
      setHeistCount(prev => prev + Math.floor(Math.random() * 3));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const categories = ['T-Shirts', 'Hoodies', 'Sportswear', 'Hats & Bags', 'Women'];
  const productColors = ['#000000', '#1e3a8a', '#6b7280', '#ffffff', '#7c2d12'];

  const trophyItems = [
    { title: 'Coachella Find', designer: '@vintage_hunter', status: 'CLASSIFIED' },
    { title: 'Supreme Drop', designer: '@streetwear_king', status: 'EXTRACTED' },
    { title: 'Band Tee \'85', designer: '@retro_collector', status: 'STOLEN' },
    { title: 'Skate Logo', designer: '@urban_style', status: 'CLASSIFIED' },
    { title: 'Nike Vintage', designer: '@sneaker_head', status: 'EXTRACTED' },
    { title: 'Concert Merch', designer: '@music_fan', status: 'STOLEN' },
    { title: 'Japanese Street', designer: '@tokyo_vibes', status: 'CLASSIFIED' },
    { title: 'Graffiti Art', designer: '@street_artist', status: 'EXTRACTED' },
  ];

  return (
    <div className="bg-white dark:bg-black min-h-screen transition-colors duration-300">
      {/* Hero Section */}
      {/* Hero Section */}
      <section className="h-screen flex items-center justify-center overflow-hidden relative">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="/assets/hero-bg.jpg"
            alt="Stolen Art"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40"></div>
        </div>

        <div className="text-center px-6 sm:px-12 max-w-4xl relative z-10 pt-20">
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight mb-6 sm:mb-8 text-white">
            <span className="glitch-hover inline-block">Seen it.</span><br />
            <span className="glitch-hover inline-block">Want it.</span><br />
            <span className="glitch-hover inline-block">Got it.</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-200 leading-relaxed mb-8 sm:mb-10 max-w-2xl mx-auto">
            Upload a photo of any shirt. Our thieves extract the design and recreate it on premium blanks in seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/products/classic-tee"
              className="px-8 py-4 bg-white text-black text-base font-medium rounded-md hover:bg-gray-100 transition-colors text-center"
            >
              Start Your Heist
            </Link>
            <Link
              to="/how-it-works"
              className="px-8 py-4 border-2 border-white text-white text-base font-medium rounded-md hover:bg-white/10 transition-colors text-center"
            >
              See How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Dashboard */}
      <section className="py-16 sm:py-20 bg-gray-50 dark:bg-black transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-950 rounded-xl p-6 text-center shadow-sm border border-gray-100 dark:border-gray-800 transition-colors duration-300">
              <div className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-2">{heistCount.toLocaleString()}</div>
              <div className="text-gray-600 dark:text-gray-300 text-sm uppercase tracking-wider font-medium">Designs Stolen</div>
            </div>
            <div className="bg-white dark:bg-gray-950 rounded-xl p-6 text-center shadow-sm border border-gray-100 dark:border-gray-800 transition-colors duration-300">
              <div className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-500 mb-2">99.2%</div>
              <div className="text-gray-600 dark:text-gray-300 text-sm uppercase tracking-wider font-medium">Accuracy Rate</div>
            </div>
            <div className="bg-white dark:bg-gray-950 rounded-xl p-6 text-center shadow-sm border border-gray-100 dark:border-gray-800 transition-colors duration-300">
              <div className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500 mb-2">0</div>
              <div className="text-gray-600 dark:text-gray-300 text-sm uppercase tracking-wider font-medium">Lawyers Contacted</div>
              <div className="text-gray-400 dark:text-gray-600 text-xs mt-1">(so far)</div>
            </div>
            <div className="bg-white dark:bg-gray-950 rounded-xl p-6 text-center shadow-sm border border-gray-100 dark:border-gray-800 transition-colors duration-300">
              <div className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 mb-2">24/7</div>
              <div className="text-gray-600 dark:text-gray-300 text-sm uppercase tracking-wider font-medium">Active Heists</div>
            </div>
          </div>
        </div>
      </section>

      {/* Trophy Case */}
      <section className="py-16 sm:py-20 bg-white dark:bg-black transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Trophy Case
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-lg max-w-2xl mx-auto">
              Recent heists pulled off by our community. Your design could be next.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {trophyItems.map((item, index) => (
              <div
                key={index}
                className="polaroid-tilt bg-white dark:bg-gray-950 p-4 shadow-lg border dark:border-gray-800"
              >
                {/* Polaroid Image Area */}
                <div className="aspect-square bg-gray-100 dark:bg-gray-900 mb-3 relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-600">
                    <div className="text-center">
                      <div className="text-6xl mb-2">👕</div>
                      <div className="text-sm font-medium">{item.title}</div>
                    </div>
                  </div>

                  {/* Stamp Overlay */}
                  <div className="absolute top-3 right-3">
                    <div className="stamp">
                      {item.status}
                    </div>
                  </div>
                </div>

                {/* Polaroid Caption */}
                <div className="text-center">
                  <div className="font-medium text-gray-900 dark:text-white text-sm mb-1">{item.title}</div>
                  <div className="text-gray-500 dark:text-gray-400 text-xs">{item.designer}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product Showcase Section */}
      <section className="pt-12 sm:pt-16 pb-16 sm:pb-20 bg-white dark:bg-black transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold mb-3 sm:mb-4 text-gray-900 dark:text-white">
              Premium blanks,<br className="hidden sm:block" /> perfected by AI
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-6 sm:mb-8 px-4">
              Upload any design. Our AI extracts it perfectly and prints it on these premium garments at 300 DPI quality.
            </p>

            {/* Category Filters */}
            <div className="flex flex-wrap justify-center gap-2 mb-4 px-4">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2.5 text-sm font-medium rounded-md transition-colors ${selectedCategory === category
                    ? 'bg-black dark:bg-white text-white dark:text-black'
                    : 'bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900'
                    }`}
                >
                  {category}
                </button>
              ))}
              <button
                onClick={() => setSelectedCategory('All')}
                className={`px-4 py-2.5 text-sm font-medium rounded-md transition-colors ${selectedCategory === 'All'
                  ? 'bg-black dark:bg-white text-white dark:text-black'
                  : 'bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900'
                  }`}
              >
                All products
              </button>
            </div>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-12">
              {products.slice(0, 5).map((product) => (
                <Link
                  key={product.id}
                  to={`/products/${product.slug}`}
                  className="group block"
                >
                  {/* Product Image */}
                  <div className="mb-4 overflow-hidden -mx-4">
                    <div className="aspect-[4/5] flex items-center justify-center">
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={product.images[0]}
                          alt={product.title}
                          className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-500"
                          style={{ imageRendering: 'auto' }}
                          onError={(e) => {
                            e.currentTarget.src = '/assets/blank-tshirt.png';
                          }}
                        />
                      ) : (
                        <img
                          src="/assets/blank-tshirt.png"
                          alt={product.title}
                          className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-500"
                          style={{ imageRendering: 'auto' }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Color dots */}
                  <div className="flex justify-center gap-1.5 mb-2">
                    {productColors.map((color, i) => (
                      <div
                        key={i}
                        className="w-3 h-3 rounded-full border border-gray-300"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>

                  {/* Product info */}
                  <div className="text-center">
                    <p className="text-sm font-medium mb-1">{product.title}</p>
                    {product.variants && product.variants.length > 0 && (
                      <p className="text-sm text-gray-600">
                        from ${Number(product.variants[0].base_price).toFixed(2)}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Trusted By Section - Scrolling Logos */}
      <section className="py-12 sm:py-16 bg-white overflow-hidden relative">
        {/* Fixed "Trusted by" text on the left with background and fade */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 z-20 flex items-center">
          <div className="bg-white px-4 sm:px-8 py-3 sm:py-4 relative z-10">
            <h3 className="text-xl sm:text-2xl lg:text-4xl font-bold">Stolen from</h3>
          </div>
          {/* Fade gradient extending to the right behind the text */}
          <div className="absolute left-0 top-0 bottom-0 w-48 sm:w-96 bg-gradient-to-r from-white via-white to-transparent pointer-events-none"></div>
        </div>

        {/* Scrolling logos container */}
        <div className="relative">
          <div className="flex animate-scroll">
            {/* First set of logos */}
            <div className="flex items-center gap-8 sm:gap-16 min-w-max pr-8 sm:pr-16">
              <div className="text-sm sm:text-xl lg:text-2xl font-bold text-gray-800">UNIVERSAL<br />MUSIC GROUP</div>
              <div className="text-sm sm:text-xl lg:text-2xl font-bold text-gray-800" style={{ letterSpacing: '0.2em' }}>DINAMO</div>
              <div className="text-sm sm:text-xl lg:text-2xl font-bold text-gray-800">believe.</div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-black rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 sm:w-6 sm:h-6 border-2 border-white rounded-full"></div>
                </div>
                <div className="text-sm sm:text-lg lg:text-xl font-medium text-gray-800">Index<br />Ventures</div>
              </div>
            </div>

            {/* Second set */}
            <div className="flex items-center gap-8 sm:gap-16 min-w-max pr-8 sm:pr-16">
              <div className="text-sm sm:text-xl lg:text-2xl font-bold text-gray-800">UNIVERSAL<br />MUSIC GROUP</div>
              <div className="text-sm sm:text-xl lg:text-2xl font-bold text-gray-800" style={{ letterSpacing: '0.2em' }}>DINAMO</div>
              <div className="text-sm sm:text-xl lg:text-2xl font-bold text-gray-800">believe.</div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-black rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 sm:w-6 sm:h-6 border-2 border-white rounded-full"></div>
                </div>
                <div className="text-sm sm:text-lg lg:text-xl font-medium text-gray-800">Index<br />Ventures</div>
              </div>
            </div>

            {/* Third set */}
            <div className="flex items-center gap-8 sm:gap-16 min-w-max pr-8 sm:pr-16">
              <div className="text-sm sm:text-xl lg:text-2xl font-bold text-gray-800">UNIVERSAL<br />MUSIC GROUP</div>
              <div className="text-sm sm:text-xl lg:text-2xl font-bold text-gray-800" style={{ letterSpacing: '0.2em' }}>DINAMO</div>
              <div className="text-sm sm:text-xl lg:text-2xl font-bold text-gray-800">believe.</div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-black rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 sm:w-6 sm:h-6 border-2 border-white rounded-full"></div>
                </div>
                <div className="text-sm sm:text-lg lg:text-xl font-medium text-gray-800">Index<br />Ventures</div>
              </div>
            </div>

            {/* Fourth set */}
            <div className="flex items-center gap-8 sm:gap-16 min-w-max pr-8 sm:pr-16">
              <div className="text-sm sm:text-xl lg:text-2xl font-bold text-gray-800">UNIVERSAL<br />MUSIC GROUP</div>
              <div className="text-sm sm:text-xl lg:text-2xl font-bold text-gray-800" style={{ letterSpacing: '0.2em' }}>DINAMO</div>
              <div className="text-sm sm:text-xl lg:text-2xl font-bold text-gray-800">believe.</div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-black rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 sm:w-6 sm:h-6 border-2 border-white rounded-full"></div>
                </div>
                <div className="text-sm sm:text-lg lg:text-xl font-medium text-gray-800">Index<br />Ventures</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
