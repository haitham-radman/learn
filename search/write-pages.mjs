import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import config from '../doc-kit.config.mjs';
import site from '../site.json' with { type: 'json' };
import { loadPages } from './load-pages.mjs';

const root = join(import.meta.dirname, '..');

// The sidebar names each section, and its links say which folder it is.
const sectionNames = new Map(
  site.sidebar.flatMap(group => {
    const [, , folder] = group.items[0].link.split('/');
    return folder ? [[folder, group.groupName]] : [];
  })
);

const titleCase = text =>
  text.replace(
    /(^|-)([a-z])/g,
    (_, dash, letter) => `${dash && ' '}${letter.toUpperCase()}`
  );

const pages = (await loadPages(join(root, 'pages'))).map(page => ({
  ...page,
  siteSection:
    sectionNames.get(page.section) ?? (titleCase(page.section) || 'Learn'),
}));

const output = join(root, config.global.output);
await mkdir(output, { recursive: true });
await writeFile(join(output, 'search-pages.json'), JSON.stringify(pages));
console.log(`Wrote ${pages.length} pages to ${output}/search-pages.json`);
