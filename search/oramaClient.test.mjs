import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { createOramaClient } from './oramaClient.mjs';

const pages = [
  {
    url: '/learn/modules/streams',
    path: '/modules/streams',
    title: 'Streams guide',
    section: 'modules',
    siteSection: 'Modules',
    body: 'Streams are arrays over time.',
  },
  {
    url: '/learn/test-runner/mocking',
    path: '/test-runner/mocking',
    title: 'Mocking',
    section: 'test-runner',
    siteSection: 'Test Runner',
    body: 'Mock streams in tests.\n\nUse `mock.fn()`.',
  },
  {
    url: '/learn/http/anatomy',
    path: '/http/anatomy',
    title: 'Anatomy',
    section: 'http',
    siteSection: 'HTTP',
    body: 'Requests and responses.',
  },
];

describe('createOramaClient', () => {
  test('answers in the shape @orama/ui reads', async () => {
    const client = createOramaClient(async () => pages);
    const result = await client.search({ term: 'streams' });

    assert.equal(result.count, 2);
    assert.deepEqual(result.hits.map(h => h.document.href).sort(), [
      '/modules/streams.html',
      '/test-runner/mocking.html',
    ]);
    assert.deepEqual(Object.keys(result.hits[0].document).sort(), [
      'description',
      'href',
      'siteSection',
      'title',
    ]);
    assert.deepEqual(result.facets.siteSection.values, {
      Modules: 1,
      'Test Runner': 1,
    });
  });

  test('collapses whitespace in descriptions', async () => {
    const client = createOramaClient(async () => pages);
    const { hits } = await client.search({ term: 'mock' });

    assert.equal(
      hits[0].document.description,
      'Mock streams in tests. Use `mock.fn()`.'
    );
  });

  test('where.siteSection narrows hits and count together', async () => {
    const client = createOramaClient(async () => pages);
    const result = await client.search({
      term: 'streams',
      where: { siteSection: 'Modules' },
    });

    assert.equal(result.count, 1);
    assert.equal(result.hits[0].document.title, 'Streams guide');
  });

  test('limit caps hits but not count', async () => {
    const client = createOramaClient(async () => pages);
    const result = await client.search({ term: 'streams', limit: 1 });

    assert.equal(result.hits.length, 1);
    assert.equal(result.count, 2);
  });

  test('an empty or malformed query is no results, not an error', async () => {
    const client = createOramaClient(async () => pages);

    for (const term of ['', '   ', 'any:2']) {
      const result = await client.search({ term });
      assert.equal(result.count, 0);
      assert.deepEqual(result.hits, []);
    }
  });

  test('loads once, and retries after a failed load', async () => {
    let calls = 0;
    const client = createOramaClient(async () => {
      calls++;
      if (calls === 1) {
        throw new Error('offline');
      }
      return pages;
    });

    assert.equal((await client.search({ term: 'streams' })).count, 0);
    assert.equal((await client.search({ term: 'streams' })).count, 2);
    await client.search({ term: 'http' });
    assert.equal(calls, 2);
  });
});
