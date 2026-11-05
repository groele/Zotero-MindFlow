/**
 * Zotero MindFlow - Unified esbuild & TypeScript Build Pipeline
 * Orchestrates root-level TypeScript checks, esbuild host optimization,
 * React/Tailwind frontend bundling, cache-busting and syntax verification.
 */

import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { build as esbuild } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDependencies = path.join(root, 'source/node_modules');
const { version } = JSON.parse(await readFile(path.join(root, 'source/package.json'), 'utf8'));

console.log(`[MindFlow Build] Initiating unified build pipeline for v${version}...`);

// 1. Root & Host TypeScript type checking
console.log('[1/5] Running root & host TypeScript type checks...');
const hostTypeCheck = spawnSync(process.platform === 'win32' ? 'cmd.exe' : 'npm',
  process.platform === 'win32' ? ['/d', '/c', 'npm run typecheck:host'] : ['run', 'typecheck:host'],
  { cwd: root, stdio: 'inherit' });
if (hostTypeCheck.status !== 0) {
  console.error('[Error] Host TypeScript checks failed.');
  process.exit(hostTypeCheck.status || 1);
}

// 2. Frontend TypeScript type checking
console.log('[2/5] Running frontend UI TypeScript type checks...');
const uiTypeCheck = spawnSync(process.platform === 'win32' ? 'cmd.exe' : 'npm',
  process.platform === 'win32' ? ['/d', '/c', 'npm --prefix source run typecheck'] : ['--prefix', 'source', 'run', 'typecheck'],
  { cwd: root, stdio: 'inherit' });
if (uiTypeCheck.status !== 0) {
  console.error('[Error] Frontend TypeScript checks failed.');
  process.exit(uiTypeCheck.status || 1);
}

// 3. Frontend Bundle (React 19 + TailwindCSS 4 via Vite)
console.log('[3/5] Bundling React canvas editor via Vite...');
const { build: viteBuild } = await import(pathToFileURL(path.join(sourceDependencies, 'vite/dist/node/index.js')).href);
const { default: react } = await import(pathToFileURL(path.join(sourceDependencies, '@vitejs/plugin-react/dist/index.js')).href);
const { default: tailwindcss } = await import(pathToFileURL(path.join(sourceDependencies, '@tailwindcss/vite/dist/index.mjs')).href);

await viteBuild({
  configFile: false,
  root: path.join(root, 'source'),
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.join(root, 'source/src') } },
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env': '{"NODE_ENV":"production"}',
    global: 'window',
  },
  build: {
    outDir: path.join(root, 'chrome/content/assets'),
    emptyOutDir: false,
    lib: {
      entry: path.join(root, 'source/src/main.tsx'),
      name: 'MindFlowApp',
      formats: ['iife'],
      fileName: () => 'app.iife.js',
      cssFileName: 'mindflow',
    },
  },
});

// 4. Update index.html version queries for cache invalidation
console.log('[4/5] Updating HTML asset cache versions...');
const htmlPath = path.join(root, 'chrome/content/index.html');
const html = await readFile(htmlPath, 'utf8');
await writeFile(
  htmlPath,
  html.replace(/(\.\/assets\/(?:mindflow\.css|app\.iife\.js))(?:\?v=[^"']*)?/g, `$1?v=${version}`)
);

// 5. Syntax checks on runtime files & modules
console.log('[5/5] Performing syntax and integrity checks...');
const runtimeFiles = [
  'bootstrap.js',
  'chrome/content/scripts/index.js',
  'chrome/content/scripts/preferences.js',
  'chrome/content/assets/app.iife.js',
  'chrome/content/scripts/modules/constants.js',
  'chrome/content/scripts/modules/storage.js',
  'chrome/content/scripts/modules/item-pane.js',
  'chrome/content/scripts/modules/item-pane-visibility.js',
  'chrome/content/scripts/modules/note-sync.js',
  'chrome/content/scripts/modules/bridge.js',
  'chrome/content/scripts/modules/workspace-lifecycle.js',
];

for (const file of runtimeFiles) {
  const result = spawnSync(process.execPath, ['--check', path.join(root, file)], { stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`[Error] Syntax check failed on: ${file}`);
    process.exit(result.status || 1);
  }
}

// 6. Persistence domain line constraints and version consistency
for (const domainFile of ['storage.js', 'workspace-lifecycle.js', 'note-sync.js', 'item-pane-visibility.js']) {
  const content = await readFile(path.join(root, 'chrome/content/scripts/modules', domainFile), 'utf8');
  const lineCount = content.trimEnd().split(/\r?\n/).length;
  if (lineCount > 360) {
    console.error(`[Error] Persistence domain module ${domainFile} exceeded 360 lines limit (${lineCount} lines).`);
    process.exit(1);
  }
}

const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
if (manifest.version !== version) {
  console.error(`[Error] manifest.json version (${manifest.version}) does not match package.json (${version}).`);
  process.exit(1);
}

console.log('[Success] Unified TypeScript typechecks, production bundles, domain constraints, and syntax verifications passed.');
