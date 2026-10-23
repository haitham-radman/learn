import { normalizeText, tokenize } from './normalize.mjs';

const FILTERS = new Set(['any', 'title', 'body', 'section']);

const trimQuotes = value =>
  value.length > 1 && value.startsWith('"') && value.endsWith('"')
    ? value.slice(1, -1)
    : value;

// A word is only a filter name when followed by ':' outside quotes, so
// 'https://example.com' stays plain text.
const splitQuery = query => {
  const parts = [];
  let inQuote = false;
  let inFilterValue = false;
  let filter = '_';
  let current = '';

  const push = () => {
    parts.push({ filter, raw: current });
    filter = '_';
    current = '';
  };

  for (const char of query) {
    if (char === '"') {
      current += char;
      if (inQuote) {
        push();
      }
      inQuote = !inQuote;
      continue;
    }

    if (char === ' ' && !inQuote) {
      inFilterValue = false;
      if (current) {
        push();
      }
      continue;
    }

    if (
      char === ':' &&
      !inQuote &&
      !inFilterValue &&
      FILTERS.has(current.replace(/^-/, '').toLowerCase())
    ) {
      filter = current.toLowerCase();
      current = '';
      inFilterValue = true;
      continue;
    }

    current += char;
  }

  // An unclosed quote is a phrase, so results appear while the user types.
  if (inQuote) {
    current += '"';
  }
  if (current) {
    push();
  }

  return parts;
};

const globToRegExp = glob =>
  new RegExp(
    `^${glob.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`
  );

/**
 * @typedef {Object} Term
 * @property {'text' | 'title' | 'body' | 'section'} field `text` searches title and body.
 * @property {string[]} tokens Normalised words, matched as a phrase when there is more than one.
 * @property {boolean} prefix The last token ends with `*`.
 * @property {boolean} negated
 * @property {RegExp} [pattern] Section filters only.
 */

/**
 * @param {string} query
 * @returns {{ terms: Term[], any: boolean }}
 */
export const parseQuery = query => {
  const terms = [];
  let any = false;

  for (const part of splitQuery(query.trim().replace(/\s/g, ' '))) {
    let { filter, raw } = part;
    let negated = false;

    if (filter.startsWith('-')) {
      negated = true;
      filter = filter.slice(1);
    } else if (filter === '_' && raw.startsWith('-')) {
      negated = true;
      raw = raw.slice(1);
    }

    const value = trimQuotes(raw);

    if (filter === 'any') {
      if (negated || (value !== '0' && value !== '1')) {
        throw new Error('The value of filter "any" must be "0" or "1"');
      }
      any = value === '1';
      continue;
    }

    if (filter === 'section') {
      if (value) {
        terms.push({
          field: 'section',
          tokens: [],
          prefix: false,
          negated,
          pattern: globToRegExp(normalizeText(value)),
        });
      }
      continue;
    }

    const tokens = tokenize(value).map(token => token.term);
    if (!tokens.length) {
      continue;
    }
    const prefix = value.endsWith('*');

    if (filter === 'title' || filter === 'body') {
      // Quotes make no phrase here: title:"a b" means title:a title:b.
      tokens.forEach((token, i) =>
        terms.push({
          field: filter,
          tokens: [token],
          prefix: prefix && i === tokens.length - 1,
          negated,
        })
      );
    } else {
      terms.push({ field: 'text', tokens, prefix, negated });
    }
  }

  return { terms, any };
};
