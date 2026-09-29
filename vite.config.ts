import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

/**
 * وسيط RSS للوضع المحلي — يجلب التغذيات من الخادم لتجاوز قيود CORS.
 * في الإنتاج يعوَّض بـ Netlify Function (نفس المسار /api/rss).
 */
function rssProxyPlugin(): Plugin {
  return {
    name: 'newsmaroc-rss-proxy',
    configureServer(server) {
      server.middlewares.use('/api/rss', async (req, res) => {
        try {
          const base = `http://${req.headers.host ?? 'localhost'}`;
          const target = new URL(req.url ?? '/', base).searchParams.get('url') ?? '';
          if (!/^https?:\/\//i.test(target)) {
            res.statusCode = 400;
            res.end('bad url');
            return;
          }
          const upstream = await fetch(target, {
            headers: {
              'User-Agent': 'NewsMaroc-Agent/1.0 (+https://newsmaroc.ma)',
              Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
            },
            redirect: 'follow',
          });
          const body = await upstream.text();
          res.statusCode = upstream.status;
          res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/xml; charset=utf-8');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Cache-Control', 'no-store');
          res.end(body);
        } catch (e) {
          res.statusCode = 502;
          res.end('RSS proxy error: ' + String(e));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), rssProxyPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // السماح بمضيف المعاينة المباشرة (.e2b.app)
    allowedHosts: ['.e2b.app'],
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: ['.e2b.app'],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2020',
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@supabase')) return 'vendor-supabase';
          if (id.includes('lucide')) return 'vendor-icons';
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/scheduler/') ||
            id.includes('react-router') ||
            id.includes('@remix-run')
          ) {
            return 'vendor-react';
          }
          return 'vendor';
        },
      },
    },
  },
});
