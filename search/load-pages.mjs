import { readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

const FRONTMATTER = /^---\n[\s\S]*?\n---\n/;
const HEADING = /^# (.+)\n?/m;

// Link targets and heading marks are not what a reader searches for, and a
// URL in the index would match a query like "learn" on every page that links.
// Link text may hold one level of brackets, as in [`[Non]BlockingCall`](url).
const LINK_TEXT = String.raw`((?:[^\[\]]|\[[^\]]*\])*)`;

const toPlainText = markdown =>
  markdown
    .replace(/^\[[^\]]+\]:.*$/gm, '')
    .replace(new RegExp(String.raw`!?\[${LINK_TEXT}\]\([^)]*\)`, 'g'), '$1')
    .replace(new RegExp(String.raw`\[${LINK_TEXT}\]\[[^\]]*\]`, 'g'), '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*/g, '');

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
        path: `/${file.replace(/\.md$/, '')}`,
        title: content.match(HEADING)?.[1] ?? basename(file, '.md'),
        section: file.includes('/') ? file.split('/')[0] : '',
        body: toPlainText(content.replace(HEADING, '')),
      };
    })
  );
};
