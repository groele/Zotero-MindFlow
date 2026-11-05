/**
 * Zotero MindFlow - Common Preferences & Configuration Types
 */

export interface MindFlowPreferences {
  windowMode: 'tab' | 'window';
  includeAbstract: boolean;
  includeAnnotations: boolean;
  includeTags: boolean;
  aiMaxPdfPages: number | string;
  autoSave?: boolean;
  autoSaveInterval?: number;
  defaultLayout?: 'mindmap' | 'logic-right' | 'org-down';
  defaultTheme?: string;
  autoBackup?: boolean;
  backupRetentionDays?: number;
}

export type AllowedPrefKey = keyof MindFlowPreferences;
