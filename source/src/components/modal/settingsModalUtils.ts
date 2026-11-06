import type { AppSettings } from '../../core/model/settingsTypes';
import type { WorkspaceBackupData } from '../../services/storage/backupService';

export type SettingsTab = 'interface' | 'webdav' | 'backup' | 'editing' | 'zotero' | 'ai' | 'license' | 'about';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onRestoreWorkspace: (input: string | WorkspaceBackupData) => Promise<boolean>;
  onFlushCurrentDocument?: () => Promise<boolean>;
}

export const formatSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};
