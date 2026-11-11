// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

/**
 * Dev-only pages: live in src/dev-pages/ (outside src/pages, so they're never
 * built) and are routed only by `astro dev`. Keeps internal tools like /brand
 * out of production.
 */
const devPages = {
  name: 'dev-pages',
  hooks: {
    'astro:config:setup': ({ command, injectRoute }) => {
      if (command !== 'dev') return;
      injectRoute({ pattern: '/brand', entrypoint: './src/dev-pages/brand.astro' });
      injectRoute({ pattern: '/topo', entrypoint: './src/dev-pages/topo.astro' });
    },
  },
};

// https://astro.build/config
export default defineConfig({
  site: 'https://edtrek.digital',
  trailingSlash: 'ignore',
  integrations: [devPages],

  // Brand cuts only — exactly these faces exist, nothing else can render:
  //   Zilla Slab: Light 300, Light Italic 300, Bold 700
  //   Karla:      Regular 400, Bold 700
  // Uses the local provider (explicit variants) because remote providers request
  // weights × styles, which would add Bold Italic. Files: Fontsource (SIL OFL 1.1),
  // self-hosted from our own domain at build time.
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Zilla Slab',
      cssVariable: '--font-zilla-slab',
      fallbacks: ['Georgia', 'serif'],
      options: {
        variants: [
          { weight: 300, style: 'normal', src: ['@fontsource/zilla-slab/files/zilla-slab-latin-300-normal.woff2'] },
          { weight: 300, style: 'italic', src: ['@fontsource/zilla-slab/files/zilla-slab-latin-300-italic.woff2'] },
          { weight: 700, style: 'normal', src: ['@fontsource/zilla-slab/files/zilla-slab-latin-700-normal.woff2'] },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Karla',
      cssVariable: '--font-karla',
      fallbacks: ['system-ui', 'sans-serif'],
      options: {
        variants: [
          { weight: 400, style: 'normal', src: ['@fontsource/karla/files/karla-latin-400-normal.woff2'] },
          { weight: 700, style: 'normal', src: ['@fontsource/karla/files/karla-latin-700-normal.woff2'] },
        ],
      },
    },
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
