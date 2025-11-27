import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Optimize chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching - optimized for bundle size
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'canvas-vendor': ['konva', 'react-konva'],
          'auth-vendor': ['@supabase/supabase-js'],
          'state-vendor': ['zustand'],
          'stripe-vendor': ['@stripe/react-stripe-js', '@stripe/stripe-js'],
        },
        // Optimize output file naming for better caching
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
      },
    },
    // Increase chunk size warning limit to 500kb (targeting smaller bundles)
    chunkSizeWarningLimit: 500,
    // Enable source maps for production debugging (set to true if needed)
    sourcemap: false,
    // Minify for production with terser for better compression
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
        passes: 3, // Run compression 3 times for even better results
        unsafe_arrows: true, // Convert functions to arrow functions
        unsafe_methods: true, // Optimize method calls
        unsafe_proto: true, // Optimize prototype access
        toplevel: true, // Enable top-level variable and function name mangling
      },
      format: {
        comments: false, // Remove comments
      },
      mangle: {
        safari10: true, // Better compatibility
        toplevel: true, // Mangle top-level names
      },
    },
    // Target modern browsers for better optimization
    target: 'es2020',
    // Optimize CSS
    cssCodeSplit: true,
    cssMinify: true,
    // Improve build performance
    reportCompressedSize: true, // Re-enable to track bundle size improvements
  },
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  // Preview server configuration
  preview: {
    port: 5173,
    strictPort: true,
  },
});
