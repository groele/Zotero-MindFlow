import { LeftWorkbench } from '../../components/sidebar/LeftWorkbench';
import { addChildNode, deleteNode } from '../../core/model/treeOps';
import { CanvasErrorBoundary } from '../../components/canvas/CanvasErrorBoundary';
import { Canvas } from '../../components/canvas/Canvas';
import { CanvasSearch } from '../../components/search/CanvasSearch';
import { Minimap } from '../../components/minimap/Minimap';
import { PropertySidebar } from '../../components/sidebar/PropertySidebar';
import type { AppContext } from './appContext';

export const AppWorkspace = ({ ctx }: { ctx: AppContext }) => {
  const { isSidepanelMode, doc, setDoc, selectedId, setSelectedId,
         selectedIds, setEditingId, editingId, isZoteroMode, viewport,
         setViewport, isWorkbenchOpen, setIsWorkbenchOpen, workbenchTab, setWorkbenchTab,
         dockPosition, isPropertySidebarOpen, setIsPropertySidebarOpen, setIsWelcomeOpen, isZenMode,
         isSearchOpen, setIsSearchOpen, searchMatchedIds, setSearchMatchedIds, focusedTag,
         setFocusedTag, relationships, settings, latestDocRef, latestRelationshipsRef,
         emergencyDraftRef, currentDocIdRef, getEmergencyDocument, historyRef, containerRef,
         containerSize, syncHistoryState, handleToggleDockPosition, centerCanvas, flushCurrentDocument,
         theme, layout, commitRootChange, handleSelectNode, handleSelectMultipleNodes,
         handleAddChild, handleAddSibling, handleDeleteNode, handleToggleCollapse, handleMoveNode,
         handleUpdateNodePatch, handleCycleTaskStatus, handleImportNodeImage, handleCommitEdit, handleSelectAndCenterNode,
         openDocumentAt, handleContextMenuNode, handleContextMenuCanvas, handleCreateRelationship, handleDeleteRelationship,
         handleEditRelationshipLabel, handleReplaceNodeText, handleReplaceAllNodeText, handleBatchColor, handleBatchDelete,
         handleInsertInboxItem, handleOpenSettings, handleRestoreCurrentSnapshot, handleRestoreWorkspace, selectedNode,
         inspectorDockSide } = ctx;
  return (
    <>
      {/* Main Workspace Area */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden flex">
        {/* Left / Right Workbench (Documents, Outline, Inbox, Backup) */}
        {!isZenMode && (
          <LeftWorkbench
            key={doc.id}
            currentDoc={doc}
            selectedId={selectedId}
            isOpen={isWorkbenchOpen}
            activeTab={workbenchTab}
            dockPosition={dockPosition}
            isZoteroMode={isZoteroMode}
            onToggleOpen={() => {
              if (!isWorkbenchOpen) setIsWorkbenchOpen(true);
              else void flushCurrentDocument().then((saved: any) => { if (saved) setIsWorkbenchOpen(false); });
            }}
            onTabChange={(tab) => {
              void flushCurrentDocument().then((saved: any) => { if (saved) setWorkbenchTab(tab); });
            }}
            focusedTag={focusedTag}
            onFocusTag={setFocusedTag}
            onToggleDockPosition={handleToggleDockPosition}
            onSelectDoc={(id) => { void openDocumentAt(id); }}
            onNewDoc={() => setIsWelcomeOpen(true)}
            onSelectNode={handleSelectAndCenterNode}
            onUpdateNodeText={(id, text) => handleUpdateNodePatch(id, { text })}
            onAddChildNode={(parentId) => {
              const { newRoot, newNodeId } = addChildNode(doc.root, parentId, '新条目');
              commitRootChange(newRoot);
              setSelectedId(newNodeId);
            }}
            onDeleteNode={(id) => {
              const { newRoot, nextSelectedId } = deleteNode(doc.root, id);
              commitRootChange(newRoot);
              setSelectedId(nextSelectedId);
            }}
            onInsertInboxItem={handleInsertInboxItem}
            onRestoreSnapshot={handleRestoreCurrentSnapshot}
            onRestoreWorkspace={handleRestoreWorkspace}
            onFlushCurrentDocument={flushCurrentDocument}
            onOpenSettings={handleOpenSettings}
          />
        )}

        {/* Central Infinite Canvas */}
        <div className="flex-1 h-full relative overflow-hidden" onInputCapture={(event) => {
          const input = event.target as HTMLInputElement;
          const id = input.dataset?.mindflowNodeDraft;
          if (id && currentDocIdRef.current) {
            emergencyDraftRef.current = { documentId: currentDocIdRef.current, id, text: input.value };
          }
        }}>
          <CanvasErrorBoundary key={doc.id} getDocument={getEmergencyDocument} onReset={() => {
            const recovered = getEmergencyDocument();
            if (recovered) {
              if (latestDocRef.current && recovered.root !== latestDocRef.current.root) {
                historyRef.current.push({ root: latestDocRef.current.root, relationships: latestRelationshipsRef.current });
                syncHistoryState();
              }
              latestDocRef.current = recovered;
              setDoc(recovered);
              emergencyDraftRef.current = null;
              setEditingId(null);
            }
            centerCanvas(layout.bounds);
          }}>
            <Canvas
              nodes={layout.nodes}
              connections={layout.connections}
              relationships={relationships}
              bounds={layout.bounds}
              theme={theme}
              selectedId={selectedId}
              selectedIds={selectedIds}
              editingId={editingId}
              viewport={viewport}
              canvasBackground={settings.canvasBackground}
              zoomStep={settings.zoomStep}
              onViewportChange={setViewport}
              onSelectNode={handleSelectNode}
              onSelectMultipleNodes={handleSelectMultipleNodes}
              onStartEditNode={(id) => setEditingId(id)}
              onCommitEditNode={handleCommitEdit}
              onCancelEditNode={() => { emergencyDraftRef.current = null; setEditingId(null); }}
              onToggleCollapse={handleToggleCollapse}
              onCycleTaskStatus={handleCycleTaskStatus}
              onOpenInternalLink={(documentId, nodeId) => { void openDocumentAt(documentId, nodeId); }}
              onMoveNode={handleMoveNode}
              searchMatchedIds={searchMatchedIds}
              focusedTag={focusedTag}
              onContextMenuNode={handleContextMenuNode}
              onContextMenuCanvas={handleContextMenuCanvas}
              onAddChildNode={handleAddChild}
              onAddSiblingNode={() => handleAddSibling(false)}
              onImportNodeImage={(id, file) => handleImportNodeImage(file, id)}
              onDeleteSelectedNode={(id) => handleDeleteNode(id)}
              onQuickColorNode={(id, color) => handleUpdateNodePatch(id, { color })}
              onCreateRelationship={handleCreateRelationship}
              onDeleteRelationship={handleDeleteRelationship}
              onEditRelationshipLabel={handleEditRelationshipLabel}
              onBatchColor={handleBatchColor}
              onBatchDelete={handleBatchDelete}
            />
          </CanvasErrorBoundary>

          {/* In-Canvas Search Floating Widget */}
          <CanvasSearch
            key={doc.id}
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            rootNode={doc.root}
            onJumpToNode={handleSelectAndCenterNode}
            onHighlightMatches={setSearchMatchedIds}
            onReplaceCurrent={handleReplaceNodeText}
            onReplaceAll={handleReplaceAllNodeText}
          />

          {/* Minimap Widget (Hidden in Zen or Sidepanel mode) */}
          {!isSidepanelMode && !isZenMode && (
            <div className={`absolute bottom-4 z-20 ${dockPosition === 'left' ? 'right-4' : 'left-4'}`}>
              <Minimap
                nodes={layout.nodes}
                bounds={layout.bounds}
                viewport={viewport}
                containerWidth={containerSize.width}
                containerHeight={containerSize.height}
                onNavigate={(newX, newY) => setViewport((v: any) => ({ ...v, x: newX, y: newY }))}
              />
            </div>
          )}
        </div>

        {/* Opposite Inspector Sidebar (Node Style, Task, Icons, Tags, Note, Link) */}
        {!isZenMode && isPropertySidebarOpen && selectedNode && (
          <PropertySidebar
            key={doc.id}
            selectedNode={selectedNode}
            currentDoc={doc}
            onUpdateNode={handleUpdateNodePatch}
            onImportImage={(id, file) => handleImportNodeImage(file, id)}
            onOpenInternalLink={(documentId, nodeId) => { void openDocumentAt(documentId, nodeId); }}
            onClose={() => setIsPropertySidebarOpen(false)}
            dockSide={inspectorDockSide}
          />
        )}
      </div>
    </>
  );
};
