import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  build: { inlineStylesheets: 'always' },
  devToolbar: { enabled: false },
});
