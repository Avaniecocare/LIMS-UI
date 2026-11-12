/**
 * Renders the assistant's answer. The answer is untrusted text: everything is escaped first, then only a small
 * Markdown subset is turned into markup (paragraphs, numbered and bulleted lists, bold, inline code, and links to
 * pages of this help site). Raw HTML never reaches the page.
 */
const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Only links into this help site are kept; anything else (other sites, javascript:, data:) is shown as plain text. */
export function safeHelpLink(href: string, origin: string): string | null {
  try {
    const url = new URL(href, origin);
    if (url.origin !== origin || !url.pathname.startsWith('/help/')) return null;
    return url.pathname + url.hash;
  } catch {
    return null;
  }
}

function inline(text: string, origin: string): string {
  let out = escape(text);
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // [label](href): the href was escaped above, so unescape it only to check it.
  out = out.replace(/\[([^\]]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)/g, (_, label: string, href: string) => {
    const safe = safeHelpLink(href.replace(/&amp;/g, '&'), origin);
    return safe ? `<a href="${escape(safe)}">${label}</a>` : label;
  });
  return out;
}

export function renderAnswer(markdown: string, origin: string): string {
  const blocks: string[] = [];
  let list: { tag: 'ol' | 'ul'; items: string[] } | null = null;
  const flush = () => {
    if (list) blocks.push(`<${list.tag}>${list.items.map((i) => `<li>${i}</li>`).join('')}</${list.tag}>`);
    list = null;
  };
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) blocks.push(`<p>${inline(para.join(' '), origin)}</p>`);
    para = [];
  };
  for (const raw of markdown.split('\n')) {
    const line = raw.trim();
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (numbered || bullet) {
      flushPara();
      const tag = numbered ? 'ol' : 'ul';
      if (!list || list.tag !== tag) {
        flush();
        list = { tag, items: [] };
      }
      list.items.push(inline((numbered ?? bullet)![1], origin));
    } else if (!line) {
      flushPara();
      flush();
    } else {
      flush();
      para.push(line.replace(/^#+\s*/, ''));
    }
  }
  flushPara();
  flush();
  return blocks.join('');
}
