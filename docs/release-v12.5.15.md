# Zotero MindFlow 12.5.15 — 本地开发候选

本版本延续未发布的 12.5.14 修改，尚未推送、打标签或发布。

- 节点和画布右键菜单共享焦点与窗口定位处理；打开菜单聚焦首个可用动作，方向键循环导航，Home/End 跳转首尾。
- Esc 关闭并恢复打开前的焦点；Tab 退出菜单继续导航；点击外部控件不抢回焦点。
- 使用实际布局尺寸限制菜单边界，窄窗口允许内部滚动，窗口调整后重新定位；移除影响测量的缩放入场效果。
- 为菜单提供语义角色、可访问名称和系统 Highlight 焦点轮廓。
- 监听在菜单关闭后清理，回调更新不反复重建菜单焦点。

验证：前端测试、类型检查、生产构建、真实 React 菜单的 Chromium 键盘/布局回归、发布包脚本自测及 61 项运行时资源与更新源校验通过。Chromium 检查覆盖 360×280 和 240×200 窗口、首尾/循环导航、Esc 焦点恢复、Tab 退出和 Enter 单次执行，不能替代 Zotero 原生验收。

复现菜单回归：先执行 `node scripts/build-context-menu-test.mjs`，再在 Playwright 可解析的环境执行 `node scripts/test-context-menus.mjs`；外部依赖可通过 `MINDFLOW_PLAYWRIGHT_MODULE` 指定模块目录。

XPI SHA-256：`5fed4d43f78d85416eaa81bb34c8019cb9d10ddc899e0e66345de18de1f5c4f6`。

Windows Zotero 10.0.6 隔离 profile 原生回归 47/47 通过，包含新增 Gecko 菜单聚焦、方向键循环、Esc 焦点恢复及边界检查；新进程重启恢复 3/3 通过。主 profile 安装、自动更新、完整明暗主题与缩放视觉验收未执行，兼容声明仍为 Zotero 10.0.x。
