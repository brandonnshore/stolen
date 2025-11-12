import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="bg-white dark:bg-black min-h-screen transition-colors duration-300">
      {/* Hero Section */}
      <section className="py-20 sm:py-32 bg-white dark:bg-black">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 text-gray-900 dark:text-white">
            Pricing & Service
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Premium quality meets transparent pricing. No hidden fees, no surprises.
          </p>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-8">
            {/* T-Shirt Pricing */}
            <div className="bg-white dark:bg-black border-2 border-gray-200 dark:border-gray-800 rounded-2xl p-8">
              <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Classic T-Shirt</h3>
              <div className="mb-6">
                <span className="text-5xl font-black text-gray-900 dark:text-white">$12.99</span>
                <span className="text-gray-600 dark:text-gray-400 ml-2">base price</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-700 dark:text-gray-300">
                  <span className="mr-3 text-green-500">✓</span>
                  100% premium cotton
                </li>
                <li className="flex items-center text-gray-700 dark:text-gray-300">
                  <span className="mr-3 text-green-500">✓</span>
                  AI-powered logo extraction
                </li>
                <li className="flex items-center text-gray-700 dark:text-gray-300">
                  <span className="mr-3 text-green-500">✓</span>
                  300 DPI print quality
                </li>
                <li className="flex items-center text-gray-700 dark:text-gray-300">
                  <span className="mr-3 text-green-500">✓</span>
                  Multiple color options
                </li>
              </ul>
              <Link
                to="/products/classic-tee"
                className="block w-full py-3 bg-black dark:bg-white text-white dark:text-black text-center font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
              >
                Start Designing
              </Link>
            </div>

            {/* Hoodie Pricing */}
            <div className="bg-white dark:bg-black border-2 border-gray-200 dark:border-gray-800 rounded-2xl p-8">
              <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Classic Hoodie</h3>
              <div className="mb-6">
                <span className="text-5xl font-black text-gray-900 dark:text-white">$35.99</span>
                <span className="text-gray-600 dark:text-gray-400 ml-2">base price</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-700 dark:text-gray-300">
                  <span className="mr-3 text-green-500">✓</span>
                  Heavyweight fleece
                </li>
                <li className="flex items-center text-gray-700 dark:text-gray-300">
                  <span className="mr-3 text-green-500">✓</span>
                  AI-powered logo extraction
                </li>
                <li className="flex items-center text-gray-700 dark:text-gray-300">
                  <span className="mr-3 text-green-500">✓</span>
                  300 DPI print quality
                </li>
                <li className="flex items-center text-gray-700 dark:text-gray-300">
                  <span className="mr-3 text-green-500">✓</span>
                  Premium drawstrings
                </li>
              </ul>
              <Link
                to="/products/classic-hoodie"
                className="block w-full py-3 bg-black dark:bg-white text-white dark:text-black text-center font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
              >
                Start Designing
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white dark:bg-black">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-16 text-gray-900 dark:text-white">
            How the service works
          </h2>
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-black dark:bg-white rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white dark:text-black">1</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Upload Your Photo</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Take a pic of any design you like. Our AI extracts the logo automatically.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-black dark:bg-white rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white dark:text-black">2</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Customize</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Choose your garment, color, size, and placement. See it live in 3D.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-black dark:bg-white rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white dark:text-black">3</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">We Print & Ship</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Professional printing at 300 DPI. Ships within 3-5 business days.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-900 dark:text-white">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div className="bg-white dark:bg-black p-6 rounded-xl border border-gray-200 dark:border-gray-800">
              <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">How accurate is the AI extraction?</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Our AI achieves 99.2% accuracy on logo extraction. If you're not satisfied, you can manually adjust or re-upload.
              </p>
            </div>
            <div className="bg-white dark:bg-black p-6 rounded-xl border border-gray-200 dark:border-gray-800">
              <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">What's the print quality?</h3>
              <p className="text-gray-600 dark:text-gray-400">
                All designs are printed at 300 DPI using professional DTG (Direct-to-Garment) printing for crisp, vibrant results.
              </p>
            </div>
            <div className="bg-white dark:bg-black p-6 rounded-xl border border-gray-200 dark:border-gray-800">
              <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">How long does shipping take?</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Production takes 3-5 business days, then shipping is 5-7 days standard (or 2-3 days express).
              </p>
            </div>
            <div className="bg-white dark:bg-black p-6 rounded-xl border border-gray-200 dark:border-gray-800">
              <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">Is this legal?</h3>
              <p className="text-gray-600 dark:text-gray-400">
                You're responsible for ensuring you have rights to any designs you upload. We're just the printing service.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white dark:bg-black">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-gray-900 dark:text-white">
            Ready to steal some style?
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-10">
            Upload your first design and see what our AI can do.
          </p>
          <Link
            to="/products/classic-tee"
            className="inline-block px-8 py-4 bg-black dark:bg-white text-white dark:text-black text-lg font-medium rounded-full hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            Start Your First Heist
          </Link>
        </div>
      </section>
    </div>
  );
}
