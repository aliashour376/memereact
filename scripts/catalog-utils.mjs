import { readdirSync } from 'node:fs';
import { extname, join } from 'node:path';

export const supportedCategories = [
  'absolute-cinema',
  'we-are-cooked',
  'ah-hell-nah',
  'thinking',
  'happy'
];

const supportedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

export function scanMemeFolders(rootDir) {
  const catalog = {};

  for (const entry of readdirSync(rootDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const files = readdirSync(join(rootDir, entry.name), { withFileTypes: true })
      .filter((file) => file.isFile() && supportedExtensions.has(extname(file.name).toLowerCase()))
      .map((file) => file.name)
      .sort((a, b) => a.localeCompare(b));

    catalog[entry.name] = files;
  }

  return catalog;
}

export function createCatalogModule(scannedCatalog) {
  const lines = [
    "import type { MemeCatalog } from '../memeTypes.ts';",
    '',
    'export const localMemeCatalog: MemeCatalog = {'
  ];

  for (const category of supportedCategories) {
    const files = scannedCatalog[category] ?? [];
    lines.push(`  '${category}': [`);

    for (const file of files) {
      const encodedFile = encodeURIComponent(file).replace(/'/g, '%27');
      lines.push(
        `    { id: '${category}-${slugify(file)}', category: '${category}', src: '/memes/${category}/${encodedFile}' },`
      );
    }

    lines.push('  ],');
  }

  lines.push('};', '');
  return lines.join('\n');
}

function slugify(fileName) {
  return fileName
    .replace(extname(fileName), '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
