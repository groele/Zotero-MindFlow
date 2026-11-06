/**
 * Zotero MindFlow - Unified build pipeline.
 *
 * Runs host/frontend type checks, bundles the React canvas via Vite, renders
 * every runtime script from TypeScript, refreshes asset cache-busting, then
 * enforces syntax, domain-size, version and architecture/compliance guards.
 *
 * NOTE on §5.2: src/ is the authoritative Single Source of Truth. EVERY .js
 * under chrome/content/scripts/ - including the host entry index.js - is
 * generated during step [4/7] from scripts/host-build-targets.mjs; do not edit
 * them by hand. architecture-guard.mjs re-renders the same targets and fails
 * on byte-level drift, so a hand-edited artefact cannot survive the build.
 */

import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { renderAllGenerated } from './host-build-targets.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDependencies = path.join(root, 'source/node_modules');
const { version } = JSON.parse(await readFile(path.join(root, 'source/package.json'), 'utf8'));

console.log(`[MindFlow Build] Initiating unified build pipeline for v${version}...`);

// 1. Root & Host TypeScript type checking
console.log('[1/7] Running root & host TypeScript type checks...');
const hostTypeCheck = spawnSync(process.platform === 'win32' ? 'cmd.exe' : 'npm',
  process.platform === 'win32' ? ['/d', '/c', 'npm run typecheck:host'] : ['run', 'typecheck:host'],
  { cwd: root, stdio: 'inherit' });
if (hostTypeCheck.status !== 0) {
  console.error('[Error] Host TypeScript checks failed.');
  process.exit(hostTypeCheck.status || 1);
}

// 2. Frontend TypeScript type checking
console.log('[2/7] Running frontend UI TypeScript type checks...');
const uiTypeCheck = spawnSync(process.platform === 'win32' ? 'cmd.exe' : 'npm',
  process.platform === 'win32' ? ['/d', '/c', 'npm --prefix source run typecheck'] : ['--prefix', 'source', 'run', 'typecheck'],
  { cwd: root, stdio: 'inherit' });
if (uiTypeCheck.status !== 0) {
  console.error('[Error] Frontend TypeScript checks failed.');
  process.exit(uiTypeCheck.status || 1);
}

// 3. Frontend Bundle (React 19 + TailwindCSS 4 via Vite)
console.log('[3/7] Bundling React canvas editor via Vite...');
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

// 4. §5.2 Render all runtime scripts from the TypeScript single source of truth.
console.log('[4/7] Rendering runtime scripts from src/ (single source of truth)...');
const generated = await renderAllGenerated(root);
for (const [relative, code] of generated) {
  await writeFile(path.join(root, relative), code, 'utf8');
}
console.log(`[4/7] ${generated.size} runtime scripts rendered (8 esbuild targets + 1 verbatim host entry).`);

// 5. Update index.html version queries for cache invalidation
console.log('[5/7] Updating HTML asset cache versions...');
const htmlPath = path.join(root, 'chrome/content/index.html');
const html = await readFile(htmlPath, 'utf8');
await writeFile(
  htmlPath,
  html.replace(/(\.\/assets\/(?:mindflow\.css|app\.iife\.js))(?:\?v=[^"']*)?/g, `$1?v=${version}`)
);

// 6. Syntax checks, persistence domain constraints and version consistency
console.log('[6/7] Performing syntax and integrity checks...');
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

// 7. Architecture & compliance guard (§3/§4.1/§4.2/§5.2/§5.3/§5.9/§6/§9.1)
console.log('[7/7] Running architecture and compliance guard...');
const guard = spawnSync(process.execPath,
  ['--test', path.join(root, 'scripts/architecture-guard.mjs')],
  { cwd: root, stdio: 'inherit' });
if (guard.status !== 0) {
  console.error('[Error] Architecture and compliance guard failed.');
  process.exit(guard.status || 1);
}

console.log('[Success] Type checks, bundles, generated-runtime parity, syntax, version and architecture guards passed.');
