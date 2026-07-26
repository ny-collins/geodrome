import { defineConfig, Plugin } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

/* ========================================================================== */
/*                           CLEAN ROUTING & 404 PLUGIN                       */
/* ========================================================================== */

function customCleanRoutingPlugin(): Plugin {
  return {
    name: 'custom-clean-routing-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url) return next();
        const url = req.url.split('?')[0];

        const publicFile = resolve(__dirname, 'public', url.slice(1));
        const rootFile = resolve(__dirname, url.slice(1));
        if (fs.existsSync(publicFile) || fs.existsSync(rootFile)) {
          return next();
        }

        if (
          url.endsWith('.ts') ||
          url.endsWith('.css') ||
          url.endsWith('.js') ||
          url.endsWith('.json') ||
          url.startsWith('/@') ||
          url.startsWith('/node_modules')
        ) {
          return next();
        }

        if (url === '/' || url === '/home' || url === '/index.html') {
          req.url = '/index.html';
          return next();
        }

        if (url === '/about' || url === '/about.html') {
          req.url = '/about.html';
          return next();
        }

        if (url === '/404' || url === '/404.html') {
          req.url = '/404.html';
          return next();
        }

        const html404 = fs.readFileSync(resolve(__dirname, '404.html'), 'utf-8');
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/html');
        res.end(html404);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url) return next();
        const url = req.url.split('?')[0];

        const distFile = resolve(__dirname, 'dist', url.slice(1));
        if (fs.existsSync(distFile)) {
          return next();
        }

        if (url === '/' || url === '/home' || url === '/index.html') {
          req.url = '/index.html';
          return next();
        }

        if (url === '/about' || url === '/about.html') {
          req.url = '/about.html';
          return next();
        }

        if (url === '/404' || url === '/404.html') {
          req.url = '/404.html';
          return next();
        }

        const dist404 = resolve(__dirname, 'dist/404.html');
        if (fs.existsSync(dist404)) {
          const html404 = fs.readFileSync(dist404, 'utf-8');
          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/html');
          res.end(html404);
        } else {
          next();
        }
      });
    }
  };
}

/* ========================================================================== */
/*                           VITE BUNDLER CONFIG                              */
/* ========================================================================== */

export default defineConfig({
  plugins: [customCleanRoutingPlugin()],
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about.html'),
        notFound: resolve(__dirname, '404.html')
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) {
            return 'three-vendor';
          }
          if (id.includes('node_modules/topojson-client') || id.includes('node_modules/d3-geo')) {
            return 'geo-vendor';
          }
        }
      }
    }
  }
});
