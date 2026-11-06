import { openZoteroPreferences } from '../../services/zotero/zoteroBridge';
import type { SettingsModalContext } from './useSettingsModal';

export const SettingsAiTab = ({ ctx }: { ctx: SettingsModalContext }) => {
  const { setCurrentSettings, handleSaveSettings, currentSettings } = ctx;
  return (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-1">
                    AI 研读与 llm-for-zotero
                  </h3>
                  <p className="text-[11px] text-slate-400 mb-3">
                    由 llm-for-zotero 总结文章，MindFlow 将结构化总结转换为可编辑导图。
                  </p>
                </div>

                <div className="space-y-3.5 bg-slate-50/70 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <p className="text-xs leading-6">直接调用 llm-for-zotero 已配置、最近使用的大模型。接口、密钥、模型与连接测试统一在 llm-for-zotero 中管理。</p>
                  <button type="button" onClick={() => openZoteroPreferences('llm-for-zotero')}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs">
                    打开 llm-for-zotero 设置
                  </button>
                  <p className="text-[11px] leading-5 text-slate-500">请安装并启用 llm-for-zotero 3.9.11 或以上版本。当前集成支持 API 模型；WebChat、Codex App Server 与 Claude Code 对话系统暂不支持。</p>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                      PDF 论文单篇最大读取页数
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[50, 120, 200].map((pages) => (
                        <button
                          key={pages}
                          type="button"
                          onClick={() => {
                            setCurrentSettings((s) => ({ ...s, aiMaxPdfPages: pages }));
                            void handleSaveSettings({ aiMaxPdfPages: pages });
                          }}
                          className={`py-1.5 text-xs rounded-xl font-medium border transition-colors ${
                            (currentSettings.aiMaxPdfPages || 120) === pages
                              ? 'bg-purple-600 text-white border-purple-600 font-semibold'
                              : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {pages} 页
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
  );
};
