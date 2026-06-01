import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCatalogModule, scanMemeFolders } from './catalog-utils.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(scriptDir);
const memesRoot = join(projectRoot, 'public', 'memes');
const outputPath = join(projectRoot, 'src', 'generated', 'memeCatalog.ts');

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, createCatalogModule(scanMemeFolders(memesRoot)), 'utf8');
