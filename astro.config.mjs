import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import remarkDirective from 'remark-directive';
import { customBlockquotes, customInlineLabels } from './remark-custom-blockquotes.js';

export default defineConfig({
  integrations: [
    mdx(),
  ],
  markdown: {
    remarkPlugins: [remarkDirective, customBlockquotes, customInlineLabels],
    // 代码高亮由 NextLayout 加载的 highlight.js (CDN) 在客户端渲染，关闭构建期 shiki 避免重复处理
    syntaxHighlight: false,
    gfm: true, // 支持 GitHub Flavored Markdown
    smartypants: true, // 智能标点符号
  },
  output: 'static',
  site: 'https://blog.xiting3.xyz',
  devToolbar: {
    enabled: false,
  },
  vite: {
    server: {
      port: 4321,
    },
    resolve: {
      alias: {
        '@': './src',
      },
    },
  },
  build: {
    format: 'directory', // 使用目录格式，URL 更清晰
  },
  experimental: {
    clientPrerender: true, // 启用客户端预渲染
  },
});
