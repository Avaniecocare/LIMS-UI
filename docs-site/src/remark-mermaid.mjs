import { visit } from 'unist-util-visit';

/** ```mermaid blocks become <pre class="mermaid">, drawn in the browser (see Footer.astro). */
export function remarkMermaid() {
  return (tree) => {
    visit(tree, 'code', (node, index, parent) => {
      if (node.lang !== 'mermaid' || !parent || index === undefined) return;
      const escaped = node.value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      parent.children[index] = { type: 'html', value: `<pre class="mermaid" aria-label="Diagram">${escaped}</pre>` };
    });
  };
}
