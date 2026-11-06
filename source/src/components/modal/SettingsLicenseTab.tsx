import { Sparkles, CheckCircle2, Check } from 'lucide-react';

export const SettingsLicenseTab = () => {
  return (
              <div className="space-y-4">
                {/* 100% Free Status Banner */}
                <div className="p-4 rounded-2xl border bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/30">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          MindFlow 全功能永久免费开放
                        </h4>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                          100% FREE • 全功能无限制
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        MindFlow 已彻底取消任何会员收费限制与门槛，所有 10+ 款主题、无水印商业导出及高级扩展功能面向全体用户永久免费开放！
                      </p>
                    </div>
                  </div>
                </div>

                {/* Features Unlocked List */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                  <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-2 text-[11px] font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 flex justify-between">
                    <span>已解锁全部高级功能清单</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ 全部免费开放</span>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60 text-[11px]">
                    {[
                      { name: '10 大全量专业主题 (赛博朋克/学术纸感/极夜/莫兰迪等)', status: '全部 10+ 款无限制' },
                      { name: '商业级路演演示模式 (Presentation Mode)', status: '全屏演讲自由使用' },
                      { name: '4K PNG / 矢量 SVG / HTML 导出', status: '纯净无水印' },
                      { name: '多版本历史快照备份与时光机穿梭 (Snapshots)', status: '无限快照容量' },
                      { name: 'WebDAV 实时增量云端自动同步', status: '无限制自动同步' },
                      { name: '大型复杂导图子树下钻专注 (Focus Subtree)', status: '任意分支独立下钻' },
                      { name: 'OPML 2.0 / Markdown 待办勾选双向互通', status: '全格式生态开放' },
                      { name: '原生微交互音效反馈与彩虹分支谱系', status: '全部个性化视觉艺术' },
                    ].map((item, idx) => (
                      <div key={idx} className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <span className="font-medium text-slate-700 dark:text-slate-200">{item.name}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>无需付费、无需输入激活码，您已享有当前及后续版本的所有完整功能与服务。</span>
                  </div>
                </div>
              </div>
  );
};
