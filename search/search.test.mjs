import assert from 'node:assert/strict';
import { join } from 'node:path';
import { describe, test } from 'node:test';

import { buildIndex, search } from './index.mjs';
import { loadPages } from './load-pages.mjs';
import { normalizeText, tokenize } from './normalize.mjs';
import { parseQuery } from './parse-query.mjs';

const pages = [
  {
    url: '/learn/modules/streams',
    title: 'Streams guide',
    section: 'modules',
    body: 'Streams are arrays over time. Use backpressure with streams.',
  },
  {
    url: '/learn/asynchronous-work/event-loop',
    title: 'Event loop',
    section: 'asynchronous-work',
    body: 'The event loop schedules timers, then runs callbacks. Streams use callbacks. It is a long page about many things that mention callbacks only in passing.',
  },
  {
    url: '/learn/misc/cafe',
    title: 'Café notes',
    section: 'misc',
    body: 'A naïve résumé about timers and streaming.',
  },
];
const index = buildIndex(pages);
const urls = query => search(index, query).map(r => r.url);

describe('search', () => {
  test('normalisation drops case and diacritics but keeps offsets', () => {
    assert.equal(normalizeText('Café NAÏVE'), 'cafe naive');
    assert.deepEqual(tokenize('Un café!'), [
      { term: 'un', start: 0, end: 2 },
      { term: 'cafe', start: 3, end: 7 },
    ]);
  });

  for (const [query, expected] of [
    [
      'foo bar',
      [
        ['text', ['foo']],
        ['text', ['bar']],
      ],
    ],
    ['"foo bar"', [['text', ['foo', 'bar']]]],
    ['this-phrase', [['text', ['this', 'phrase']]]],
    [
      'title:"a b"',
      [
        ['title', ['a']],
        ['title', ['b']],
      ],
    ],
    ['unknown:thing', [['text', ['unknown', 'thing']]]],
    ['"foo ba', [['text', ['foo', 'ba']]]],
  ]) {
    test(`parses ${query}`, () => {
      const { terms } = parseQuery(query);
      assert.deepEqual(
        terms.map(t => [t.field, t.tokens]),
        expected
      );
    });
  }

  test('parses negation, prefix, section and any', () => {
    const { terms, any } = parseQuery(
      '-foo -title:bar baz* -section:mod* any:1'
    );
    assert.equal(any, true);
    assert.deepEqual(
      terms.map(t => [t.field, t.negated, t.prefix]),
      [
        ['text', true, false],
        ['title', true, false],
        ['text', false, true],
        ['section', true, false],
      ]
    );
    assert.ok(terms[3].pattern.test('modules'));
    assert.ok(!terms[3].pattern.test('http'));
  });

  test('rejects a bad any value', () => {
    assert.throws(() => parseQuery('any:2'), /must be "0" or "1"/);
  });

  test('requires every term unless any:1', () => {
    assert.deepEqual(urls('streams callbacks'), [pages[1].url]);
    assert.equal(urls('any:1 backpressure callbacks').length, 2);
  });

  test('excludes negated terms', () => {
    assert.ok(!urls('streams -callbacks').includes(pages[1].url));
    assert.deepEqual(urls('-streams'), []);
  });

  test('matches phrases only when words are adjacent', () => {
    assert.deepEqual(urls('"event loop"'), [pages[1].url]);
    assert.deepEqual(urls('"loop event"'), []);
  });

  test('expands a trailing * as a prefix', () => {
    assert.deepEqual(urls('stream*').sort(), pages.map(p => p.url).sort());
    assert.deepEqual(urls('streamin*'), [pages[2].url]);
  });

  test('searches without regard to diacritics', () => {
    assert.deepEqual(urls('naive resume'), [pages[2].url]);
    assert.deepEqual(urls('cafe'), [pages[2].url]);
  });

  test('field filters limit where a word may match', () => {
    assert.deepEqual(urls('title:streams'), [pages[0].url]);
    assert.deepEqual(urls('body:loop'), [pages[1].url]);
    assert.deepEqual(urls('title:backpressure'), []);
  });

  test('section filters narrow results and may stand alone', () => {
    assert.deepEqual(urls('streams section:modules'), [pages[0].url]);
    assert.deepEqual(
      urls('streams -section:modules').includes(pages[0].url),
      false
    );
    assert.deepEqual(urls('section:misc'), [pages[2].url]);
  });

  test('ranks the shorter, denser page first', () => {
    const [first, second] = search(index, 'streams');
    assert.equal(first.url, pages[0].url);
    assert.ok(first.score > second.score);
  });

  test('snippet ranges point at the matched text', () => {
    const [{ snippet }] = search(index, 'backpressure');
    const [[start, end]] = snippet.ranges;
    assert.equal(snippet.text.slice(start, end), 'backpressure');
  });

  test('honours limit and an empty query', () => {
    assert.equal(search(index, 'stream*', { limit: 1 }).length, 1);
    assert.deepEqual(search(index, '   '), []);
  });
});

describe('search over pages/', () => {
  test('finds the streams guide and section pages', async () => {
    const real = buildIndex(
      await loadPages(join(import.meta.dirname, '..', 'pages'))
    );
    assert.ok(
      search(real, 'streams', { limit: 5 }).some(
        r => r.url === '/learn/modules/how-to-use-streams'
      )
    );
    assert.equal(
      search(real, 'mocking section:test-runner')[0].url,
      '/learn/test-runner/mocking'
    );
  });
});
