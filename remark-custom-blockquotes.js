import { visit } from 'unist-util-visit';

/**
 * Starlight 风格的 Aside 容器
 *
 * 语法（Markdown directive）：
 *   :::note
 *   内容
 *   :::
 *
 * 支持的 4 种类型（对齐 Astro Starlight）：
 *   - note     → Note      (蓝色)
 *   - tip      → Tip       (绿色)
 *   - caution  → Caution   (橙色)
 *   - danger   → Danger    (红色)
 *
 * 渲染成 <aside class="aside aside-xxx"> + 图标 + 标题 + 内容
 */

// 类型配置：key = directive 名称
const ASIDE_TYPES = {
  note: {
    title: 'Note',
    icon: 'fa-solid fa-circle-info',
  },
  tip: {
    title: 'Tip',
    icon: 'fa-solid fa-lightbulb',
  },
  caution: {
    title: 'Caution',
    icon: 'fa-solid fa-triangle-exclamation',
  },
  danger: {
    title: 'Danger',
    icon: 'fa-solid fa-circle-exclamation',
  },
};

export function customBlockquotes() {
  return (tree) => {
    visit(tree, (node) => {
      if (
        node.type === 'containerDirective' ||
        node.type === 'leafDirective' ||
        node.type === 'textDirective'
      ) {
        const config = ASIDE_TYPES[node.name];
        if (!config) return; // 不是 aside 类型，跳过

        const data = node.data || (node.data = {});

        // 把 directive 转成 <aside>
        data.hName = 'aside';
        data.hProperties = {
          className: ['aside', `aside-${node.name}`],
          // aria-label 给屏幕阅读器用，提升无障碍
          ariaLabel: config.title,
          // 把 type / title / icon 存到 data 属性，方便 CSS 或 JS 读取
          dataAsideType: node.name,
          dataAsideTitle: config.title,
          dataAsideIcon: config.icon,
        };
      }
    });
  };
}
