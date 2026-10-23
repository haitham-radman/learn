import { readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

const FRONTMATTER = /^---\n[\s\S]*?\n---\n/;
const HEADING = /^# (.+)\n?/m;

/**
 * @param {string} dir Folder holding the Markdown pages.
 * @returns {Promise<import('./index.mjs').Page[]>}
 */
export const loadPages = async dir => {
  const files = (await readdir(dir, { recursive: true }))
    .map(file => file.split('\\').join('/'))
    .filter(file => file.endsWith('.md'))
    .sort();

  return Promise.all(
    files.map(async file => {
      const content = (await readFile(join(dir, file), 'utf8'))
        .replace(/\r\n/g, '\n')
        .replace(FRONTMATTER, '');
      const slug = file.replace(/\.md$/, '').replace(/(^|\/)index$/, '');

      return {
        url: ['/learn', slug].filter(Boolean).join('/'),
        title: content.match(HEADING)?.[1] ?? basename(file, '.md'),
        section: file.includes('/') ? file.split('/')[0] : '',
        body: content.replace(HEADING, ''),
      };
    })
  );
};
