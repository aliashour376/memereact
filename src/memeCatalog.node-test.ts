import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { localMemeCatalog } from './generated/memeCatalog.ts';
import { memeCategories } from './memeTypes.ts';

describe('localMemeCatalog', () => {
  it('ships exactly the five stable reactions', () => {
    assert.deepEqual(memeCategories, [
      'absolute-cinema',
      'we-are-cooked',
      'ah-hell-nah',
      'thinking',
      'happy'
    ]);
  });

  it('contains one initial meme in each required category', () => {
    assert.deepEqual(
      Object.fromEntries(Object.entries(localMemeCatalog).map(([category, assets]) => [category, assets.length])),
      {
        'absolute-cinema': 1,
        'we-are-cooked': 1,
        'ah-hell-nah': 1,
        thinking: 1,
        happy: 1
      }
    );
  });

  it('maps each meme-native category to its matching file', () => {
    assert.match(localMemeCatalog['we-are-cooked'][0]?.src ?? '', /we%20are%20cooked\.jpg$/);
    assert.match(localMemeCatalog.happy?.[0]?.src ?? '', /happy\.jpg$/);
  });
});
