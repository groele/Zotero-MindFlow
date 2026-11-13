mindflow-menu-open = Zotero MindFlow Mind Map
mindflow-item-menu-create = Generate Mind Map in MindFlow
mindflow-item-menu-add = Add to Current MindFlow Map
mindflow-collection-menu-create = Generate Mind Map for Collection
mindflow-collection-menu-create-with-name = Generate Mind Map for "{ $name }"
mindflow-toolbar-tooltip = Open Zotero MindFlow Mind Map Workspace
mindflow-reader-send = Send Excerpt to MindFlow Map
# This message targets the native collapsible-section. A value would erase its controls.
mindflow-item-pane-header =
    .label = MindFlow Mind Maps
    .tooltiptext = MindFlow Mind Maps & Research
mindflow-item-pane-sidenav =
    .title = Open MindFlow Mind Maps
    .aria-label = MindFlow Mind Maps
    .tooltiptext = Open MindFlow Mind Maps
mindflow-item-pane-count =
    { $count ->
        [0] No MindFlow maps for this item yet
        [one] 1 MindFlow map for this item
       *[other] { $count } MindFlow maps for this item
    }
mindflow-item-pane-empty-selection = No literature item is selected. You can create a blank map.
mindflow-item-pane-current-item = Current item
mindflow-item-pane-no-map = No linked maps
mindflow-item-pane-choose-template-hint = Choose a template to create a map for this item.
mindflow-item-pane-add-from-template = Add from template
mindflow-item-pane-generate-map = Create map
mindflow-item-pane-pdf-ready = PDF available
mindflow-item-pane-pdf-missing = No PDF
mindflow-item-pane-template-label = Map template
mindflow-item-pane-template-select =
    .aria-label = Map template
mindflow-item-pane-action-ai = AI reading
mindflow-item-pane-action-companion = Companion window
mindflow-item-pane-action-import = Import map
mindflow-item-pane-action-blank = Standalone map
mindflow-item-pane-action-pdf = Open PDF
mindflow-item-pane-pdf-open-failed = Unable to open the PDF. Check that the attachment has been downloaded.
mindflow-item-pane-action-workbench = Map workspace
    .title = Open the MindFlow workspace to browse and manage existing maps
mindflow-item-pane-card-open = Open
mindflow-item-pane-card-export = Export outline
mindflow-item-pane-card-locate = Locate file
mindflow-item-pane-open =
    .title = Open map: { $title }
mindflow-item-pane-open-button = Open
mindflow-item-pane-create = New Mind Map
    .title = Create a mind map for this Zotero item
mindflow-item-pane-create-another = Add Mind Map
    .title = Add another mind map for this Zotero item
mindflow-item-pane-create-local = Create local map (read-only library)
    .title = Create a standalone local map copy
mindflow-item-pane-create-blank = New blank mind map
    .title = Create a standalone blank mind map
mindflow-item-pane-workspace-title = MindFlow Workspace
mindflow-item-pane-actions =
    .aria-label = MindFlow quick actions
mindflow-item-pane-ai = AI paper map
    .title = Choose a model and reading scope for the selected paper
mindflow-item-pane-workspace = Open workspace
    .title = Open the MindFlow workspace
mindflow-item-pane-import = Import map
    .title = Import a MindFlow, JSON, Markdown or OPML file
mindflow-item-pane-pdf = Open PDF
    .title = Open the PDF attachment for this paper
mindflow-item-pane-blank = Standalone map
    .title = Create a blank map without linking it to this paper
mindflow-item-pane-refresh = Refresh
    .title = Refresh the maps for this paper
mindflow-item-pane-list-title = Maps for this paper
mindflow-item-pane-list-empty = Create a map to open it quickly here.
mindflow-item-pane-action-failed = The action failed. Please try again.
mindflow-item-pane-linked-maps-title = Linked Maps
mindflow-item-pane-quick-create-title = Quick Create Map
mindflow-item-pane-template-create = Generate from Template
mindflow-item-pane-readonly-badge = Read-only Item
mindflow-item-pane-readonly-hint = This item is read-only or in Trash. Maps are kept in local workspace and will not be saved as attachments.

## Preferences
mindflow-pref-title = Zotero MindFlow
mindflow-pref-status-checking = Loading preferences…

mindflow-pref-group-workspace = Literature & Workspace
mindflow-pref-subhead-interface = Interface & Toolbar
mindflow-pref-group-ai-sync = AI Research & Synchronization
mindflow-pref-subhead-backup = Local Backup & Snapshots
mindflow-pref-subhead-webdav = WebDAV Synchronization
mindflow-pref-group-editing-shortcuts = Editing & Keyboard Shortcuts
mindflow-pref-subhead-shortcuts = Shortcuts & System Reset

mindflow-pref-shortcut-child = Add child node
mindflow-pref-shortcut-sibling = Add sibling node
mindflow-pref-shortcut-edit = Edit node text (or double click)
mindflow-pref-shortcut-delete = Delete selected nodes
mindflow-pref-shortcut-toggle = Collapse / expand current branch
mindflow-pref-shortcut-levels = Expand levels 1~3 (Alt+0 for all)
mindflow-pref-shortcut-replace = Global instant search and replace
mindflow-pref-shortcut-help = Open keyboard shortcuts cheatsheet

mindflow-pref-reset-label = Restore Default Settings
mindflow-pref-reset-desc = Only resets preference values; does not delete mind maps, literature items, or snapshots.
mindflow-pref-reset-btn = Restore MindFlow Defaults

mindflow-pref-release-section-title = Release Information
mindflow-pref-release-notes-label = Release Notes
mindflow-pref-release-date-label = Build Date
mindflow-pref-release-current-label = Current Version
mindflow-pref-release-repo-label = Repository

# Dynamic preferences
mindflow-pref-zoteroWindowMode = Open Mode
mindflow-pref-zoteroWindowMode-desc = Window presentation mode when opening maps from items or the PDF reader
mindflow-pref-showWelcomeOnStartup = Show welcome page on blank workspace
mindflow-pref-showWelcomeOnStartup-desc = Display template library, knowledge graph guide, and quick start help
mindflow-pref-zoteroIncludeAbstract = Import abstract from literature item
mindflow-pref-zoteroIncludeAbstract-desc = Include the item Abstract as a dedicated branch when generating a map
mindflow-pref-zoteroIncludeAnnotations = Import PDF highlights and annotations
mindflow-pref-zoteroIncludeAnnotations-desc = Automatically extract PDF highlights, annotations, and notes into structured branches
mindflow-pref-zoteroIncludeTags = Import item tags
mindflow-pref-zoteroIncludeTags-desc = Present existing item tags as mind map branch tags
mindflow-pref-autoArchiveToItem = Auto-update outline child note on map archive
mindflow-pref-autoArchiveToItem-desc = Maintain a structured Markdown/outline child note under the literature item
mindflow-pref-autoOpenAfterExport = Locate note in library after exporting
mindflow-pref-autoOpenAfterExport-desc = Automatically focus and highlight the newly exported note in the library

mindflow-pref-aiMaxPdfPages = Maximum PDF pages to analyze
mindflow-pref-aiMaxPdfPages-desc = Page cutoff limit for long papers to prevent context window overflow or timeouts

mindflow-pref-toolbarTemplatesPlacement = Templates Entry Placement
mindflow-pref-toolbarTemplatesPlacement-desc = Keep visible on toolbar, tuck into More menu, or hide from top bar
mindflow-pref-toolbarPresentationPlacement = Presentation Entry Placement
mindflow-pref-toolbarPresentationPlacement-desc = Keep visible on toolbar, tuck into More menu, or hide from top bar
mindflow-pref-toolbarExportPlacement = Import/Export Entry Placement
mindflow-pref-toolbarExportPlacement-desc = Keep visible on toolbar, tuck into More menu, or hide from top bar
mindflow-pref-toolbarPosition = Main Toolbar Placement
mindflow-pref-toolbarPosition-desc = Docking direction of the top toolbar in the workspace
mindflow-pref-workbenchDockPosition = Sidebar Dock Position
mindflow-pref-workbenchDockPosition-desc = Outline and auxiliary panels dock to the left or right of the canvas
mindflow-pref-canvasBackground = Canvas Background Grid
mindflow-pref-canvasBackground-desc = Background pattern and texture of the mind map canvas
mindflow-pref-zoomStep = Scroll Wheel Zoom Step
mindflow-pref-zoomStep-desc = Change rate of canvas zoom scale per wheel step

mindflow-pref-subhead-toolbar-buttons = Workspace Toolbar Quick Buttons
mindflow-pref-toolbarButtons-history = Undo & Redo
mindflow-pref-toolbarButtons-insert = Insert Node
mindflow-pref-toolbarButtons-layout = Layout Structures
mindflow-pref-toolbarButtons-theme = Color Themes
mindflow-pref-toolbarButtons-outline = Outline View
mindflow-pref-toolbarButtons-inbox = Inspiration Inbox
mindflow-pref-toolbarButtons-templates = Preset Templates
mindflow-pref-toolbarButtons-zen = Zen Mode
mindflow-pref-toolbarButtons-export = Export & Archive
mindflow-pref-toolbarButtons-zoom = Canvas Zoom

mindflow-pref-defaultThemeId = Default Map Theme
mindflow-pref-defaultThemeId-desc = Default palette applied when creating a new blank mind map
mindflow-pref-defaultLayout = Default Map Layout
mindflow-pref-defaultLayout-desc = Default branching rule for new mind map nodes
mindflow-pref-curveStyle = Branch Line Style
mindflow-pref-curveStyle-desc = Geometric curve rendering between parent and child nodes
mindflow-pref-rainbowBranches = Auto-assign rainbow colors to branches
mindflow-pref-rainbowBranches-desc = Distribute distinct colors to each top-level branch for clearer distinction
mindflow-pref-soundEffects = Play interaction sound effects
mindflow-pref-soundEffects-desc = Play gentle audio feedback when inserting, deleting, or reordering nodes
mindflow-pref-autoExpandOnAddChild = Auto-expand parent node on adding child
mindflow-pref-autoExpandOnAddChild-desc = Automatically expand a collapsed parent branch when adding a child node

mindflow-pref-customSavePath = Extra Mirror Backup Folder
mindflow-pref-customSavePath-desc = Save an additional .mindflow copy to a local directory alongside item attachments
mindflow-pref-autoSnapshotEnabled = Automatically create history snapshots
mindflow-pref-autoSnapshotEnabled-desc = Silently save timestamped versions in the background to prevent data loss
mindflow-pref-autoSnapshotIntervalMinutes = Snapshot Interval
mindflow-pref-autoSnapshotIntervalMinutes-desc = Minimum time interval for automatic background snapshots
mindflow-pref-maxSnapshotsPerDoc = Max Snapshots per Map
mindflow-pref-maxSnapshotsPerDoc-desc = Oldest snapshots are automatically pruned when the limit is reached

mindflow-pref-webdav-enabled = Enable WebDAV Cloud Backup
mindflow-pref-webdav-enabled-desc = Sync workspace backups with standard WebDAV servers like Nutstore or Nextcloud
mindflow-pref-webdav-serverUrl = Server URL
mindflow-pref-webdav-serverUrl-desc = Must use HTTPS, e.g. https://dav.jianguoyun.com/dav/
mindflow-pref-webdav-basePath = Cloud Backup Directory
mindflow-pref-webdav-basePath-desc = Root folder path for storing backups, defaults to /MindFlow/
mindflow-pref-webdav-username = Username / Email
mindflow-pref-webdav-username-desc = WebDAV login account username
mindflow-pref-webdav-password = Application Password / Token
mindflow-pref-webdav-password-desc = Using an app-specific password or token is strongly recommended
mindflow-pref-webdav-autoSyncOnSave = Push cloud backup on local save
mindflow-pref-webdav-autoSyncOnSave-desc = Silently upload workspace incremental backup on each manual save


mindflow-pref-version = v{ $version }
mindflow-pref-release-notes-text = 16.2.1: Targeted section analysis focus on full text, interactive prompt presets workbench
mindflow-pref-release-date = 2026-11-10
mindflow-pref-release-xpi = zotero-mindflow-16.2.1.xpi
mindflow-pref-release-repo = github.com/groele/Zotero-MindFlow
mindflow-pref-release-aria = Version Information
mindflow-pref-notice-backup = Tip: The extra backup folder does not replace attachments. History snapshots and rollbacks can be viewed and restored in the workspace "History" panel.
mindflow-pref-notice-webdav = Tip: WebDAV serves as an independent secondary disaster recovery backup. Connection tests and manual uploads can be performed in the workspace.
mindflow-pref-btn-choose-folder = Choose Folder
mindflow-pref-btn-toggle-token = Show / Hide token
mindflow-pref-btn-open-llm = Open llm-for-zotero Preferences
mindflow-pref-status-loaded = Settings ready
mindflow-pref-status-saved = Settings saved
mindflow-pref-status-reset = Default settings restored
mindflow-pref-notice-literature = Tip: MindFlow map files (.mindflow) are automatically archived as attachments under items. Multi-device sync follows Zotero file synchronization rules.


mindflow-pref-key-0 = Tab
mindflow-pref-key-1 = Enter
mindflow-pref-key-2 = Space / F2
mindflow-pref-key-3 = Delete / Backspace
mindflow-pref-key-4 = /
mindflow-pref-key-5 = Alt + 1~3
mindflow-pref-key-6 = Ctrl + H
mindflow-pref-key-7 = ?
