import { useEffect, useCallback, useState } from 'react';
import { CompressOutlined } from '@ant-design/icons';
import { useTerminalStore } from './store';
import LayoutHeader from './components/LayoutHeader';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import MainContent from './components/MainContent';
import CommandSnippetDrawer from './components/CommandSnippetDrawer';
import './terminal.css';

const TerminalPage: React.FC = () => {
  const { fullscreen, toggleFullscreen, uiTheme, setCommandBarVisible, commandBarVisible } =
    useTerminalStore();
  const [snippetDrawerOpen, setSnippetDrawerOpen] = useState(false);

  // Apply theme attribute to body
  useEffect(() => {
    document.body.setAttribute('data-terminal-theme', uiTheme);
    return () => {
      document.body.removeAttribute('data-terminal-theme');
    };
  }, [uiTheme]);

  // Warn before unload if sessions active
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const { panels } = useTerminalStore.getState();
      if (panels.some((p) => p.sessions.length > 0)) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+` : toggle command bar
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        setCommandBarVisible(!commandBarVisible);
      }
      // Escape : exit fullscreen
      if (e.key === 'Escape' && fullscreen) {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [fullscreen, toggleFullscreen, commandBarVisible, setCommandBarVisible]);

  const handleScreenshot = useCallback(() => {
    // Screenshot: use Canvas API on active terminal
    const canvas = document.querySelector('.ssh-viewport canvas') as HTMLCanvasElement | null;
    if (canvas) {
      const link = document.createElement('a');
      link.download = `terminal-${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  }, []);

  return (
    <div className={`host-terminal-layout ${fullscreen ? 'fullscreen' : ''}`}>
      {/* Header */}
      <LayoutHeader onFullscreen={toggleFullscreen} isFullscreen={fullscreen} />

      {/* Main area */}
      <div className="terminal-main-area">
        {/* Left sidebar */}
        <LeftSidebar />

        {/* Content */}
        <MainContent />

        {/* Right sidebar */}
        <RightSidebar
          onOpenSnippets={() => setSnippetDrawerOpen(true)}
          onOpenCommandBar={() => setCommandBarVisible(!commandBarVisible)}
          onScreenshot={handleScreenshot}
        />
      </div>

      {/* Fullscreen exit button */}
      {fullscreen && (
        <button className="fullscreen-exit-btn" onClick={toggleFullscreen}>
          <CompressOutlined />
        </button>
      )}

      {/* Command snippet drawer */}
      <CommandSnippetDrawer
        open={snippetDrawerOpen}
        onClose={() => setSnippetDrawerOpen(false)}
      />
    </div>
  );
};

export default TerminalPage;
