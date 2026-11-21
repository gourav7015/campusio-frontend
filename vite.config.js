import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

/** When the API lives on another address, tell the browser to open that connection while the page is still loading (saves one round trip on the first request). */
function preconnectApi() {
  let api = '';
  return {
    name: 'preconnect-api',
    configResolved(cfg) { api = process.env.VITE_API_URL || loadEnv(cfg.mode, cfg.envDir || cfg.root, 'VITE_').VITE_API_URL || ''; },
    transformIndexHtml(html) {
      let origin = '';
      try { origin = api ? new URL(api).origin : ''; } catch { origin = ''; }
      return origin ? html.replace('</head>', `    <link rel="preconnect" href="${origin}" crossorigin />\n  </head>`) : html;
    },
  };
}

export default defineConfig({
  plugins: [react(), preconnectApi()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { port: 5173, proxy: { '/api': { target: process.env.VITE_PROXY_TARGET || 'http://localhost:4000', changeOrigin: true } } },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // libraries change rarely, our own code changes on every deploy: keeping them in separate files means a returning visitor re-downloads only our code
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return 'vendor-react';
          if (/node_modules\/(@tanstack|zod)\//.test(id)) return 'vendor-data';
          if (/node_modules\/(@radix-ui|@floating-ui|react-remove-scroll|aria-hidden|react-style-singleton|use-callback-ref|use-sidecar)\//.test(id)) return 'vendor-ui';
          if (/node_modules\/(framer-motion|motion-dom|motion-utils)\//.test(id)) return 'vendor-motion';
          return undefined;
        },
      },
    },
  },
  test: { exclude: ['node_modules', 'dist', 'e2e/**'], environment: 'jsdom', globals: true, setupFiles: ['./src/test-setup.js'], css: false },
});
