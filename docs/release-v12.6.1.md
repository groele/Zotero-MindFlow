# Zotero MindFlow 12.6.1

- 修复更新后新工具栏代码与旧 CSS 混用时，标题占满整行、操作按钮越界堆叠、工具栏异常增高并挤压画布的问题。使用 12.5.16 CSS 搭配 12.6.0 组件可复现约 472px 高度。
- 工作台页面、JS 与 CSS 地址均带版本标识，构建自动同步资源版本；打包门禁拒绝资源版本不匹配。
- 工具栏关键布局不再依赖新增的响应式宽度工具类，操作区使用非零弹性基准；保留“工具栏 / 更多 / 隐藏”设置。
- 增加宽/窄窗口下的工具栏高度、分组边界断言，以及旧 CSS 组合的浏览器回归。此前只检查分组重叠，未覆盖这一缓存组合问题。

验证：类型检查、生产构建、现有前端测试、86 项宿主模拟、8 项发布包自测及带旧 CSS 的浏览器回归通过。Windows Zotero 10.0.6 隔离原生 49/49、新进程重启 3/3 通过；原生测量在 1876/1200/600px 宽度下工具栏高度分别为 56/77/85px。侧栏测试在使用前建立折叠前置状态，保留全部可见性和行为断言。主 profile 安装和自动更新实机演练未执行。

SHA-256：`eadf5afd7dd2b5d05ebb6396cf95d6fcd2b06749f23be285cb35892c2434f392`。

Fixes oversized toolbars after updates when new component code is combined with stale CSS. Workspace HTML, CSS, and JavaScript now use versioned URLs, packaging checks resource versions, and critical toolbar geometry remains compact even against the prior stylesheet. Entry placement settings and map data format are unchanged.
