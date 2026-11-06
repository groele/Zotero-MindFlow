import {
  Link, Palette, Shapes, Star, Flag, CheckCircle2, HelpCircle,
  ImagePlus, Trash2
} from 'lucide-react';
import type { NodeShape } from '../../core/model/types';
import { imageDisplayHeight } from '../../core/model/nodeImage';
import { COLOR_PRESETS } from './PropertySidebarUtils';
import type { PropertySidebarCtx } from './PropertySidebarUtils';

export const PropertySidebarNodeFields = ({ ctx }: { ctx: PropertySidebarCtx }) => {
  const {
    selectedNode, onUpdateNode, onImportImage,
    nodeText, setNodeText, imageBusy, setImageBusy, imageError, setImageError,
    imageInputRef, linkText, setLinkText, linkError,
    handleShapeChange, handleColorChange, handleLinkBlur, toggleIcon,
    nodeImage, currentIcons,
  } = ctx;
  return (
    <>
      <div className="space-y-2">
        <label htmlFor="node-text" className="font-medium text-slate-500">节点文字</label>
        <input id="node-text" value={nodeText} onChange={event => setNodeText(event.target.value)}
          onBlur={() => { if (nodeText !== selectedNode.text) onUpdateNode(selectedNode.id, { text: nodeText }); }}
          onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }}
          placeholder="可为空，保留纯图片节点"
          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-blue-400" />
      </div>

      <details open={Boolean(selectedNode.image)} className="mindflow-inspector-section space-y-2 p-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-sky-50/60 dark:bg-sky-950/20">
        <summary><span className="inline-flex items-center gap-1.5 font-medium"><ImagePlus className="w-3.5 h-3.5" /> 节点图片</span></summary>
        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">导入图片，或向选中节点粘贴截图。支持 PNG、JPEG、WebP。</p>
        <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" aria-label="选择节点图片"
          onChange={async event => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file) return;
            setImageBusy(true);
            setImageError('');
            try { await onImportImage(selectedNode.id, file); }
            catch (error: any) { setImageError(error?.message || '图片导入失败'); }
            finally { setImageBusy(false); }
          }} />
        {nodeImage && <>
          <img src={nodeImage.dataUrl} alt={selectedNode.text || '节点图片预览'}
            style={{ maxHeight: 150 }} className="max-w-full mx-auto object-contain rounded-lg border border-slate-200 dark:border-slate-700" />
          <div className="flex items-center justify-between text-[11px]"><span>显示宽度</span><span>{nodeImage.width} px · 高约 {imageDisplayHeight(nodeImage)} px</span></div>
          <input type="range" min="80" max="480" step="10" value={nodeImage.width} aria-label="调整节点图片宽度"
            onChange={event => onUpdateNode(selectedNode.id, { image: { ...nodeImage, width: Number(event.target.value) } })}
            className="w-full accent-blue-600" />
        </>}
        {selectedNode.image && !nodeImage && <p role="alert" className="text-[11px] text-red-600">此节点图片数据无效，可替换或删除。</p>}
        <div className="flex gap-2">
          <button type="button" disabled={imageBusy} onClick={() => imageInputRef.current?.click()}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50">{imageBusy ? '处理中…' : selectedNode.image ? '替换图片' : '导入图片'}</button>
          {selectedNode.image && <button type="button" onClick={() => onUpdateNode(selectedNode.id, { image: undefined, type: selectedNode.type === 'image' ? 'topic' : selectedNode.type })}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-red-600 flex items-center gap-1"><Trash2 className="w-3 h-3" /> 删除图片</button>}
        </div>
        {imageError && <p role="alert" className="text-[11px] text-red-600">{imageError}</p>}
      </details>

      {/* Node Shape */}
      <div>
        <label className="flex items-center gap-1.5 font-medium text-slate-500 mb-2">
          <Shapes className="w-3.5 h-3.5" /> 节点形状
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {(['rounded', 'pill', 'rectangle', 'underline'] as NodeShape[]).map((shape) => (
            <button
              key={shape}
              aria-pressed={(selectedNode.shape || 'rounded') === shape}
              onClick={() => handleShapeChange(shape)}
              className={`py-1.5 text-center text-[11px] rounded-lg border transition-all ${
                (selectedNode.shape || 'rounded') === shape
                  ? 'border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300 font-semibold'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {shape === 'rounded' ? '圆角' : shape === 'pill' ? '胶囊' : shape === 'rectangle' ? '矩形' : '下划线'}
            </button>
          ))}
        </div>
      </div>

      {/* Color Palette */}
      <div>
        <label className="flex items-center gap-1.5 font-medium text-slate-500 mb-2">
          <Palette className="w-3.5 h-3.5" /> 分支与高亮颜色
        </label>
        <div className="grid grid-cols-6 gap-2">
          {COLOR_PRESETS.map((color) => (
            <button
              key={color}
              onClick={() => handleColorChange(color)}
              aria-label={`分支颜色 ${color}`}
              aria-pressed={selectedNode.color === color}
              title={color}
              className={`w-7 h-7 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center ${
                selectedNode.color === color ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-slate-900' : ''
              }`}
            ><span aria-hidden="true" className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} /></button>
          ))}
        </div>
      </div>

      {/* Priority & Status Badges */}
      <div>
        <label className="flex items-center gap-1.5 font-medium text-slate-500 mb-2">
          <Star className="w-3.5 h-3.5" /> 图标徽章
        </label>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => toggleIcon('priority-1')}
            className={`px-2 py-1 rounded text-xs font-bold border transition-colors ${
              currentIcons.includes('priority-1') ? 'bg-red-500 text-white border-red-500' : 'border-slate-200 text-slate-700'
            }`}
          >
            P1
          </button>
          <button
            onClick={() => toggleIcon('priority-2')}
            className={`px-2 py-1 rounded text-xs font-bold border transition-colors ${
              currentIcons.includes('priority-2') ? 'bg-amber-500 text-white border-amber-500' : 'border-slate-200 text-slate-700'
            }`}
          >
            P2
          </button>
          <button
            onClick={() => toggleIcon('priority-3')}
            className={`px-2 py-1 rounded text-xs font-bold border transition-colors ${
              currentIcons.includes('priority-3') ? 'bg-blue-500 text-white border-blue-500' : 'border-slate-200 text-slate-700'
            }`}
          >
            P3
          </button>
          <button
            onClick={() => toggleIcon('star')}
            className={`p-1.5 rounded border transition-colors ${
              currentIcons.includes('star') ? 'bg-amber-100 border-amber-400 text-amber-600' : 'border-slate-200 text-slate-400'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => toggleIcon('flag')}
            className={`p-1.5 rounded border transition-colors ${
              currentIcons.includes('flag') ? 'bg-red-100 border-red-400 text-red-600' : 'border-slate-200 text-slate-400'
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => toggleIcon('check')}
            className={`p-1.5 rounded border transition-colors ${
              currentIcons.includes('check') ? 'bg-emerald-100 border-emerald-400 text-emerald-600' : 'border-slate-200 text-slate-400'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => toggleIcon('question')}
            className={`p-1.5 rounded border transition-colors ${
              currentIcons.includes('question') ? 'bg-sky-100 border-sky-400 text-sky-600' : 'border-slate-200 text-slate-400'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>


      {/* Hyperlink */}
      <div>
        <label className="flex items-center gap-1.5 font-medium text-slate-500 mb-1.5">
          <Link className="w-3.5 h-3.5" /> 超链接网址
        </label>
        <input
          type="url"
          value={linkText}
          placeholder="https://example.com"
          onChange={(e) => setLinkText(e.target.value)}
          onBlur={handleLinkBlur}
          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-blue-400 text-xs"
        />
        {linkError && <p role="alert" className="mt-1 text-[11px] text-red-600">{linkError}</p>}
      </div>
    </>
  );
};
