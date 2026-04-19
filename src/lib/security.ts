import DOMPurify from 'isomorphic-dompurify';

export function sanitizeMarkdown(rawString: string): string {
  if (!rawString) return '';
  return DOMPurify.sanitize(rawString, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
      'nl', 'li', 'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'div',
      'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre', 'span'
    ],
    ALLOWED_ATTR: ['href', 'name', 'target', 'class'],
  });
}
