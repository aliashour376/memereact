import type { MemeCatalog } from '../memeTypes.ts';

const basePath = import.meta.env?.BASE_URL ?? '/';
const assetSrc = (path: string) => `${basePath}${path}`;

export const localMemeCatalog: MemeCatalog = {
  'absolute-cinema': [
    { id: 'absolute-cinema-absolute-cinema', category: 'absolute-cinema', src: assetSrc('memes/absolute-cinema/absolute%20cinema.jpg') },
  ],
  'we-are-cooked': [
    { id: 'we-are-cooked-we-are-cooked', category: 'we-are-cooked', src: assetSrc('memes/we-are-cooked/we%20are%20cooked.jpg') },
  ],
  'ah-hell-nah': [
    { id: 'ah-hell-nah-ah-hell-nah', category: 'ah-hell-nah', src: assetSrc('memes/ah-hell-nah/ah%20hell%20nah.jpg') },
  ],
  'thinking': [
    { id: 'thinking-thinks', category: 'thinking', src: assetSrc('memes/thinking/thinks.jpg') },
  ],
  'happy': [
    { id: 'happy-happy', category: 'happy', src: assetSrc('memes/happy/happy.jpg') },
  ],
  'lets-larp': [
    { id: 'lets-larp-lets-larp', category: 'lets-larp', src: assetSrc('memes/lets-larp/lets-larp.png') },
  ],
  'no-idea-cuh': [
    { id: 'no-idea-cuh-no-idea-cuh', category: 'no-idea-cuh', src: assetSrc('memes/no-idea-cuh/no-idea-cuh.png') },
  ],
  'son': [
    { id: 'son-son', category: 'son', src: assetSrc('memes/son/son.png') },
  ],
  'tf': [
    { id: 'tf-tf', category: 'tf', src: assetSrc('memes/tf/tf.jpg') },
  ],
  'zoltraak': [
    { id: 'zoltraak-zoltraak', category: 'zoltraak', src: assetSrc('memes/zoltraak/zoltraak.png') },
  ],
};
