import { AppToolbar } from './AppToolbar';
import { AppWorkspace } from './AppWorkspace';
import { AppOverlays } from './AppOverlays';
import { AppContextMenus } from './AppContextMenus';
import type { AppContext } from './appContext';

export const AppShell = ({ ctx }: { ctx: AppContext }) => {
  const { settings, theme } = ctx;
  return (
    <div className={`mindflow-app w-full h-full flex ${settings.toolbarPosition === 'bottom' ? 'flex-col-reverse' : 'flex-col'} overflow-hidden ${theme.isDark ? 'dark' : ''}`}>
      <AppToolbar ctx={ctx} />
      <AppWorkspace ctx={ctx} />
      <AppOverlays ctx={ctx} />
      <AppContextMenus ctx={ctx} />
    </div>
  );
};
