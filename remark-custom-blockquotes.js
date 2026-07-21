import { visit } from 'unist-util-visit';

/**
 * Starlight 风格的 Aside 容器
 *
 * 支持两种语法：
 * 1. Markdown directive：:::note / :::tip / :::caution / :::danger
 * 2. Obsidian / GitHub callout：> [!note] / > [!tip] / > [!caution] / > [!danger]
 *
 * 两种语法都渲染成 <aside class="aside aside-xxx"> + 图标 + 标题 + 内容
 */

const ASIDE_TYPES = {
  note: { title: 'Note', icon: 'fa-solid fa-circle-info' },
  tip: { title: 'Tip', icon: 'fa-solid fa-lightbulb' },
  caution: { title: 'Caution', icon: 'fa-solid fa-triangle-exclamation' },
  danger: { title: 'Danger', icon: 'fa-solid fa-circle-exclamation' },
};

// 匹配 [!note] 开头
const CALLOUT_REGEX = /^\[!(note|tip|caution|danger)\]\s*\n?/i;

// 应用 aside 属性
function applyAside(node, asideType) {
  const config = ASIDE_TYPES[asideType];
  if (!config) return false;
  const data = node.data || (node.data = {});
  data.hName = 'aside';
  data.hProperties = {
    className: ['aside', `aside-${asideType}`],
    ariaLabel: config.title,
    dataAsideType: asideType,
    dataAsideTitle: config.title,
    dataAsideIcon: config.icon,
  };
  return true;
}

// 手动递归遍历，找 blockquote 节点并检查是否是 callout
function processCallouts(node) {
  if (!node) return;
  
  if (node.children && Array.isArray(node.children)) {
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      
      // 检查是否是 blockquote + callout
      if (child.type === 'blockquote') {
        const firstChild = child.children?.[0];
        if (firstChild?.type === 'paragraph') {
          const textNode = firstChild.children?.[0];
          if (textNode?.type === 'text') {
            const match = textNode.value.match(CALLOUT_REGEX);
            if (match) {
              const calloutType = match[1].toLowerCase();
              // 删除 [!note] 标记
              textNode.value = textNode.value.slice(match[0].length);
              // 如果 paragraph 为空，移除
              if (!textNode.value.trim() && firstChild.children.length === 1) {
                child.children.shift();
              }
              // 应用 aside
              applyAside(child, calloutType);
            }
          }
        }
      }
      
      // 递归处理子节点
      processCallouts(child);
    }
  }
}

export function customBlockquotes() {
  return (tree) => {
    // 1. 处理 directive 语法：:::note
    visit(tree, (node) => {
      if (
        node.type === 'containerDirective' ||
        node.type === 'leafDirective' ||
        node.type === 'textDirective'
      ) {
        if (ASIDE_TYPES[node.name]) {
          applyAside(node, node.name);
        }
      }
    });
    
    // 2. 处理 Obsidian callout 语法：> [!note]
    // 用手动递归遍历，不依赖 visit（避免 Astro 内部行为的干扰）
    processCallouts(tree);
  };
}
