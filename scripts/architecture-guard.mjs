/**
 * Zotero MindFlow - architecture & compliance guard.
 *
 * Enforces the workspace AGENTS.md clauses that can be decided statically:
 *   §3   Fluent symmetry / naming governance
 *   §4.1 every native preference has a settings-pane implementation
 *   §5.2 src/ is the single source of truth: every runtime JS is rendered
 *        from TypeScript, carries a provenance banner, and is byte-identical
 *        to a fresh render; TS/JS exported globals stay in parity too
 *   §5.3 deprecated Zotero/Gecko APIs must not return
 *   §5.9 360-line ceiling with a freeze-and-shrink baseline
 *   §6   version fields stay aligned
 *   §9.1 the two update feeds stay identical and, while unreleased, keep
 *        pointing at the last published version
 *
 * Run standalone:  node scripts/architecture-guard.mjs
 * Run as a suite:  node --test scripts/architecture-guard.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  GENERATED_FILES,
  ENTRY_TARGET,
  ENTRY_PARTS,
  ESBUILD_TARGETS,
  renderAllGenerated,
  renderEntryScript,
  bannerForEsbuild,
  bannerForEntry,
} from './host-build-targets.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const readJson = (rel) => JSON.parse(read(rel));
const lines = (rel) => read(rel).trimEnd().split(/\r?\n/).length;
// Entry parts are verbatim text slices and may legitimately end on a blank
// line; count lines without trimming content away.
const rawLines = (rel) => {
  const parts = read(rel).split(/\r?\n/);
  if (parts.length > 0 && parts[parts.length - 1] === '') parts.pop();
  return parts.length;
};
const SKIP_DIRS = new Set(['node_modules', '.git', 'tests', 'dist', 'build', 'output', 'assets', '.scaffold']);

function walk(relDir, extensions = ['.ts', '.tsx', '.js']) {
  const out = [];
  const visit = (dir) => {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = path.posix.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) visit(rel);
      } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
        out.push(rel);
      }
    }
  };
  visit(relDir);
  return out.sort();
}

const baseline = readJson('scripts/architecture-baseline.json');
const MAX_LINES = baseline.maxSourceLines;

test('§5.9 source files respect the 360-line ceiling (freeze-and-shrink baseline)', (t) => {
  const sourceFiles = [...walk('src'), ...walk('source/src', ['.ts', '.tsx'])];
  const failures = [];
  const debt = [];

  for (const file of sourceFiles) {
    const count = lines(file);
    const frozen = baseline.oversized[file];
    if (frozen !== undefined) {
      if (count > frozen) failures.push(`${file}: ${count} lines, frozen at ${frozen}`);
      if (count > MAX_LINES) debt.push(`${file} (${count})`);
    } else if (count > MAX_LINES) {
      failures.push(`${file}: ${count} lines exceeds ${MAX_LINES} and is not in the baseline`);
    }
  }

  t.diagnostic(`scanned ${sourceFiles.length} source files; ${debt.length} known oversized modules frozen`);
  assert.deepEqual(failures, [], `§5.9 violations:\n${failures.join('\n')}`);
});

test('§5.9 the freeze baseline contains no stale or misleading entries', (t) => {
  const entries = Object.entries(baseline.oversized);
  const problems = [];
  for (const [file, frozen] of entries) {
    if (!fs.existsSync(path.join(root, file))) {
      problems.push(`${file}: baseline entry points at a missing file`);
      continue;
    }
    const count = lines(file);
    if (count <= MAX_LINES) {
      problems.push(`${file}: frozen at ${frozen} but now only ${count} lines - remove the stale entry`);
    }
    if (!Number.isInteger(frozen) || frozen < count) {
      problems.push(`${file}: frozen ceiling ${frozen} is below the current ${count} lines`);
    }
  }
  assert.ok(entries.length > 0, 'baseline must not be empty while §5.9 debt exists');
  assert.deepEqual(problems, [], `baseline integrity:\n${problems.join('\n')}`);
  t.diagnostic(`${entries.length} frozen entries all exist and still exceed ${MAX_LINES} lines`);
});

test('§5.3 runtime scripts contain no deprecated Zotero/Gecko API calls', (t) => {
  const runtimeFiles = [
    'bootstrap.js',
    'prefs.js',
    ...walk('chrome/content/scripts', ['.js']),
  ];
  // Only boolean-attribute string writes are banned; data-l10n-id and friends
  // are legitimate attribute usage and must not trigger this guard.
  const banned = [
    { re: /\.getSelectedCollection\s*\(/, label: 'singular getSelectedCollection()' },
    { re: /setAttribute\(\s*['"](?:disabled|hidden|checked|readonly|selected|open)['"]/, label: 'boolean state via setAttribute' },
    { re: /\.ownerGlobal\b/, label: 'ownerGlobal accessor' },
    { re: /\bCu\.import\s*\(/, label: 'legacy Cu.import' },
    { re: /\bCheckboxStateChange\b/, label: 'legacy CheckboxStateChange event' },
  ];
  const hits = [];
  for (const file of runtimeFiles) {
    const content = read(file).split(/\r?\n/);
    content.forEach((line, index) => {
      for (const rule of banned) {
        if (rule.re.test(line)) hits.push(`${file}:${index + 1} ${rule.label}`);
      }
    });
  }
  t.diagnostic(`scanned ${runtimeFiles.length} runtime files against ${banned.length} banned patterns`);
  assert.deepEqual(hits, [], `§5.3 violations:\n${hits.join('\n')}`);
});

test('§4.1 every native preference has a settings-pane implementation and mount point', (t) => {
  const prefText = read('prefs.js');
  const paneText = read('chrome/content/scripts/preferences.js');
  const xhtml = read('chrome/content/preferences.xhtml');

  const prefKeys = [...new Set(
    [...prefText.matchAll(/pref\(\s*["']extensions\.mindflow\.([^"']+)["']/g)].map((m) => m[1]),
  )].sort();
  const unimplemented = prefKeys.filter(
    (key) => !new RegExp(`["']${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`).test(paneText),
  );
  assert.ok(prefKeys.length > 0, 'no native preferences found in prefs.js');
  assert.deepEqual(unimplemented, [], `preferences present but not referenced by the pane: ${unimplemented.join(', ')}`);

  const fieldGroups = new Set([...paneText.matchAll(/^ {4}([a-z][A-Za-z0-9]*): \[/gm)].map((m) => m[1]));
  // The shortcuts container is a static, fully Fluent-driven table; it has no
  // FIELDS group by design and must be registered explicitly here.
  const staticGroups = new Set(['shortcuts']);
  const mountGroups = [...xhtml.matchAll(/id="mindflow-pref-([a-z-]+)" class="mindflow-pref-content"/g)].map((m) => m[1]);
  const missingGroups = [...new Set(mountGroups)].filter(
    (group) => !fieldGroups.has(group) && !staticGroups.has(group),
  );
  assert.ok(mountGroups.length > 0, 'no dynamic preference mount points found');
  assert.deepEqual(missingGroups, [], `pane containers without a FIELDS group: ${missingGroups.join(', ')}`);

  t.diagnostic(`${prefKeys.length} native preference keys, ${fieldGroups.size} field groups, ${mountGroups.length} mount points`);
});

test('§5.2 TS contract layer and runtime JS modules expose the same globals', (t) => {
  const pairs = [
    ['bridge.ts', 'bridge.js'],
    ['constants.ts', 'constants.js'],
    ['itemPane.ts', 'item-pane.js'],
    ['itemPaneVisibility.ts', 'item-pane-visibility.js'],
    ['noteSync.ts', 'note-sync.js'],
    ['storage.ts', 'storage.js'],
    ['workspaceLifecycle.ts', 'workspace-lifecycle.js'],
  ];
  const globals = (text) => new Set([
    ...[...text.matchAll(/\bglobal\.(MindFlow\w+)\s*=/g)].map((m) => m[1]),
    ...[...text.matchAll(/export const (MindFlow\w+)\s*=/g)].map((m) => m[1]),
  ]);
  const mismatches = [];
  for (const [tsName, jsName] of pairs) {
    const ts = globals(read(`src/host/${tsName}`));
    const js = globals(read(`chrome/content/scripts/modules/${jsName}`));
    if (ts.size === 0 || js.size === 0 || ts.size !== js.size || [...ts].some((name) => !js.has(name))) {
      mismatches.push(`${tsName} -> ${jsName}: TS [${[...ts]}] vs JS [${[...js]}]`);
    }
  }
  t.diagnostic(`checked ${pairs.length} host module pairs`);
  assert.deepEqual(mismatches, [], `§5.2 drift:\n${mismatches.join('\n')}`);
});

test('§3 Fluent catalogues are symmetric and free of duplicate keys', (t) => {
  const keysOf = (lang) => {
    const text = read(`locale/${lang}/mindflow.ftl`);
    return [...text.matchAll(/^([A-Za-z0-9_-]+)\s*=/gm)].map((m) => m[1]);
  };
  const en = keysOf('en-US');
  const zh = keysOf('zh-CN');
  assert.equal(new Set(en).size, en.length, 'duplicate keys in en-US catalogue');
  assert.equal(new Set(zh).size, zh.length, 'duplicate keys in zh-CN catalogue');
  assert.deepEqual([...new Set(en)].sort(), [...new Set(zh)].sort(), 'en-US / zh-CN key sets differ');
  t.diagnostic(`${en.length} symmetric Fluent keys in both catalogues`);
});

test('§6 version fields are aligned across package, manifest, UI and asset URLs', (t) => {
  const rootLock = readJson('package-lock.json');
  const lock = readJson('source/package-lock.json');
  const xhtml = read('chrome/content/preferences.xhtml');
  const html = read('chrome/content/index.html');
  const badge = xhtml.match(/data-l10n-args='\{"version":"([^"]+)"\}'/)?.[1];
  const assetVersion = html.match(/\?v=([^"'\s]+)/)?.[1];

  const actual = {
    'manifest.json': readJson('manifest.json').version,
    'zotero/manifest.json': readJson('zotero/manifest.json').version,
    'package.json': readJson('package.json').version,
    'package-lock.json#version': rootLock.version,
    'package-lock.json#root': rootLock.packages?.['']?.version,
    'source/package.json': readJson('source/package.json').version,
    'source/package-lock.json#version': lock.version,
    'source/package-lock.json#root': lock.packages?.['']?.version,
    'docs/brand/product.json': readJson('docs/brand/product.json').version,
    'preferences.xhtml badge': badge,
    'index.html asset query': assetVersion,
  };
  const versions = [...new Set(Object.values(actual))];
  assert.equal(versions.length, 1, `version mismatch: ${JSON.stringify(actual, null, 2)}`);
  t.diagnostic(`all ${Object.keys(actual).length} version fields = ${versions[0]}`);
});

test('§9.1 update feeds stay identical and, while unreleased, point at the last release', (t) => {
  const rootFeed = read('update.json');
  const zoteroFeed = read('zotero/update.json');
  assert.equal(rootFeed, zoteroFeed, 'root update.json and zotero/update.json diverged');

  const product = readJson('docs/brand/product.json');
  const feed = JSON.parse(rootFeed);
  const entries = feed.addons?.[product.addonID]?.updates ?? feed.updates ?? [];
  const feedVersion = entries[0]?.version;
  if (product.releaseStatus === 'unreleased') {
    assert.equal(
      feedVersion,
      baseline.lastReleasedVersion,
      'while unreleased, the update feed must keep serving the last published version',
    );
  } else {
    assert.equal(feedVersion, product.version, 'released build must publish its own version in the feed');
  }
  assert.ok(entries.length > 0, 'no update entries found in the feed');
  for (const entry of entries) {
    assert.match(entry.update_hash ?? '', /^sha512:[0-9a-f]+$/i, 'update_hash must be a full sha512 digest');
    assert.match(entry.update_link ?? '', /^https:\/\//, 'update_link must be an absolute https URL');
  }
  t.diagnostic(`feed version ${feedVersion}, releaseStatus ${product.releaseStatus}`);
});

test('§5.2 host constants do not drift between the TS contract layer and runtime JS', (t) => {
  const ts = read('src/host/constants.ts');
  const js = read('chrome/content/scripts/modules/constants.js');

  const parseVal = (str) => {
    if (!str) return null;
    const s = str.trim();
    if (s.startsWith('[') && s.endsWith(']')) {
      return [...s.slice(1, -1).matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]).join(',');
    }
    if (/^[\d*+\-/()e.\s]+$/.test(s)) {
      try { return String(Function('return (' + s + ')')()); } catch (_) {}
    }
    return s.replace(/['"]/g, '').replace(/\s+/g, '');
  };
  const scalar = (text, name) => {
    const found = text.match(new RegExp(`(?:export\\s+)?(?:const|var|let)\\s+${name}\\s*(?::[^{;]*?)?=\\s*([^;]+);`));
    return found ? parseVal(found[1]) : null;
  };
  const objectKeys = (text, name) => {
    const found = text.match(new RegExp(`(?:export\\s+)?(?:const|var|let)\\s+${name}\\s*(?::[^{;]*?)?=\\s*\\{`));
    if (!found) return null;
    let index = found.index + found[0].length;
    let depth = 1;
    const start = index;
    while (index < text.length && depth > 0) {
      if (text[index] === '{') depth += 1;
      else if (text[index] === '}') depth -= 1;
      index += 1;
    }
    const body = text.slice(start, index - 1);
    return new Set([...body.matchAll(/^\s*['"]?([A-Za-z0-9_]+)['"]?\s*:/gm)].map((match) => match[1]));
  };

  const scalars = [
    'ADDON_ID', 'CHROME_ROOT', 'PREF_PREFIX', 'LLM_PREF_PREFIX',
    'AI_PREPARED_TTL', 'AI_CANCELLED', 'AI_OMISSION_MARKER',
    'AI_SECTION_KEYS', 'AI_READING_MODES',
  ];
  const keyMaps = ['ALLOWED_PREF_MESSAGES', 'STORAGE_KEYS'];
  const failures = [];

  for (const name of scalars) {
    const a = scalar(ts, name);
    const b = scalar(js, name);
    if (a === null || b === null || a !== b) failures.push(`${name}: TS=${a} JS=${b}`);
  }
  for (const name of keyMaps) {
    const a = objectKeys(ts, name);
    const b = objectKeys(js, name);
    const same = a && b && a.size === b.size && [...a].every((key) => b.has(key));
    if (!same) failures.push(`${name}: TS=[${a ? [...a] : null}] JS=[${b ? [...b] : null}]`);
  }

  t.diagnostic(`compared ${scalars.length} scalars and ${keyMaps.length} key maps between TS and runtime constants`);
  assert.deepEqual(failures, [], `§5.2 constant drift:\n${failures.join('\n')}`);
});

test('§5.2 every runtime script is generated from src/ and carries its provenance banner', (t) => {
  const actual = walk('chrome/content/scripts', ['.js']).sort();
  const expected = [...GENERATED_FILES].sort();
  assert.deepEqual(
    actual,
    expected,
    'a hand-written runtime script appeared outside the generated manifest',
  );

  const banners = new Map([
    ...ESBUILD_TARGETS.map(({ source, output }) => [output, bannerForEsbuild(source)]),
    [ENTRY_TARGET.output, bannerForEntry(ENTRY_TARGET.source)],
  ]);
  const wrong = actual.filter((file) => !read(file).startsWith(banners.get(file)));
  assert.deepEqual(wrong, [], `missing or stale generation banner: ${wrong.join(', ')}`);

  assert.ok(
    fs.existsSync(path.join(root, ENTRY_TARGET.source)),
    `host entry TypeScript source ${ENTRY_TARGET.source} is missing`,
  );
  t.diagnostic(`${actual.length} runtime scripts, all declared generated and correctly bannered`);
});

test('§5.2 generated runtime scripts are byte-identical to a fresh render of their TypeScript sources', async (t) => {
  const rendered = await renderAllGenerated(root);
  const drift = [];
  for (const [relative, expected] of rendered) {
    const absolute = path.join(root, relative);
    if (!fs.existsSync(absolute) || read(relative) !== expected) {
      drift.push(relative);
    }
  }
  assert.deepEqual(
    drift,
    [],
    `runtime artefacts were hand-edited or their TS source changed without a rebuild:\n${drift.join('\n')}`,
  );
  t.diagnostic(`${rendered.size} runtime scripts re-rendered from TypeScript with zero byte drift`);
});

test('§5.2 host entry consumes exactly the globals published by generated modules', (t) => {
  const entry = read(ENTRY_TARGET.output);
  const consumed = new Set([...entry.matchAll(/_globalScope\.(MindFlow\w+)/g)].map((m) => m[1]));
  const published = new Set();
  for (const file of walk('chrome/content/scripts/modules', ['.js'])) {
    for (const m of read(file).matchAll(/\bglobal\.(MindFlow\w+)\s*=/g)) published.add(m[1]);
  }
  assert.ok(consumed.size > 0, 'host entry no longer loads its domain modules via _globalScope');
  assert.deepEqual([...consumed].filter((name) => !published.has(name)), [], 'host entry reads a global that no generated module publishes');
  assert.deepEqual([...published].filter((name) => !consumed.has(name)), [], 'a generated module publishes an unused global');

  // Zotero 10 loads preference scripts in a pane sandbox: onload handlers
  // resolve names on the preferences window, never on sandbox globals.
  const pane = read('chrome/content/scripts/preferences.js');
  assert.match(pane, /window\.MindFlow_Preferences\s*=\s*\{\s*init\s*\}/, 'pane init must be published on window');
  assert.ok(!/global\.MindFlow_Preferences\s*=/.test(pane), 'pane init must not fall back to a sandbox global');

  // scripts/start-native-test.ps1 injects its FilePicker stub by replacing
  // this exact literal in the packaged entry; losing it silently disables
  // native regression instrumentation.
  assert.ok(
    entry.includes('const picker = new FilePicker(); // mindflow-export-picker'),
    'native-test injection anchor was lost from the host entry',
  );
  t.diagnostic(`${consumed.size} host globals matched; pane hook and native-test anchor intact`);
});

test('§5.2 no TypeScript source is allowed a type-check exemption', () => {
  const offenders = [...walk('src'), ...walk('source/src', ['.ts', '.tsx'])]
    .filter((file) => read(file).includes('@ts-nocheck'));
  assert.deepEqual(offenders, [], `@ts-nocheck found in TypeScript sources: ${offenders.join(', ')}`);
});

test('§5.9 host entry parts are complete, bounded, contiguous and losslessly ordered', async (t) => {
  const problems = [];
  let previousEnd = 0;
  for (const part of ENTRY_PARTS) {
    if (!fs.existsSync(path.join(root, part.file))) {
      problems.push(`${part.file}: missing source part`);
      continue;
    }
    const count = rawLines(part.file);
    if (count > MAX_LINES) problems.push(`${part.file}: ${count} lines exceeds ${MAX_LINES}`);
    const [start, end] = part.lines;
    if (start !== previousEnd + 1) {
      problems.push(`${part.file}: starts at ${start}, expected ${previousEnd + 1}`);
    }
    if (end < start || end - start + 1 !== count) {
      problems.push(`${part.file}: declared [${start}, ${end}] but file has ${count} lines`);
    }
    previousEnd = end;
  }
  assert.deepEqual(problems, [], `entry part manifest is invalid:\n${problems.join('\n')}`);

  // Re-render from the parts and compare with the committed artefact. The
  // concatenation must reproduce the historical runtime IIFE byte-for-byte.
  const rendered = await renderEntryScript(root);
  assert.equal(read(ENTRY_TARGET.output), rendered, 'entry artefact differs from the ordered parts');
  assert.ok(
    !fs.existsSync(path.join(root, 'src/host/index.ts')),
    'the monolithic src/host/index.ts must not return',
  );
  t.diagnostic(`${ENTRY_PARTS.length} entry parts, max ${MAX_LINES} lines, contiguous to line ${previousEnd}`);
});

test('§4.2 the settings pane declares the 16/24px alignment grid explicitly', (t) => {
  const css = read('chrome/content/assets/preferences.css');
  const rules = [
    {
      label: 'card body uses padding-inline: 16px',
      re: /\.mindflow-card-body\s*\{[^}]*padding-inline:\s*16px/,
    },
    {
      label: 'card summary uses padding-inline: 16px',
      re: /\.mindflow-card-summary\s*\{[^}]*padding-inline:\s*16px/,
    },
    {
      label: 'subordinate rows use margin-inline-start: 24px',
      re: /\.subordinate-row[^{]*\{[^}]*margin-inline-start:\s*24px/,
    },
    {
      label: 'Level-1 card overview is explicitly reset to 0',
      re: /\.mindflow-card-body\s*>\s*p:first-child[^{]*\{[^}]*margin-inline-start:\s*0/,
    },
  ];
  const missing = rules.filter(({ re }) => !re.test(css)).map(({ label }) => label);
  assert.deepEqual(missing, [], `§4.2 grid declarations missing:\n${missing.join('\n')}`);
  t.diagnostic(`${rules.length} alignment-grid declarations present`);
});

test('§3 source filenames carry no version numbers or transient prefixes', () => {
  const files = [...walk('src'), ...walk('source/src'), ...walk('chrome/content/scripts', ['.js']), ...walk('scripts', ['.mjs', '.py'])];
  const bad = files.filter((file) => /(^|\/)(?:v\d|V\d|temp-|tmp-|draft-)/.test(path.basename(file)));
  assert.deepEqual(bad, [], `version-prefixed or transient filenames: ${bad.join(', ')}`);
});
