import { CommandPalette } from '../../components/command/CommandPalette';
import { TemplateModal } from '../../components/modal/TemplateModal';
import { WelcomeModal } from '../../components/modal/WelcomeModal';
import { SettingsService } from '../../services/storage/settingsService';
import { ShortcutsModal } from '../../components/modal/ShortcutsModal';
import { SettingsModal } from '../../components/modal/SettingsModal';
import { AppAiResearchHost } from './AppAiResearchHost';
import type { AppContext } from './appContext';

export const AppOverlays = ({ ctx }: { ctx: AppContext }) => {
  const { setDoc, isZoteroMode, setDockPosition, setIsShortcutsOpen, isShortcutsOpen,
         isCommandPaletteOpen, setIsCommandPaletteOpen, isTemplateModalOpen, setIsTemplateModalOpen, setIsWelcomeOpen,
         isWelcomeOpen, isSettingsOpen, setIsSettingsOpen, importFileInputRef, settings,
         setSettings, flushCurrentDocument, showWorkbenchTab, toggleZen, layout,
         handleAddChild, handleAddSibling, handleSelectAndCenterNode, openDocumentAt, handleSelectTemplate,
         handleCreateBlankDoc, handleOpenSettings, handleCreateFromZoteroItems, handleRestoreWorkspace, handleExportCurrentDocument,
         handleImportFile } = ctx;
  return (
    <>
      {/* Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        nodes={layout.nodes}
        onSelectAndCenterNode={handleSelectAndCenterNode}
        onAddChild={handleAddChild}
        onAddSibling={() => handleAddSibling(false)}
        onToggleOutline={() => { void showWorkbenchTab('outline'); }}
        onToggleInbox={() => { void showWorkbenchTab('inbox'); }}
        onToggleZen={() => { void toggleZen(); }}
        onChangeLayout={(l) => setDoc((prev: any) => prev ? { ...prev, layoutType: l } : null)}
        onChangeTheme={(th) => setDoc((prev: any) => prev ? { ...prev, themeId: th } : null)}
        onExportPNG={() => { void handleExportCurrentDocument('png'); }}
        onExportSVG={() => { void handleExportCurrentDocument('svg'); }}
        onExportMarkdown={() => { void handleExportCurrentDocument('markdown'); }}
        onExportPDF={isZoteroMode ? undefined : () => { void handleExportCurrentDocument('pdf'); }}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onOpenSettings={handleOpenSettings}
        onCreateBlank={handleCreateBlankDoc}
        onOpenWelcome={() => setIsWelcomeOpen(true)}
      />

      {/* Template Selection Modal */}
      <TemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onSelectTemplate={handleSelectTemplate}
      />

      {/* Welcome / Quick-Start Hub Modal */}
      <WelcomeModal
        isOpen={isWelcomeOpen}
        onClose={() => setIsWelcomeOpen(false)}
        onCreateBlank={handleCreateBlankDoc}
        onImportZotero={handleCreateFromZoteroItems}
        onOpenTemplates={() => setIsTemplateModalOpen(true)}
        onTriggerImportFile={() => importFileInputRef.current?.click()}
        onOpenDocument={(id) => { void openDocumentAt(id); }}
        showOnStartup={settings.showWelcomeOnStartup}
        onToggleShowOnStartup={(val) => {
          setSettings((s: any) => ({ ...s, showWelcomeOnStartup: val }));
          void SettingsService.updateSettings({ showWelcomeOnStartup: val });
        }}
        isZoteroMode={isZoteroMode}
      />

      {/* Hidden file input for file import from WelcomeModal */}
      <input
        ref={importFileInputRef}
        data-mindflow-workspace-import="true"
        type="file"
        accept=".mindflow,.json,.md,.markdown,.opml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            void handleImportFile(file);
          }
          e.target.value = '';
        }}
      />

      {/* Shortcuts Cheat Sheet Modal */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Settings & Preferences Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={(newSettings) => {
          setSettings(newSettings);
          setDockPosition(newSettings.workbenchDockPosition);
        }}
        onRestoreWorkspace={handleRestoreWorkspace}
        onFlushCurrentDocument={flushCurrentDocument}
      />

      <AppAiResearchHost ctx={ctx} />
    </>
  );
};
