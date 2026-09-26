import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { defineConfig } from 'vite';

// Fix for Node 22 + tsx environment where tsx injects globalThis.__dirname = '.'
// which causes createRequire('.') in ESM plugins (e.g. vite-plugin-pwa) to throw ERR_INVALID_ARG_VALUE
if (typeof (globalThis as any).__dirname === 'string' && (globalThis as any).__dirname === '.') {
  delete (globalThis as any).__dirname;
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'],
        manifest: {
          id: '/',
          name: 'AURA GAY 18+ — Premium Gay Social',
          short_name: 'AURA 18+',
          description: 'A premium, secure, polished, mobile-first gay social & dating connection platform for adults 18+.',
          theme_color: '#0b0d12',
          background_color: '#0b0d12',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icon-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          // These navigations must reach Cloud Run: it verifies Stripe before
          // serving the confirmation page used for URL-based conversions.
          navigateFallbackDenylist: [/^\/payment\/confirmation(?:\/|$)/],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    server: {
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      hmr: process.env.DISABLE_HMR === 'true' ? false : undefined,
    },
    build: {
      outDir: 'dist/web',
      emptyOutDir: true,
    },
  };
});
