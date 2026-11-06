import { ContextMenu } from '../../components/menu/ContextMenu';
import { addChildNode } from '../../core/model/treeOps';
import { playAddNode } from '../../services/audio/soundService';
import { locateItemInZotero, openExternalUrl, openItemPdfInZotero } from '../../services/zotero/zoteroBridge';
import { CanvasContextMenu } from '../../components/menu/CanvasContextMenu';
import { PresentationMode } from '../../components/presentation/PresentationMode';
import type { AppContext } from './appContext';

export const AppContextMenus = ({ ctx }: { ctx: AppContext }) => {
  const { workspaceRestoring, doc, setDoc, setSelectedId, setSelectedIds,
         setEditingId, setViewport, clipboardSubtreeRef, isPresentationOpen, setIsPresentationOpen,
         contextMenuState, setContextMenuState, canvasContextMenuState, setCanvasContextMenuState, settings,
         setSettings, centerCanvas, theme, layout, commitRootChange,
         handleAddSibling, handleCopyNode, handlePasteNode, handleDuplicateNode, handleDeleteNode,
         handleToggleCollapse, handleSelectAndCenterNode } = ctx;
  return (
    <>
      {/* Node Context Menu (Right Click) */}
      {contextMenuState && (
        <ContextMenu
          x={contextMenuState.x}
          y={contextMenuState.y}
          node={contextMenuState.node}
          onClose={() => setContextMenuState(null)}
          onAddChild={(id) => {
            const { newRoot, newNodeId } = addChildNode(doc.root, id, '分支主题');
            commitRootChange(newRoot);
            setSelectedId(newNodeId);
            setSelectedIds([]);
            playAddNode(settings.soundEffects);
          }}
          onAddSibling={() => handleAddSibling(false)}
          onDelete={(id) => handleDeleteNode(id)}
          onCopyNode={(id) => handleCopyNode(id, true)}
          onDuplicateNode={(id) => handleDuplicateNode(id)}
          onPasteSubtree={(id) => handlePasteNode(id)}
          hasClipboardContent={!!clipboardSubtreeRef.current}
          onToggleCollapse={handleToggleCollapse}
          onStartEdit={(id) => setEditingId(id)}
          onFocusSubtree={(id) => handleSelectAndCenterNode(id)}
          documentTargetKey={doc?.metadata?.zoteroItemKey || doc?.metadata?.zoteroUri}
          onLocateZoteroItem={async (uri, text, note) => {
            const located = await locateItemInZotero(uri, text, { noteText: note });
            if (!located && (uri.startsWith('http://') || uri.startsWith('https://'))) {
              openExternalUrl(uri);
            }
          }}
          onOpenZoteroPdf={(uri, text, note) => openItemPdfInZotero(uri, text, note)}
        />
      )}

      {/* Canvas Context Menu (Right Click on Empty Canvas) */}
      {canvasContextMenuState && (
        <CanvasContextMenu
          x={canvasContextMenuState.x}
          y={canvasContextMenuState.y}
          onClose={() => setCanvasContextMenuState(null)}
          onCenterCanvas={() => centerCanvas(layout.bounds)}
          onResetZoom={() => setViewport((v: any) => ({ ...v, scale: 1.0 }))}
          onFitView={() => centerCanvas(layout.bounds)}
          onAddRootChild={() => {
            if (!doc) return;
            const { newRoot, newNodeId } = addChildNode(doc.root, doc.root.id, '新分支主题');
            commitRootChange(newRoot);
            setSelectedId(newNodeId);
            playAddNode(settings.soundEffects);
          }}
          onPasteSubtree={() => {
            if (doc && clipboardSubtreeRef.current) {
              handlePasteNode(doc.root.id);
            }
          }}
          hasClipboardContent={!!clipboardSubtreeRef.current}
          canvasBackground={settings.canvasBackground}
          onChangeCanvasBackground={(bg) => setSettings((prev: any) => ({ ...prev, canvasBackground: bg }))}
          onToggleTheme={() => {
            const nextTheme = theme.isDark ? 'classic-blue' : 'dark-nebula';
            setDoc((prev: any) => (prev ? { ...prev, themeId: nextTheme } : null));
          }}
          isDark={theme.isDark}
          boundItemTitle={doc.metadata?.zoteroItemTitle}
          onLocateZoteroItem={doc.metadata?.zoteroItemKey ? () => { void locateItemInZotero(doc.metadata!.zoteroItemKey, doc.metadata?.zoteroItemTitle); } : undefined}
          onOpenZoteroPdf={doc.metadata?.zoteroItemKey ? () => { void openItemPdfInZotero(doc.metadata!.zoteroItemKey, doc.metadata?.zoteroItemTitle); } : undefined}
        />
      )}

      {/* Fullscreen Presentation Mode */}
      <PresentationMode
        isOpen={isPresentationOpen}
        onClose={() => setIsPresentationOpen(false)}
        rootNode={doc.root}
        theme={theme}
      />
      {workspaceRestoring && (
        <div role="status" aria-live="polite" className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/30 backdrop-blur-sm">
          <div className="rounded-xl bg-white px-6 py-4 text-sm text-slate-700 shadow-xl">{workspaceRestoring === 'snapshot' ? '正在恢复快照，请稍候…' : '正在恢复工作区，请稍候…'}</div>
        </div>
      )}
    </>
  );
};
