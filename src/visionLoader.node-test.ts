import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { loadWithTimeout } from './visionLoader.ts';

describe('loadWithTimeout', () => {
  it('returns the loaded value when the loader resolves in time', async () => {
    const result = await loadWithTimeout(async () => 'ready', 50, 'timed out');

    assert.equal(result, 'ready');
  });

  it('rejects with a useful timeout error when the loader stalls', async () => {
    await assert.rejects(
      () => loadWithTimeout(() => new Promise<string>(() => {}), 5, 'Vision models took too long to load.'),
      /Vision models took too long to load\./
    );
  });
});
