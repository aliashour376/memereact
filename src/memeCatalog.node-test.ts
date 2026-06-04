import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { localMemeCatalog } from './generated/memeCatalog.ts';

describe('localMemeCatalog', () => {
  it('contains one initial meme in each required category', () => {
    assert.deepEqual(
      Object.fromEntries(Object.entries(localMemeCatalog).map(([category, assets]) => [category, assets.length])),
      {
        'absolute-cinema': 1,
        'we-are-cooked': 1,
        'ah-hell-nah': 1,
        thinking: 1,
        happy: 1,
        'lets-larp': 1,
        'no-idea-cuh': 1,
        son: 1,
        tf: 1,
        zoltraak: 1
      }
    );
  });

  it('maps each meme-native category to its matching file', () => {
    assert.match(localMemeCatalog['we-are-cooked'][0]?.src ?? '', /we%20are%20cooked\.jpg$/);
    assert.match(localMemeCatalog.happy?.[0]?.src ?? '', /happy\.jpg$/);
    assert.match(localMemeCatalog['lets-larp']?.[0]?.src ?? '', /lets-larp\.png$/);
    assert.match(localMemeCatalog['no-idea-cuh']?.[0]?.src ?? '', /no-idea-cuh\.png$/);
    assert.match(localMemeCatalog.son?.[0]?.src ?? '', /son\.png$/);
    assert.match(localMemeCatalog.tf?.[0]?.src ?? '', /tf\.jpg$/);
    assert.match(localMemeCatalog.zoltraak?.[0]?.src ?? '', /zoltraak\.png$/);
  });
});
