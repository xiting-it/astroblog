import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import node from '@astrojs/node';
import remarkDirective from 'remark-directive';
import { customBlockquotes, customInlineLabels } from './remark-custom-blockquotes.js';

export default defineConfig({
  integrations: [
    mdx(),
  ],
  markdown: {
    remarkPlugins: [remarkDirective, customBlockquotes, customInlineLabels],
  },
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  site: 'https://blog.xitingit.top',
  devToolbar: {
    enabled: false,
  },
  vite: {
    server: {
      port: 4321,
    },
    resolve: {
      alias: {
        '@': '/root/astroblog/src',
      },
    },
  },
});
