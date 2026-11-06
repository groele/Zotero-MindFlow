/**
 * Zotero MindFlow - single definition of the generated runtime scripts.
 *
 * §5.2 / §2: src/ is the authoritative Single Source of Truth. Every .js file
 * under chrome/content/scripts/ is produced from a TypeScript source by this
 * module. build-source.mjs writes the render results; architecture-guard.mjs
 * re-renders the same targets and fails on any byte-level drift. Keeping the
 * recipe in one place prevents the build and the parity guard from disagreeing.
 *
 * The host entry (index.js) is deliberately NOT bundled: bootstrap.js loads it
 * with Services.scriptloader.loadSubScript() into a custom scope, and the host
 * test fixture injects a test hook by matching a literal line in that script.
 * It is assembled from ordered, verbatim source parts under src/host/entry/.
 * Concatenated in the declared order they reproduce the historical IIFE
 * byte-for-byte, so behaviour is unchanged while the 4,484-line monolith is
 * gone. The parts are compile-time text units, not standalone ES modules:
 * three methods exceed 360 lines on their own, and the IIFE shares 268 `this.`
 * references plus 215 closure bindings. tsconfig.json excludes that directory
 * from independent type checking; the concatenated artefact is validated with
 * node --check and the 116-item host test suite.
 */

import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { build as esbuild } from 'esbuild';

/** Domain modules + the preferences pane, compiled with the standard esbuild target. */
export const ESBUILD_TARGETS = [
  { source: 'src/host/constants.ts', output: 'chrome/content/scripts/modules/constants.js' },
  { source: 'src/host/storage.ts', output: 'chrome/content/scripts/modules/storage.js' },
  { source: 'src/host/itemPane.ts', output: 'chrome/content/scripts/modules/item-pane.js' },
  { source: 'src/host/itemPaneVisibility.ts', output: 'chrome/content/scripts/modules/item-pane-visibility.js' },
  { source: 'src/host/noteSync.ts', output: 'chrome/content/scripts/modules/note-sync.js' },
  { source: 'src/host/bridge.ts', output: 'chrome/content/scripts/modules/bridge.js' },
  { source: 'src/host/workspaceLifecycle.ts', output: 'chrome/content/scripts/modules/workspace-lifecycle.js' },
  { source: 'src/preferences.ts', output: 'chrome/content/scripts/preferences.js' },
];

/**
 * Ordered source parts of the host entry. `lines` records the 1-based range
 * each part occupies in the historical entry; the guard verifies that the
 * ranges are contiguous and complete, and that no part exceeds the ceiling.
 * Never reorder, merge or edit these independently of the concatenation.
 */
export const ENTRY_PARTS = [
  { file: 'src/host/entry/01-runtime-bootstrap-and-llm-client.ts', lines: [1, 323], role: 'runtime-bootstrap-and-llm-client' },
  { file: 'src/host/entry/02-runtime-ai-evidence-and-items.ts', lines: [324, 634], role: 'runtime-ai-evidence-and-items' },
  { file: 'src/host/entry/03-runtime-workspace-open-and-storage.ts', lines: [635, 857], role: 'runtime-workspace-open-and-storage' },
  { file: 'src/host/entry/04-methods-item-pane-styles-and-init.ts', lines: [858, 1149], role: 'methods-item-pane-styles-and-init' },
  { file: 'src/host/entry/05-methods-item-pane-section-begin.ts', lines: [1150, 1489], role: 'methods-item-pane-section-begin' },
  { file: 'src/host/entry/06-methods-item-pane-section-end.ts', lines: [1490, 1811], role: 'methods-item-pane-section-end' },
  { file: 'src/host/entry/07-methods-add-to-window-begin.ts', lines: [1812, 2151], role: 'methods-add-to-window-begin' },
  { file: 'src/host/entry/08-methods-add-to-window-end.ts', lines: [2152, 2346], role: 'methods-add-to-window-end' },
  { file: 'src/host/entry/09-methods-toolbar-and-window-cleanup.ts', lines: [2347, 2634], role: 'methods-toolbar-and-window-cleanup' },
  { file: 'src/host/entry/10-methods-attachments-and-open-trigger.ts', lines: [2635, 2865], role: 'methods-attachments-and-open-trigger' },
  { file: 'src/host/entry/11-methods-open-mind-flow.ts', lines: [2866, 3119], role: 'methods-open-mind-flow' },
  { file: 'src/host/entry/12-methods-serialize-item-and-ai-config.ts', lines: [3120, 3281], role: 'methods-serialize-item-and-ai-config' },
  { file: 'src/host/entry/13-methods-prepare-paper-analysis.ts', lines: [3282, 3572], role: 'methods-prepare-paper-analysis' },
  { file: 'src/host/entry/14-methods-analyze-paper-with-ai-begin.ts', lines: [3573, 3912], role: 'methods-analyze-paper-with-ai-begin' },
  { file: 'src/host/entry/15-methods-analyze-paper-with-ai-end.ts', lines: [3913, 3965], role: 'methods-analyze-paper-with-ai-end' },
  { file: 'src/host/entry/16-methods-save-mind-map-begin.ts', lines: [3966, 4305], role: 'methods-save-mind-map-begin' },
  { file: 'src/host/entry/17-methods-save-mind-map-end.ts', lines: [4306, 4410], role: 'methods-save-mind-map-end' },
  { file: 'src/host/entry/18-methods-shutdown-and-init-launch.ts', lines: [4411, 4482], role: 'methods-shutdown-and-init-launch' },
];

export const ENTRY_TARGET = {
  source: 'src/host/entry',
  output: 'chrome/content/scripts/index.js',
};

export const GENERATED_FILES = [
  ...ESBUILD_TARGETS.map((target) => target.output),
  ENTRY_TARGET.output,
];

export const bannerForEsbuild = (source) => `// [Generated by esbuild from ${source} - DO NOT EDIT DIRECTLY]\n`;
export const bannerForEntry = (source) => `// [Generated from ${source} - DO NOT EDIT DIRECTLY]\n`;

export async function compileEsbuildTarget(root, target) {
  const result = await esbuild({
    entryPoints: [path.join(root, target.source)],
    bundle: true,
    format: 'iife',
    target: 'firefox140',
    charset: 'utf8',
    minify: false,
    write: false,
    treeShaking: true,
  });
  const output = result.outputFiles?.[0];
  if (!output || output.contents.length === 0) {
    throw new Error(`[MindFlow] esbuild produced no output for ${target.source}`);
  }
  return bannerForEsbuild(target.source) + output.text;
}

export async function renderEntryScript(root) {
  const chunks = [];
  for (const part of ENTRY_PARTS) {
    chunks.push(await readFile(path.join(root, part.file), 'utf8'));
  }
  return bannerForEntry(ENTRY_TARGET.source) + chunks.join('');
}

/** Render every generated runtime script, keyed by its output path. */
export async function renderAllGenerated(root) {
  const rendered = new Map();
  for (const target of ESBUILD_TARGETS) {
    rendered.set(target.output, await compileEsbuildTarget(root, target));
  }
  rendered.set(ENTRY_TARGET.output, await renderEntryScript(root));
  return rendered;
}
