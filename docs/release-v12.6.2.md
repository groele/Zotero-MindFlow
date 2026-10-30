# Zotero MindFlow 12.6.2

- 属性栏的图片和关联导图区域采用原生 disclosure：未使用时收起，已有图片或链接时直接展开。浅蓝和淡青分组保留，减少持续展开的可选控件。
- 固定侧栏标题高度，由内容区域独立滚动，避免小高度窗口压缩标题与关闭按钮。
- 统一左侧导航按钮的圆角、可访问名称与选中语义；键盘进入列表行时显示原来仅悬停出现的操作。
- 补齐暗色形状选中态、色板焦点边界及侧栏键盘焦点。折叠标题上的 Space 键不再触发画布编辑命令。
- 沿用 12.6.1 的工具栏空间约束和页面/资源版本标识。

验证：前端测试、类型检查、生产构建、86 项宿主模拟、8 项发布包自测、工具栏与属性栏的真实 React/Chromium 回归通过。Windows Zotero 10.0.7 隔离原生回归 50/50、新进程重启恢复 3/3 通过。主 profile 安装、自动更新实机演练、完整系统缩放/高对比度及其他平台未验证。

SHA-256：`2a0ca4f7b861e9ee7b4b8e2ce2b1757433146b29eb2b5a2115cc8bf648abf14d`。

Refines inspector density with native disclosures for optional image/link tools, preserves existing content visibility, and keeps sidebar headers stable in short windows. Navigation controls gain consistent focus and selection semantics; keyboard-only row actions become visible. Disclosure Space no longer invokes canvas editing. Toolbar geometry and versioned asset loading safeguards remain in place.
