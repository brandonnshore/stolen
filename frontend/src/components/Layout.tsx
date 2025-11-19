import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Menu, X, Moon, Sun } from 'lucide-react';
import { useCartStore } from '../stores/cartStore';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useState, useEffect } from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const cartItemCount = useCartStore((state) => state.items.length);
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Hide header on product detail/customizer pages
  const hideHeader = (location.pathname.startsWith('/products/') && location.pathname !== '/products') || location.pathname === '/hoodie';

  // Check if we are on the homepage
  const isHome = location.pathname === '/';

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-black transition-colors duration-300">
      {/* Header - Assembly style */}
      {!hideHeader && (
        <>
          <header
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isHome && !isScrolled
              ? 'bg-transparent border-transparent'
              : 'bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800'
              }`}
          >
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between relative">
              <Link to="/" className="flex items-center">
                <img
                  src={isDark || (isHome && !isScrolled) ? "/assets/stolentee-logo-white.png" : "/assets/stolentee-logo.png"}
                  alt="Stolen Tee"
                  className="h-8 sm:h-10 w-auto"
                />
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
                <Link
                  to="/products"
                  className={`text-sm transition-colors ${isHome && !isScrolled
                    ? 'text-white hover:text-gray-200'
                    : 'text-gray-900 dark:text-gray-100 hover:text-gray-600 dark:hover:text-gray-400'
                    }`}
                >
                  Products
                </Link>
                <Link
                  to="/how-it-works"
                  className={`text-sm transition-colors ${isHome && !isScrolled
                    ? 'text-white hover:text-gray-200'
                    : 'text-gray-900 dark:text-gray-100 hover:text-gray-600 dark:hover:text-gray-400'
                    }`}
                >
                  How it works
                </Link>
                <Link
                  to="/about"
                  className={`text-sm transition-colors ${isHome && !isScrolled
                    ? 'text-white hover:text-gray-200'
                    : 'text-gray-900 dark:text-gray-100 hover:text-gray-600 dark:hover:text-gray-400'
                    }`}
                >
                  Pricing & Service
                </Link>
                <Link
                  to="/case-studies"
                  className={`text-sm transition-colors ${isHome && !isScrolled
                    ? 'text-white hover:text-gray-200'
                    : 'text-gray-900 dark:text-gray-100 hover:text-gray-600 dark:hover:text-gray-400'
                    }`}
                >
                  Case Studies
                </Link>
              </div>

              {/* Desktop Right Side */}
              <div className="hidden md:flex items-center gap-4">
                <button
                  onClick={toggleTheme}
                  className={`p-2 transition-colors ${isHome && !isScrolled
                    ? 'text-white hover:text-gray-200'
                    : 'text-gray-900 dark:text-gray-100 hover:text-gray-600 dark:hover:text-gray-400'
                    }`}
                  aria-label="Toggle dark mode"
                >
                  {isDark || (isHome && !isScrolled) ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <Link
                  to="/cart"
                  className={`relative transition-colors ${isHome && !isScrolled
                    ? 'text-white hover:text-gray-200'
                    : 'text-gray-900 dark:text-gray-100 hover:text-gray-600 dark:hover:text-gray-400'
                    }`}
                >
                  <ShoppingCart size={20} />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-black dark:bg-white text-white dark:text-black text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {cartItemCount}
                    </span>
                  )}
                </Link>
                {isAuthenticated ? (
                  <Link
                    to="/dashboard"
                    className="w-8 h-8 rounded-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 flex items-center justify-center text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
                  >
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    className={`text-sm transition-colors ${isHome && !isScrolled
                      ? 'text-white hover:text-gray-200'
                      : 'text-gray-900 dark:text-gray-100 hover:text-gray-600 dark:hover:text-gray-400'
                      }`}
                  >
                    Login
                  </Link>
                )}
                <Link
                  to="/products"
                  className={`px-5 py-2.5 text-sm font-medium rounded-full transition-colors ${isHome && !isScrolled
                    ? 'bg-white text-black hover:bg-gray-100'
                    : 'bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200'
                    }`}
                >
                  Start designing
                </Link>
              </div>

              {/* Mobile Right Side */}
              <div className="flex md:hidden items-center gap-3">
                <button
                  onClick={toggleTheme}
                  className={`p-2 ${isHome && !isScrolled ? 'text-white' : 'text-gray-900 dark:text-gray-100'
                    }`}
                  aria-label="Toggle dark mode"
                >
                  {isDark || (isHome && !isScrolled) ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <Link
                  to="/cart"
                  className={`relative p-2 ${isHome && !isScrolled ? 'text-white' : 'text-gray-900 dark:text-gray-100'
                    }`}
                >
                  <ShoppingCart size={22} />
                  {cartItemCount > 0 && (
                    <span className="absolute top-0 right-0 bg-black dark:bg-white text-white dark:text-black text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {cartItemCount}
                    </span>
                  )}
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className={`p-2 ${isHome && !isScrolled ? 'text-white' : 'text-gray-900 dark:text-gray-100'
                    }`}
                  aria-label="Toggle menu"
                >
                  {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
              </div>
            </nav>
          </header>

          {/* Mobile Menu Overlay */}
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-40 md:hidden">
              <div className="fixed inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
              <div className="fixed top-16 right-0 bottom-0 w-64 bg-white dark:bg-black shadow-xl border-l dark:border-gray-800">
                <nav className="flex flex-col p-6 gap-6">
                  <Link
                    to="/products"
                    className="text-base font-medium text-gray-900 dark:text-gray-100"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Products
                  </Link>
                  <Link
                    to="/how-it-works"
                    className="text-base font-medium text-gray-900 dark:text-gray-100"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    How it works
                  </Link>
                  <Link
                    to="/about"
                    className="text-base font-medium text-gray-900 dark:text-gray-100"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Pricing & Service
                  </Link>
                  <Link
                    to="/case-studies"
                    className="text-base font-medium text-gray-900 dark:text-gray-100"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Case Studies
                  </Link>

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4">
                    {isAuthenticated ? (
                      <Link
                        to="/dashboard"
                        className="block py-2 text-base font-medium text-gray-900 dark:text-gray-100"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Dashboard
                      </Link>
                    ) : (
                      <Link
                        to="/login"
                        className="block py-2 text-base font-medium text-gray-900 dark:text-gray-100"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Login
                      </Link>
                    )}
                    <Link
                      to="/products"
                      className="block w-full py-3 bg-black dark:bg-white text-white dark:text-black text-center text-sm font-medium rounded-full hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Start designing
                    </Link>
                  </div>
                </nav>
              </div>
            </div>
          )}
        </>
      )}

      {/* Main Content */}
      <main className={`flex-1 ${!isHome && !hideHeader ? 'pt-16' : ''}`}>
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center space-y-2">
            <p className="text-gray-400 text-sm">
              &copy; {new Date().getFullYear()} Stolen Tee. All designs <span className="line-through">legally</span> stolen.
            </p>
            <p className="text-gray-500 text-xs">
              "legal" we're kidding — redefine print
            </p>
            <p className="text-gray-600 text-xs italic">
              Built with questionable ethics
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
