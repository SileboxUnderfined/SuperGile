// YouGile keeps task descriptions as HTML, Super Productivity keeps notes as
// Markdown. These converters cover the formatting people actually use in
// descriptions (paragraphs, line breaks, lists, bold, italic, links); anything
// else is reduced to its text.

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

const decodeEntities = (text: string): string =>
  text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : whole;
    }
    return ENTITIES[code.toLowerCase()] ?? whole;
  });

export const htmlToMarkdown = (html: string | undefined): string => {
  if (!html) {
    return '';
  }
  const md = html
    .replace(/\r\n?/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|ul|ol)>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<(strong|b)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi, '**$3**')
    .replace(/<(em|i)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi, '_$3_')
    .replace(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, text: string) =>
      text.trim() && text.trim() !== href ? `[${text}](${href})` : href,
    )
    .replace(/<[^>]+>/g, '');
  return decodeEntities(md)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Plain Markdown text to simple HTML: paragraphs, line breaks, bold, italic and links. */
export const markdownToHtml = (md: string | undefined): string => {
  if (!md || !md.trim()) {
    return '';
  }
  const inline = (line: string): string =>
    escapeHtml(line)
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/(^|[\s(])_([^_]+)_(?=$|[\s).,!?])/g, '$1<i>$2</i>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
  return md
    .replace(/\r\n?/g, '\n')
    .trim()
    .split(/\n{2,}/)
    .map((para) => `<p>${para.split('\n').map(inline).join('<br>')}</p>`)
    .join('');
};
