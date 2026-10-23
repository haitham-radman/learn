import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { buildIndex, search } from './index.mjs';
import { loadPages } from './load-pages.mjs';

const usage = 'Usage: npm run search -- [--limit 10] [--json] -- <query>';

let parsed;
try {
  parsed = parseArgs({
    options: {
      limit: { type: 'string', default: '10' },
      json: { type: 'boolean', default: false },
    },
    allowPositionals: true,
  });
} catch (error) {
  // A query such as -draft is read as a flag unless it follows a bare `--`.
  console.error(`${error.message}\n${usage}`);
  process.exit(1);
}

const { values, positionals } = parsed;
const query = positionals.join(' ');
const limit = Number(values.limit);
if (!query || !Number.isInteger(limit) || limit < 1) {
  console.error(usage);
  process.exit(1);
}

const index = buildIndex(
  await loadPages(join(import.meta.dirname, '..', 'pages'))
);

let results;
try {
  results = search(index, query, { limit });
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

if (values.json) {
  console.log(JSON.stringify(results, null, 2));
} else {
  for (const { score, url, title, snippet } of results) {
    console.log(`${score.toFixed(2).padStart(6)}  ${url}  ${title}`);
    console.log(`        ${snippet.text.replace(/\s+/g, ' ').trim()}`);
  }
}
