import { buildIndex, search } from './index.mjs';

const toDocument = ({ title, path, siteSection, snippet }) => ({
  title,
  description: snippet.text.replace(/\s+/g, ' ').trim(),
  href: `${path}.html`,
  siteSection,
});

/**
 * Wraps the search module in the part of Orama's client interface that
 * `@orama/ui` calls: `search({ term, limit, where })` resolving to
 * `{ hits, count, facets }`, with hits grouped by `document.siteSection`.
 *
 * @param {() => Promise<import('./index.mjs').Page[]>} loadPages Called on the first search, and again after a failure.
 */
export const createOramaClient = loadPages => {
  let index = null;

  const ensureIndex = () => {
    index ??= loadPages().then(buildIndex);
    // Retry on the next search instead of caching the failure.
    index.catch(() => (index = null));
    return index;
  };

  return {
    async search({ term = '', limit = 10, where = {} }) {
      let results;
      try {
        results = search(await ensureIndex(), term, { limit: Infinity });
      } catch {
        // A malformed query or a missing index shows "no results".
        results = [];
      }

      if (where.siteSection) {
        results = results.filter(r => r.siteSection === where.siteSection);
      }

      const values = {};
      for (const { siteSection } of results) {
        values[siteSection] = (values[siteSection] ?? 0) + 1;
      }

      return {
        count: results.length,
        hits: results.slice(0, limit).map(result => ({
          id: result.path,
          score: result.score,
          document: toDocument(result),
        })),
        facets: {
          siteSection: {
            count: Object.keys(values).length,
            values: Object.fromEntries(
              Object.entries(values).sort((a, b) => b[1] - a[1])
            ),
          },
        },
      };
    },
  };
};
