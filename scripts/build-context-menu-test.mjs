import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { writeFile } from 'node:fs/promises';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modules = path.join(root, 'source/node_modules');
const { build } = await import(pathToFileURL(path.join(modules, 'vite/dist/node/index.js')).href);
const { default: react } = await import(pathToFileURL(path.join(modules, '@vitejs/plugin-react/dist/index.js')).href);
const preview = process.argv.includes('--ui-preview');
const outDir = path.join(root, preview ? 'tests/ui-preview' : 'tests/menu-fixture');
await build({ configFile: false, root: path.join(root, 'source'), plugins: [react()],
  define: { 'process.env.NODE_ENV': '"production"' },
  build: { outDir, emptyOutDir: false, lib: { entry: path.join(root, preview ? 'source/tests/ui-preview-fixture.tsx' : 'source/tests/context-menu-fixture.tsx'),
    name: 'MenuFixture', formats: ['iife'], fileName: () => 'menus.js' } } });
await writeFile(path.join(outDir, 'index.html'), '<!doctype html><meta charset="UTF-8"><link rel="stylesheet" href="../../chrome/content/assets/mindflow.css"><div id="root"></div><script src="menus.js"></script>');
