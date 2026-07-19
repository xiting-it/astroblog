import { visit } from 'unist-util-visit';

/**
 * Custom remark plugin to convert :::container syntax to blockquotes with classes
 * Syntax:
 * :::note
 * content
 * :::
 *
 * Supported types: note, warning, danger, info, primary, success, flat
 */
export function customBlockquotes() {
  return (tree) => {
    visit(tree, (node) => {
      // Check if node is a container directive
      if (
        node.type === 'containerDirective' ||
        node.type === 'leafDirective' ||
        node.type === 'textDirective'
      ) {
        const data = node.data || (node.data = {});

        // Convert to blockquote with class
        data.hName = 'blockquote';
        data.hProperties = {
          className: [node.name]
        };
      }
    });
  };
}

/**
 * Custom remark plugin to convert inline label syntax to spans with classes
 * Syntax: [!labelblue]@content@, [!labelgrey]@content@, etc.
 * Supported colors: blue, grey, pink, yellow, green, orange
 */
export function customInlineLabels() {
  return (tree) => {
    visit(tree, 'text', (node, index, parent) => {
      if (!node.value || typeof index !== 'number') return;

      const parts = [];
      let lastIndex = 0;
      const regex = /\[!(labelblue|labelgrey|labelpink|labelyellow|labelgreen|labelorange)\]@([^@]+)@/g;
      let match;

      while ((match = regex.exec(node.value)) !== null) {
        // Add text before the label
        if (match.index > lastIndex) {
          parts.push({
            type: 'text',
            value: node.value.slice(lastIndex, match.index)
          });
        }

        // Add the label as a span with class (using hName/hProperties for remark)
        const labelNode = {
          type: 'text',
          value: match[2],
          data: {
            hName: 'span',
            hProperties: {
              className: [match[1]]
            }
          }
        };
        parts.push(labelNode);

        lastIndex = match.index + match[0].length;
      }

      // Add remaining text
      if (lastIndex < node.value.length) {
        parts.push({
          type: 'text',
          value: node.value.slice(lastIndex)
        });
      }

      // Replace the original node with the new parts
      if (parts.length > 0) {
        parent.children.splice(index, 1, ...parts);
        return index + parts.length;
      }
    });
  };
}
