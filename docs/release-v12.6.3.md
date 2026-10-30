# Zotero MindFlow 12.6.3

- 修复工作台导出依赖网页下载链接、无法确认文件实际保存的问题。PNG、SVG、JSON、Markdown、OPML、HTML 改用 Zotero 原生保存对话框，写入后读回校验，再报告成功；取消和失败分别反馈。
- 精简“更多”：格式列表收进“导出文件…”，导入使用“导入导图…”。PNG 用于分享，SVG 用于排版/打印，JSON 是可再次编辑的完整导图备份。
- 移除 Zotero 工作台中未可靠支持的直接打印/PDF 入口；可先导出 SVG/PNG，再从浏览器或文稿打印。此版本未实现直接 PDF 导出。
- 导出重复点击会提示等待，未连接保存通道会明确报错；长文件名缩短时保留扩展名。

验证：类型检查、构建、前端测试、87 项宿主模拟、8 项发布包自测、菜单与侧栏 Chromium 回归通过。Windows Zotero 10.0.7 隔离原生 50/50、新进程重启恢复 3/3 通过，JSON/PNG 真实落盘、读回、PNG 文件头和取消无文件均验证。测试只在临时 profile 自动选择对话框路径，产品写入和校验代码不变。主 profile 安装、用户手动保存对话框交互和其他平台未在本轮验收。

SHA-256：`f55dc89ee9bdab47c7597b2498aebf06ae89b9f4c5ed6624ffb3a7fae649902d`。

Exports now use Zotero's native save dialog and verify saved bytes before reporting success. More is shorter, with formats under Export File. Cancellation and failures are explicit. Direct PDF printing is unavailable in the Zotero workspace and its ineffective entry is removed; print an exported SVG/PNG externally instead.
