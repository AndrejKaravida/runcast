import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA, type ManifestOptions } from 'vite-plugin-pwa';

const appManifest: Partial<ManifestOptions> = {
  name: 'RunCast',
  short_name: 'RunCast',
  theme_color: '#0b0f1a',
  background_color: '#0b0f1a',
  display: 'standalone',
  start_url: '/',
  scope: '/',
  lang: 'sr',
  icons: [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};

const devWebManifestPlugin: Plugin = {
  name: 'runcast:dev-web-manifest',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url?.split('?')[0] !== '/manifest.webmanifest') return next();
      res.setHeader('Content-Type', 'application/manifest+json');
      res.end(JSON.stringify(appManifest));
    });
  },
  transformIndexHtml() {
    return [
      {
        tag: 'link',
        attrs: { rel: 'manifest', href: '/manifest.webmanifest' },
        injectTo: 'head',
      },
    ];
  },
};

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      devOptions: { enabled: false },
      manifest: appManifest,
      includeAssets: ['icons/*.png', 'theme-init.js'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,webmanifest}'],
        navigateFallback: '/index.html',
        runtimeCaching: [],
        importScripts: ['push-sw.js'],
      },
    }),
    devWebManifestPlugin,
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
});
