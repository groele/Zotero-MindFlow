# Zotero MindFlow product plan — 2026-10-29

## 本轮产品决策与进展（12.5.15）

近期按“能顺畅操作、能确认当前上下文、能安全保存”的顺序推进。第一阶段已落地控件焦点保护、右键菜单键盘导航、焦点恢复与窄窗定位；用真实 React 菜单验证动作不会重复触发。

下一阶段优先检查工具栏弹出菜单的互斥、Esc 和焦点返回，以及 Zotero 明暗主题切换时的工作台外壳表现。验收包含鼠标、纯键盘、窄窗和系统缩放，保留画布文档本身的主题选择。随后检查多窗口、只读群组库和慢存储中的归档反馈，最后依据实测数据处理大导图性能。每项完成需给出实际宿主版本、步骤与结果；未运行的场景明确保留为验收缺口。

## Product direction

MindFlow should feel like a focused Zotero workspace: host controls behave like Zotero controls, literature context stays attached to the correct library item, and the canvas remains the place for visual thinking. Polish should reduce friction and protect work before adding more feature surface.

## Priority 0 — interaction compatibility (current candidate)

- Preserve keyboard navigation and activation when focus is on toolbar, sidebar, menu, and selection controls.
- Keep canvas editing shortcuts scoped to the editor and avoid overriding text fields or native controls.
- Acceptance: in an isolated supported Zotero profile, Tab traverses the toolbar and sidebars, Enter/Space activates focused actions, canvas shortcuts still work with canvas focus, and no shortcut causes an unintended document mutation.

## Priority 1 — Zotero host contract

- Verify startup, delayed host API availability, tab and standalone-window ownership, close/reopen, session restore, and shutdown cleanup on the declared Zotero 10.0.x range.
- Keep item and attachment identity library-scoped; exercise user and group libraries, read-only groups, selected PDF versus parent item, notes, and missing/deleted attachments.
- Add compatibility adapters only around observed host API differences. Record the Zotero build and feature gate for each adapter; do not broaden the manifest range from simulation alone.
- Acceptance: same-name/same-key items from different libraries never cross-link; read-only targets fail visibly; closing a workspace leaves no stale listener, timer, tab binding, or pending writer.

## Priority 2 — native visual fit

- Compare the workspace chrome, item-pane actions, preferences, dialogs, focus rings, menus, and typography with Zotero in light and dark themes.
- Prefer host/system colors and system fonts for shell controls while keeping document themes explicit and portable.
- Normalize control height, separators, hover/pressed states, focus visibility, reduced-motion behavior, and narrow-pane wrapping. Keep canvas-specific visual language distinct where it improves map readability.
- Acceptance: inspect real Zotero screenshots at standard and narrow widths, after theme switching, with keyboard focus visible; compare computed styles and screenshots rather than relying on static browser rendering.

## Priority 3 — document safety and scale

- Stress autosave, revision conflicts, recovery snapshots, and close capture with large maps, many annotations, slow storage, and two open windows.
- Measure startup and canvas interaction with representative large documents; profile before adding virtualization or changing persistence.
- Keep save, archive, sync, and recovery outcomes distinct in the status UI; never report a successful save before host storage confirms it.
- Acceptance: no data loss after immediate close/reopen, conflict creates an explicit recovery copy, and large maps remain responsive on the reference host.

## Delivery gates

1. Reproduce and classify the issue in an isolated Zotero profile or a host simulation that models the affected API accurately.
2. Implement the smallest complete change and add a focused regression.
3. Run typecheck, frontend/host regressions, production bundle, XPI payload checks, and update-feed/hash checks as applicable.
4. Run the real-host scenarios for changes that affect Zotero APIs, windows, data writes, or visible UI. Report these separately from simulation and build results.
5. Keep source version, package, manifest, feeds, release notes, and downloadable artifact aligned before asking to publish. A local version bump alone is not a release.
