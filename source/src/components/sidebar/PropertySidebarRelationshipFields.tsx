import {
  Link2, GraduationCap, MapPin, BookOpen, RefreshCw, Check, Loader2
} from 'lucide-react';
import { extractDoi, locateItemInZotero, openItemPdfInZotero, saveMindMapToZoteroAttachment, openExternalUrl } from '../../services/zotero/zoteroBridge';
import type { PropertySidebarCtx } from './PropertySidebarUtils';

const PropertySidebarZoteroBox = ({ ctx }: { ctx: PropertySidebarCtx }) => {
  const {
    selectedNode, currentDoc, isLocatingItem, setIsLocatingItem, setSyncStatusMsg,
    setIsOpeningPdf, isOpeningPdf, isSyncingToZotero, setIsSyncingToZotero, syncStatusMsg,
  } = ctx;
  const nodeDoi = extractDoi(selectedNode.link) || extractDoi(selectedNode.text) || extractDoi(selectedNode.note);
  const nodeSpecificTarget =
    (selectedNode.link && selectedNode.link.startsWith('zotero://') ? selectedNode.link : null) ||
    (nodeDoi ? `https://doi.org/${nodeDoi}` : null);
  const zoteroTargetKey =
    nodeSpecificTarget ||
    currentDoc.metadata?.zoteroItemKey ||
    currentDoc.metadata?.zoteroUri;

  if (!zoteroTargetKey) return null;

  const handleLocateItem = async () => {
    if (isLocatingItem) return;
    setIsLocatingItem(true);
    try {
      const success = await locateItemInZotero(zoteroTargetKey, selectedNode.text, { noteText: selectedNode.note });
      if (!success) {
        if (zoteroTargetKey.startsWith('http://') || zoteroTargetKey.startsWith('https://')) {
          openExternalUrl(zoteroTargetKey);
          setSyncStatusMsg('未在文献库中找到对应条目，已在默认浏览器中打开外部链接');
        } else {
          setSyncStatusMsg('未在当前文献库中检索到对应条目');
        }
        setTimeout(() => setSyncStatusMsg(null), 3500);
      }
    } catch (err: any) {
      setSyncStatusMsg('定位条目失败: ' + (err?.message || err));
      setTimeout(() => setSyncStatusMsg(null), 3500);
    } finally {
      setTimeout(() => setIsLocatingItem(false), 800);
    }
  };

  const handleOpenPdf = async () => {
    setIsOpeningPdf(true);
    try {
      const success = await openItemPdfInZotero(zoteroTargetKey, selectedNode.text, selectedNode.note);
      if (!success) {
        setSyncStatusMsg('未检测到 PDF 附件，已在文库中定位文献');
        setTimeout(() => setSyncStatusMsg(null), 3500);
      }
    } catch (err: any) {
      setSyncStatusMsg('打开 PDF 失败: ' + (err?.message || err));
      setTimeout(() => setSyncStatusMsg(null), 3500);
    } finally {
      setTimeout(() => setIsOpeningPdf(false), 800);
    }
  };

  const handleManualSync = async () => {
    setIsSyncingToZotero(true);
    setSyncStatusMsg(null);
    try {
      const res = await saveMindMapToZoteroAttachment(currentDoc, zoteroTargetKey, { silent: true });
      if (res.success) {
        setSyncStatusMsg(res.message || '已同步至文献附件');
      } else {
        setSyncStatusMsg(res.message || '未关联到对应条目');
      }
    } catch (err: any) {
      setSyncStatusMsg('同步出错: ' + (err?.message || err));
    } finally {
      setIsSyncingToZotero(false);
      setTimeout(() => setSyncStatusMsg(null), 3500);
    }
  };

  const docZoteroTitle = currentDoc.metadata?.zoteroItemTitle;

  return (
    <div className="p-3 rounded-xl border border-sky-200 dark:border-sky-900 bg-sky-50/60 dark:bg-sky-950/20 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-medium text-xs text-sky-700 dark:text-sky-300">
          <GraduationCap className="w-4 h-4 text-sky-600" />
          <span>Zotero 文献伴读与归档</span>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 font-medium">
          双向联动
        </span>
      </div>

      {docZoteroTitle && (
        <div className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 bg-white/70 dark:bg-slate-800/70 p-1.5 rounded-lg border border-sky-100 dark:border-sky-900/40">
          <span className="font-semibold text-slate-700 dark:text-slate-300">关联条目：</span>
          {docZoteroTitle}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleLocateItem}
          disabled={isLocatingItem}
          className="flex-1 py-1.5 px-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-75"
        >
          {isLocatingItem ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>正在定位...</span>
            </>
          ) : (
            <>
              <MapPin className="w-3.5 h-3.5" />
              <span>文库定位</span>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleOpenPdf}
          disabled={isOpeningPdf}
          className="flex-1 py-1.5 px-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-75"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>{isOpeningPdf ? '正在打开...' : '阅读 PDF'}</span>
        </button>
      </div>

      <button
        type="button"
        onClick={handleManualSync}
        disabled={isSyncingToZotero}
        className="w-full py-1.5 px-2 bg-sky-100 hover:bg-sky-200 dark:bg-sky-900/40 dark:hover:bg-sky-900/70 text-sky-800 dark:text-sky-200 border border-sky-300/60 dark:border-sky-800 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
      >
        {isSyncingToZotero ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>正在同步归档...</span>
          </>
        ) : (
          <>
            <RefreshCw className="w-3.5 h-3.5" />
            <span>立即同步至条目附件与笔记</span>
          </>
        )}
      </button>

      {syncStatusMsg && (
        <div className="text-[10px] text-center text-emerald-600 dark:text-emerald-400 font-medium flex items-center justify-center gap-1">
          <Check className="w-3 h-3" />
          <span>{syncStatusMsg}</span>
        </div>
      )}
    </div>
  );
};

export const PropertySidebarRelationshipFields = ({ ctx }: { ctx: PropertySidebarCtx }) => {
  const {
    selectedNode, currentDoc, documents, targetNodes, targetSearch, setTargetSearch,
    onUpdateNode, onOpenInternalLink,
  } = ctx;
  return (
    <>
      <PropertySidebarZoteroBox ctx={ctx} />

      {/* Link to another document or a specific topic */}
      <details open={Boolean(selectedNode.internalLink)} className="mindflow-inspector-section space-y-2 p-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-teal-50/50 dark:bg-teal-950/20">
        <summary><span className="inline-flex items-center gap-1.5 font-medium">
          <Link2 className="w-3.5 h-3.5" /> 关联导图主题
        </span></summary>
        <select
          value={selectedNode.internalLink?.documentId || ''}
          onChange={(event) => {
            setTargetSearch('');
            onUpdateNode(selectedNode.id, { internalLink: event.target.value ? { documentId: event.target.value } : undefined });
          }}
          aria-label="选择关联导图"
          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
        >
          <option value="">不关联</option>
          {selectedNode.internalLink && !documents.some(document => document.id === selectedNode.internalLink?.documentId) && currentDoc.id !== selectedNode.internalLink.documentId &&
            <option value={selectedNode.internalLink.documentId}>目标导图已删除</option>}
          {documents.map(document => <option key={document.id} value={document.id}>{document.title}</option>)}
          {!documents.some(document => document.id === currentDoc.id) && <option value={currentDoc.id}>{currentDoc.title}</option>}
        </select>
        {selectedNode.internalLink && (
          <>
            <p className="text-[10px] text-slate-500">目标主题：{targetNodes.find(node => node.id === selectedNode.internalLink?.nodeId)?.text || (targetNodes.length ? '中心主题或主题已删除' : '目标导图不可用')}</p>
            <input
              value={targetSearch}
              onChange={event => setTargetSearch(event.target.value)}
              placeholder="搜索目标主题（留空为中心主题）"
              aria-label="搜索关联主题"
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
            {targetSearch.trim() && (
              <div className="max-h-32 overflow-y-auto space-y-0.5">
                {targetNodes.filter(node => node.text.toLocaleLowerCase().includes(targetSearch.trim().toLocaleLowerCase())).slice(0, 20).map(node => (
                  <button key={node.id} type="button" onClick={() => {
                    onUpdateNode(selectedNode.id, { internalLink: { documentId: selectedNode.internalLink!.documentId, nodeId: node.id } });
                    setTargetSearch('');
                  }} className="block w-full text-left truncate px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800" title={node.text}>
                    {'· '.repeat(Math.min(node.depth, 5))}{node.text}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={() => onUpdateNode(selectedNode.id, { internalLink: { documentId: selectedNode.internalLink!.documentId } })} className="text-[11px] text-blue-600">指向中心主题</button>
              <button type="button" onClick={() => onOpenInternalLink?.(selectedNode.internalLink!.documentId, selectedNode.internalLink!.nodeId)} className="text-[11px] font-medium text-slate-700 dark:text-slate-300">打开目标</button>
            </div>
          </>
        )}
      </details>
    </>
  );
};
