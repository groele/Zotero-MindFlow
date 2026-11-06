import { ShieldCheck, Trash2 } from 'lucide-react';
import { APP_VERSION } from '../../core/version';
import type { SettingsModalContext } from './useSettingsModal';

export const SettingsAboutTab = ({ ctx }: { ctx: SettingsModalContext }) => {
  const { handleResetAllSettings } = ctx;
  return (
              <div className="space-y-4">
                <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/50 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                    MF
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Zotero MindFlow</h3>
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">知识组织与学术研读 · v{APP_VERSION}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      专为 Zotero 10 至 12 现代生态打造，深度集成文献研读、PDF 批注穿梭、AI 论文论证脉络解构与全键盘思维导图。
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200"><ShieldCheck className="h-4 w-4" />本地优先与隐私原则</h4>
                  <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                    <li>思维导图、收集箱与版本快照默认保存在本地；启用 WebDAV 后，工作区备份会发送到您配置的 HTTPS 服务器。</li>
                    <li>无任何追踪脚本、无第三方数据收集。WebDAV 授权密码仅存于本机，直接与您的网盘建立点对点通信。</li>
                    <li>在离线状态下全部功能（包括作图、排版、导出图片与 Markdown）完美运行。</li>
                  </ul>
                </div>

                <div className="h-px bg-slate-200 dark:border-slate-800" />

                <div>
                  <h4 className="font-semibold text-red-600 dark:text-red-400 mb-1">重置系统设置</h4>
                  <p className="text-[11px] text-slate-400 mb-2">恢复所有自定义工具栏、默认主题、布局与偏好为出厂状态（不会删除您的导图）：</p>
                  <button
                    onClick={handleResetAllSettings}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-red-200 dark:border-red-900/60"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>恢复出厂设置</span>
                  </button>
                </div>
              </div>
  );
};
