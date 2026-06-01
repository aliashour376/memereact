import type { MemeAsset, MemeCatalog, MemeCategory, MemeSource } from './memeTypes.ts';

export function pickRandomMeme(
  catalog: MemeCatalog,
  category: MemeCategory,
  random: () => number = Math.random
): MemeAsset | null {
  const assets = catalog[category];
  if (assets.length === 0) {
    return null;
  }

  const index = Math.min(assets.length - 1, Math.floor(random() * assets.length));
  return assets[index] ?? null;
}

export function createLocalMemeSource(
  catalog: MemeCatalog,
  random: () => number = Math.random
): MemeSource {
  return {
    async getRandom(category) {
      return pickRandomMeme(catalog, category, random);
    }
  };
}
