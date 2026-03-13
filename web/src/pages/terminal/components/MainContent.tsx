import { useTerminalStore } from '../store';
import NewConnectionView from './NewConnectionView';
import TerminalPanel from './TerminalPanel';
import CommandBar from './CommandBar';
import DisplaySettingView from './DisplaySettingView';
import ShortcutSettingView from './ShortcutSettingView';

const MainContent: React.FC = () => {
  const { tabs, activeTabKey, panels, commandBarVisible } = useTerminalStore();

  // Check if active tab is a terminal panel
  const isTerminalPanelActive = tabs.find(
    (t) => t.key === activeTabKey && t.type === 'terminal-panel'
  );

  return (
    <div className="terminal-content-area">
      <div style={{ width: '100%', height: commandBarVisible && isTerminalPanelActive ? 'calc(100% - 128px)' : '100%' }}>
        {tabs.map((tab) => {
          const isActive = tab.key === activeTabKey;

          if (tab.type === 'new-connection') {
            return (
              <div
                key={tab.key}
                className={`terminal-tab-content ${isActive ? 'active' : ''}`}
              >
                <NewConnectionView />
              </div>
            );
          }

          if (tab.type === 'terminal-panel') {
            const panel = panels.find((p) => p.key === tab.key);
            if (!panel) return null;
            return (
              <div
                key={tab.key}
                className={`terminal-tab-content ${isActive ? 'active' : ''}`}
              >
                <TerminalPanel panel={panel} />
              </div>
            );
          }

          if (tab.type === 'display-setting' || tab.type === 'theme-setting') {
            return (
              <div
                key={tab.key}
                className={`terminal-tab-content ${isActive ? 'active' : ''}`}
              >
                <DisplaySettingView />
              </div>
            );
          }

          if (tab.type === 'shortcut-setting') {
            return (
              <div
                key={tab.key}
                className={`terminal-tab-content ${isActive ? 'active' : ''}`}
              >
                <ShortcutSettingView />
              </div>
            );
          }

          // Placeholder for other tab types
          return (
            <div
              key={tab.key}
              className={`terminal-tab-content ${isActive ? 'active' : ''}`}
            >
              <div
                style={{
                  padding: 32,
                  color: 'var(--terminal-color-content-text-1)',
                  fontSize: 16,
                }}
              >
                {tab.title} (开发中)
              </div>
            </div>
          );
        })}
      </div>

      {/* Command bar */}
      {commandBarVisible && isTerminalPanelActive && <CommandBar />}
    </div>
  );
};

export default MainContent;
