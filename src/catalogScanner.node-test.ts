import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { createCatalogModule, scanMemeFolders } from '../scripts/catalog-utils.mjs';

describe('scanMemeFolders', () => {
  it('discovers only image files and sorts them inside each category', () => {
    const root = mkdtempSync(join(tmpdir(), 'memereact-catalog-'));
    mkdirSync(join(root, 'absolute-cinema'));
    writeFileSync(join(root, 'absolute-cinema', 'b.png'), '');
    writeFileSync(join(root, 'absolute-cinema', 'a.jpg'), '');
    writeFileSync(join(root, 'absolute-cinema', 'notes.txt'), '');

    assert.deepEqual(scanMemeFolders(root), {
      'absolute-cinema': ['a.jpg', 'b.png']
    });
  });
});

describe('createCatalogModule', () => {
  it('percent-encodes apostrophes in generated asset paths', () => {
    const moduleSource = createCatalogModule({
      happy: ["that's happy.jpg"]
    });

    assert.match(moduleSource, /src: assetSrc\('memes\/happy\/that%27s%20happy\.jpg'\)/);
  });
});
