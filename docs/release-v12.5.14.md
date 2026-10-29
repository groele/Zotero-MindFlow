# Zotero MindFlow 12.5.14 candidate

This is a local development candidate. It has not been pushed, tagged, published, or installed into the user's main Zotero profile.

## Changes

- Preserve Gecko/Zotero keyboard behavior when a toolbar or sidebar control has focus. Tab can move through native controls; Enter and Space can activate the focused control instead of invoking canvas commands.
- Keep MindFlow canvas shortcuts available when focus is on the canvas or document body. Text inputs and editable node drafts remain protected by the existing guards.
- Keep package, manifest, settings display, and update-feed version metadata aligned at 12.5.14. The immutable update URL becomes usable only after a matching release asset is published.

## Verification

- Passed: frontend suite (45), logic suite (31), research presets (7), integrity suite (23), Zotero host simulation (85), TypeScript check, production bundle, release-tag syntax self-test, release-package self-tests (7), and XPI payload/update-feed verification (61 runtime files).
- Candidate XPI SHA-256: `b515fd096c717e31f0f28be327325fdf1d3769cf70afd88aa7cb9ffc52d69253`.
- Not established: the isolated Zotero process exited during startup before writing `native-regression-results.json`; the profile contains `.startup-incomplete`, with empty stdout/stderr logs. Real Zotero keyboard navigation, theme, and narrow-window acceptance therefore remain open.
- No main Zotero profile was installed or modified. This candidate has not been pushed, tagged, or published.
