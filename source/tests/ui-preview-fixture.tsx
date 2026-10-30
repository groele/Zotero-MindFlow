import React from 'react';
import { createRoot } from 'react-dom/client';
import { Toolbar } from '../src/components/toolbar/Toolbar';
import { PropertySidebar } from '../src/components/sidebar/PropertySidebar';
import { createBlankDocument } from '../src/core/model/sampleData';
const params = new URLSearchParams(location.search);
const noop = () => {};
const placement = (key: string): 'toolbar' | 'more' | 'hidden' => { const value = params.get(key); return value === 'toolbar' || value === 'hidden' ? value : 'more'; };
const doc = createBlankDocument();
doc.root.text = '文献研究笔记';
if (params.has('linked')) doc.root.internalLink = { documentId: doc.id, nodeId: doc.root.id };
if (params.has('image')) doc.root.image = { width: 120, aspectRatio: 1,
  dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=' };
const props: React.ComponentProps<typeof Toolbar> = {
  toolbarTemplatesPlacement: placement('templates'), toolbarPresentationPlacement: placement('presentation'), toolbarExportPlacement: placement('export'),
  title: '文献研究笔记', saveStatus: { state: 'saved', message: '已保存到本地' },
  onTitleChange: noop, canUndo: true, canRedo: false, onUndo: noop, onRedo: noop,
  onAddChild: noop, onAddSibling: noop, onDeleteNode: noop, hasSelection: true,
  currentLayout: 'mindmap', onLayoutChange: noop, currentThemeId: 'classic-blue', onThemeChange: noop,
  scale: 1, onZoomIn: noop, onZoomOut: noop, onResetZoom: noop, isOutlineOpen: false,
  onToggleOutline: noop, onOpenShortcuts: noop, onExportPNG: noop, onExportSVG: noop,
  onExportMarkdown: noop, onExportJSON: noop, onImportFile: noop,
  onOpenCommandPalette: noop, onOpenSearch: noop, onOpenSettings: noop,
  onOpenTemplates: noop, onStartPresentation: noop, onToggleZen: noop, onImportNodeImage: noop,
  onCollapseByLevel: noop, onAnalyzeZoteroPaper: noop, isZoteroMode: true,
};
const dark = new URLSearchParams(location.search).has('dark');
createRoot(document.getElementById('root')!).render(
  <div style={{ backgroundColor: dark ? '#0f172a' : '#f8fafc' }} className={`mindflow-app ${dark ? 'dark' : ''} h-screen flex flex-col`}>
    <Toolbar {...props} />
    <div className="flex flex-1 min-h-0"><div className="flex-1 min-w-0" />
      <PropertySidebar currentDoc={doc} selectedNode={doc.root} onUpdateNode={noop}
        onImportImage={async () => {}} onClose={noop} />
    </div>
  </div>
);
