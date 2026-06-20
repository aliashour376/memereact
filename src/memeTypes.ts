export const memeCategories = [
  'absolute-cinema',
  'we-are-cooked',
  'ah-hell-nah',
  'thinking',
  'happy'
] as const;

export type MemeCategory = (typeof memeCategories)[number];

export interface MemeAsset {
  id: string;
  category: MemeCategory;
  src: string;
}

export type MemeCatalog = Record<MemeCategory, MemeAsset[]>;

export interface MemeSource {
  getRandom: (category: MemeCategory) => Promise<MemeAsset | null>;
}
