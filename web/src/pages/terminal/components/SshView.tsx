import { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import type { TerminalSessionItem } from '../types';
import { TerminalConnectStatus } from '../types';
import { useTerminalStore, sessionInstances, type SshSessionInstance } from '../store';
import { useAuthStore } from '@/store/auth';
import SshHeader from './SshHeader';
import SearchModal from './SearchModal';
import ContextMenu from './ContextMenu';

interface SshViewProps {
  session: TerminalSessionItem;
  isActive: boolean;
}

const SshView: React.FC<SshViewProps> = ({ session, isActive }) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<SshSessionInstance | null>(null);
  const [searchVisible, setSearchVisible] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const updateSessionStatus = useTerminalStore((s) => s.updateSessionStatus);
  const theme = useTerminalStore((s) => s.theme);
  const token = useAuthStore((s) => s.token);

  const getTerminalTheme = useCallback(() => {
    if (theme === 'dark') {
      return {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        selectionBackground: '#264f78',
        black: '#1e1e1e',
        red: '#f44747',
        green: '#6a9955',
        yellow: '#d7ba7d',
        blue: '#569cd6',
        magenta: '#c586c0',
        cyan: '#4ec9b0',
        white: '#d4d4d4',
      };
    }
    return {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      cursor: '#d4d4d4',
      selectionBackground: '#264f78',
      black: '#1e1e1e',
      red: '#f44747',
      green: '#6a9955',
      yellow: '#d7ba7d',
      blue: '#569cd6',
      magenta: '#c586c0',
      cyan: '#4ec9b0',
      white: '#d4d4d4',
    };
  }, [theme]);

  // Initialize terminal
  useEffect(() => {
    if (!viewportRef.current) return;

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: getTerminalTheme(),
      scrollback: 5000,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(searchAddon);
    terminal.loadAddon(webLinksAddon);

    terminal.open(viewportRef.current);

    // Delay fit to ensure container is rendered
    requestAnimationFrame(() => {
      fitAddon.fit();
    });

    const inst: SshSessionInstance = {
      terminal,
      fitAddon,
      searchAddon,
      webLinksAddon,
      ws: null,
      hostId: session.hostId,
      sessionKey: session.key,
    };

    instanceRef.current = inst;
    sessionInstances.set(session.key, inst);

    // Connect WebSocket
    connectWebSocket(inst, terminal);

    // Resize handler
    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      inst.ws?.close();
      terminal.dispose();
      sessionInstances.delete(session.key);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fit when becoming active
  useEffect(() => {
    if (isActive && instanceRef.current) {
      setTimeout(() => {
        instanceRef.current?.fitAddon.fit();
        instanceRef.current?.terminal.focus();
      }, 50);
    }
  }, [isActive]);

  const connectWebSocket = useCallback(
    (inst: SshSessionInstance, terminal: Terminal) => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/terminal/${session.hostId}?token=${token}`;

      terminal.writeln('\x1b[33m正在连接...\x1b[0m\r\n');
      updateSessionStatus(session.key, TerminalConnectStatus.CONNECTING);

      const ws = new WebSocket(wsUrl);
      inst.ws = ws;

      ws.onopen = () => {
        updateSessionStatus(session.key, TerminalConnectStatus.CONNECTED);
        terminal.writeln('\x1b[32m连接成功\x1b[0m\r\n');

        // Send initial terminal size
        const size = { type: 'resize', cols: terminal.cols, rows: terminal.rows };
        ws.send(JSON.stringify(size));

        // Listen for user input
        terminal.onData((data) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'input', data }));
          }
        });

        // Listen for terminal resize
        terminal.onResize(({ cols, rows }) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'resize', cols, rows }));
          }
        });

        terminal.focus();
      };

      ws.onmessage = (event) => {
        terminal.write(event.data);
      };

      ws.onclose = () => {
        updateSessionStatus(session.key, TerminalConnectStatus.DISCONNECTED);
        terminal.writeln('\r\n\x1b[31m连接已断开\x1b[0m');
      };

      ws.onerror = () => {
        updateSessionStatus(session.key, TerminalConnectStatus.FAILED);
        terminal.writeln('\r\n\x1b[31m连接失败，请检查主机配置和凭证\x1b[0m');
      };
    },
    [session.hostId, session.key, token, updateSessionStatus]
  );

  const handleAction = useCallback(
    (action: string) => {
      const inst = instanceRef.current;
      if (!inst) return;

      switch (action) {
        case 'copy': {
          const selection = inst.terminal.getSelection();
          if (selection) {
            navigator.clipboard.writeText(selection).catch(() => {});
          }
          break;
        }
        case 'paste': {
          navigator.clipboard.readText().then((text) => {
            if (inst.ws?.readyState === WebSocket.OPEN) {
              inst.ws.send(JSON.stringify({ type: 'input', data: text }));
            }
          }).catch(() => {});
          break;
        }
        case 'selectAll': {
          inst.terminal.selectAll();
          break;
        }
        case 'search': {
          setSearchVisible((v) => !v);
          break;
        }
        case 'fontSizeUp': {
          const currentSize = inst.terminal.options.fontSize || 14;
          inst.terminal.options.fontSize = Math.min(currentSize + 1, 28);
          inst.fitAddon.fit();
          break;
        }
        case 'fontSizeDown': {
          const currentSize2 = inst.terminal.options.fontSize || 14;
          inst.terminal.options.fontSize = Math.max(currentSize2 - 1, 8);
          inst.fitAddon.fit();
          break;
        }
        case 'clear': {
          inst.terminal.clear();
          break;
        }
        case 'disconnect': {
          inst.ws?.close();
          break;
        }
        case 'reconnect': {
          inst.ws?.close();
          inst.terminal.clear();
          connectWebSocket(inst, inst.terminal);
          break;
        }
      }

      // Re-focus terminal after action
      setTimeout(() => inst.terminal.focus(), 50);
    },
    [connectWebSocket]
  );

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleSearch = useCallback((word: string, next: boolean) => {
    const inst = instanceRef.current;
    if (!inst?.searchAddon) return;
    if (next) {
      inst.searchAddon.findNext(word);
    } else {
      inst.searchAddon.findPrevious(word);
    }
  }, []);

  // Send command from command bar
  const sendCommand = useCallback((command: string) => {
    const inst = instanceRef.current;
    if (!inst || !inst.ws || inst.ws.readyState !== WebSocket.OPEN) return;
    inst.ws.send(JSON.stringify({ type: 'input', data: command + '\n' }));
  }, []);

  // Expose sendCommand for parent
  useEffect(() => {
    const inst = instanceRef.current;
    if (inst) {
      (inst as any).sendCommand = sendCommand;
    }
  }, [sendCommand]);

  return (
    <div className="ssh-view-container" style={{ display: isActive ? 'flex' : 'none' }}>
      <SshHeader session={session} onAction={handleAction} />
      <div
        className="ssh-wrapper"
        style={{ background: getTerminalTheme().background }}
        onContextMenu={handleContextMenu}
      >
        <div className="ssh-viewport" ref={viewportRef} />
        {searchVisible && (
          <SearchModal
            onSearch={handleSearch}
            onClose={() => {
              setSearchVisible(false);
              instanceRef.current?.terminal.focus();
            }}
          />
        )}
      </div>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onAction={(action) => {
            handleAction(action);
            setContextMenu(null);
          }}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};

export default SshView;
