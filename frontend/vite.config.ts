import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { createHash } from 'crypto'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  css: {
    modules: {
      // Only apply to .module.css files to avoid conflicts with Tailwind
      localsConvention: 'camelCase',
      generateScopedName: (name: string, filename: string) => {
        // Only obfuscate if it's a CSS module file
        if (filename.includes('.module.')) {
          const hash = createHash('md5').update(name + filename).digest('hex').substring(0, 8);
          return `_${hash}`;
        }
        return name;
      },
      hashPrefix: 'obf',
    }
  },
  build: {
    chunkSizeWarningLimit: 1000, // 1MB limit
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
      format: {
        comments: false,
      },
    },
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return `assets/[hash][extname]`;
          }
          return `assets/[hash][extname]`;
        },
        chunkFileNames: 'assets/[hash].js',
        entryFileNames: 'assets/[hash].js',
        manualChunks: (id) => {
          // React ve core kütüphaneler
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('react-router')) {
              return 'react-router';
            }
            // Diğer node_modules
            return 'vendor';
          }
          
          // Sayfa bazlı chunking
          if (id.includes('/pages/')) {
            if (id.includes('StajBasvuru') || id.includes('BasvuruTakip')) {
              return 'staj-pages';
            }
            if (id.includes('Defterim')) {
              return 'defter-main';
            }
            if (id.includes('Home') || id.includes('Dashboard')) {
              return 'core-pages';
            }
            if (id.includes('DanismanPanel')) {
              return 'danisman-panel';
            }
            if (id.includes('KariyerPanel')) {
              return 'kariyer-panel';
            }
          }
          
          // Components ve diğer dosyalar
          if (id.includes('/Components/')) {
            return 'components';
          }
        }
      }
    }
  },
  server: {
    host: '0.0.0.0', // Allow access from local network
    port: 5173,
    hmr: {
      overlay: false
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        timeout: 300000, // 5 dakika timeout
        proxyTimeout: 300000, // 5 dakika proxy timeout
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('Sending Request to the Target:', req.method, req.url);
            // Upload için daha uzun timeout
            if (req.url?.includes('/upload')) {
              proxyReq.setTimeout(600000); // 10 dakika
            }
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      }
    }
  },
  preview: {
    host: '0.0.0.0', // Allow access from local network
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        timeout: 300000, // 5 dakika timeout
        proxyTimeout: 300000, // 5 dakika proxy timeout
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('Sending Request to the Target:', req.method, req.url);
            // Upload için daha uzun timeout
            if (req.url?.includes('/upload')) {
              proxyReq.setTimeout(600000); // 10 dakika
            }
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      }
    }
  }
})
