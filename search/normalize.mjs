export const normalizeText = text =>
  text
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .normalize('NFC')
    .toLowerCase();

// Offsets refer to the original text, so snippets can highlight what the
// reader actually sees.
export const tokenize = text =>
  Array.from(text.matchAll(/[\p{L}\p{N}]+/gu), match => ({
    term: normalizeText(match[0]),
    start: match.index,
    end: match.index + match[0].length,
  }));
