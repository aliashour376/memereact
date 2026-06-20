import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createLocalMemeSource, pickRandomMeme } from './memeLibrary.ts';
import type { MemeCatalog } from './memeTypes.ts';

const catalog: MemeCatalog = {
  'absolute-cinema': [
    { id: 'absolute-cinema-1', category: 'absolute-cinema', src: '/absolute-cinema/one.jpg' },
    { id: 'absolute-cinema-2', category: 'absolute-cinema', src: '/absolute-cinema/two.jpg' }
  ],
  'we-are-cooked': [
    { id: 'we-are-cooked-1', category: 'we-are-cooked', src: '/we-are-cooked/one.jpg' }
  ],
  'ah-hell-nah': [],
  thinking: [],
  happy: []
};

describe('memeLibrary', () => {
  it('selects only from the requested category', () => {
    const meme = pickRandomMeme(catalog, 'absolute-cinema', () => 0.99);

    assert.equal(meme?.category, 'absolute-cinema');
    assert.equal(meme?.id, 'absolute-cinema-2');
  });

  it('returns null when a category has no memes', () => {
    assert.equal(pickRandomMeme(catalog, 'thinking', () => 0), null);
  });

  it('exposes the same selection behavior through the local meme source', async () => {
    const source = createLocalMemeSource(catalog, () => 0);

    assert.equal((await source.getRandom('we-are-cooked'))?.id, 'we-are-cooked-1');
  });
});
