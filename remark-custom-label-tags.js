import { visit } from 'unist-util-visit';

/**
 * Custom remark plugin to convert { %label@content% } syntax to inline spans with classes
 * Syntax:
 * { %label@content% }
 * { %labelred@content% }
 * { %labelinfo@content% }
 *
 * Becomes:
 * <span class="label">content</span>
 */
export function customLabelTags() {
  return (tree) => {
    visit(tree, 'text', (node) => {
      const text = node.value;
      // Regex to match { %label@content% } format
      const regex = /\{%\s*(label|labelred|labelinfo)@([^}%}]+)%\}/g;

      if (regex.test(text)) {
        const parts = [];
        let lastIndex = 0;
        let match;

        // Find all matches
        while ((match = regex.exec(text)) !== null) {
          // Add text before the match
          if (match.index > lastIndex) {
            parts.push({
              type: 'text',
              value: text.slice(lastIndex, match.index)
            });
          }

          // Add the matched element as HTML (using raw type for direct HTML)
          const labelType = match[1];
          const content = match[2];
          parts.push({
            type: 'html',
            value: `<span class="${labelType}">${content}</span>`
          });

          lastIndex = match.index + match[0].length;
        }

        // Add remaining text
        if (lastIndex < text.length) {
          parts.push({
            type: 'text',
            value: text.slice(lastIndex)
          });
        }

        // Return the parts to replace the original node
        return parts;
      }
    });
  };
}
