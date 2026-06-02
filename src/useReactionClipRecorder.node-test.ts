import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createClipFileName, formatBytes } from './useReactionClipRecorder.ts';

describe('clip recorder helpers', () => {
  it('creates readable video-only clip filenames', () => {
    const fileName = createClipFileName({
      category: 'happy',
      createdAt: new Date('2026-06-02T12:34:56.789Z'),
      includesAudio: false
    });

    assert.equal(fileName, 'meme-react-happy-2026-06-02-12-34-56.webm');
  });

  it('marks clip filenames when microphone audio is included', () => {
    const fileName = createClipFileName({
      category: 'we-are-cooked',
      createdAt: new Date('2026-06-02T12:34:56.789Z'),
      includesAudio: true
    });

    assert.equal(fileName, 'meme-react-we-are-cooked-2026-06-02-12-34-56-mic.webm');
  });

  it('formats clip sizes for preview metadata', () => {
    assert.equal(formatBytes(64), '1 KB');
    assert.equal(formatBytes(1536), '2 KB');
    assert.equal(formatBytes(2.5 * 1024 * 1024), '2.5 MB');
  });
});
