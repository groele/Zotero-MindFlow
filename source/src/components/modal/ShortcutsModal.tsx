import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcutGroups = [
    {
      category: '节点编辑与结构组织',
      items: [
        { keys: ['Tab'], desc: '插入子节点（Child Node）' },
        { keys: ['Enter'], desc: '在下方插入同级节点（Sibling Below）' },
        { keys: ['Shift', 'Enter'], desc: '在上方插入同级节点（Sibling Above）' },
        { keys: ['Space / F2 / 双击'], desc: '进入节点文本编辑模式' },
        { keys: ['/'], desc: '折叠 / 展开当前选中分支 (Toggle Collapse)' },
        { keys: ['Enter (编辑中)'], desc: '提交并保存文本修改' },
        { keys: ['Esc (编辑中)'], desc: '取消编辑并恢复原文本' },
        { keys: ['Ctrl / Cmd', 'C'], desc: '复制选中主题分支' },
        { keys: ['Ctrl / Cmd', 'V'], desc: '粘贴内部复制的分支，或为节点粘贴图片' },
        { keys: ['Ctrl / Cmd', 'D'], desc: '快速克隆创建分支副本 (Duplicate)' },
        { keys: ['Delete / Backspace'], desc: '删除当前选中节点及其子分支' },
      ],
    },
    {
      category: '画布漫游与视图控制',
      items: [
        { keys: ['↑', '↓', '←', '→'], desc: '按空间方位在相邻节点间导航游走' },
        { keys: ['Alt', '1 / 2 / 3'], desc: '快速折叠至 1 / 2 / 3 级分支' },
        { keys: ['Alt', '0'], desc: '展开全部层级分支' },
        { keys: ['Shift + 鼠标拖拽'], desc: '拉出矩形选框，批量多选节点' },
        { keys: ['Ctrl / Cmd', '滚轮'], desc: '以鼠标指针为中心平滑缩放' },
        { keys: ['双指捏合'], desc: '触控手势与触控板平滑缩放' },
        { keys: ['空格 + 拖拽 / 单指拖动'], desc: '鼠标或触控拖动画布平移' },
        { keys: ['鼠标中键拖拽'], desc: '平移无限画布视野' },
        { keys: ['Ctrl / Cmd', '1'], desc: '自适应全图居中 (Fit to Screen)' },
        { keys: ['Ctrl / Cmd', '0'], desc: '恢复 100% 缩放 (Reset Zoom)' },
        { keys: ['F5 / Alt + P'], desc: '切换全屏演示模式 (Presentation Mode)' },
        { keys: ['F11'], desc: '切换窗口全屏' },
        { keys: ['拖拽节点卡片'], desc: '重新挂载重排节点归属' },
      ],
    },
    {
      category: '文档归档与系统操作',
      items: [
        { keys: ['Ctrl / Cmd', 'S'], desc: '立即保存本地并归档到 Zotero 文献附件' },
        { keys: ['Ctrl / Cmd', 'F'], desc: '全图即时搜索' },
        { keys: ['Ctrl / Cmd', 'H'], desc: '全图即时搜索与替换' },
        { keys: ['Ctrl / Cmd', 'K'], desc: '打开快捷命令面板 (Command Palette)' },
        { keys: ['Ctrl / Cmd', 'Z'], desc: '撤销上一步操作 (Undo)' },
        { keys: ['Ctrl / Cmd', 'Y'], desc: '重做上一步操作 (Redo)' },
        { keys: ['Ctrl / Cmd', ','], desc: '打开 MindFlow 偏好设置面板' },
        { keys: ['?'], desc: '打开本快捷键与全键盘操作指南' },
        { keys: ['Esc'], desc: '取消选中节点 / 关闭弹窗 / 退出演示与禅模式' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-bold text-base">
            <Keyboard className="w-5 h-5 text-blue-600" />
            <span>全键盘操作指南与快捷键</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6 text-xs">
          {shortcutGroups.map((group) => (
            <div key={group.category}>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                {group.category}
              </h4>
              <div className="space-y-2">
                {group.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">
                      {item.desc}
                    </span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k) => (
                        <kbd
                          key={k}
                          className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md font-mono text-[11px] text-slate-700 dark:text-slate-200 shadow-sm"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs shadow-sm transition-colors"
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  );
};
