import { create } from 'zustand';
import type { Terminal } from '@xterm/xterm';
import type { FitAddon } from '@xterm/addon-fit';
import type { SearchAddon } from '@xterm/addon-search';
import type { WebLinksAddon } from '@xterm/addon-web-links';
import {
  type TerminalTabItem,
  type TerminalSessionItem,
  TerminalConnectStatus,
  SessionTypeColors,
  generateKey,
} from './types';

// ============ Session Instance (not in store - mutable refs) ============

export interface SshSessionInstance {
  terminal: Terminal;
  fitAddon: FitAddon;
  searchAddon?: SearchAddon;
  webLinksAddon?: WebLinksAddon;
  ws: WebSocket | null;
  hostId: number;
  sessionKey: string;
}

// Global session instances map (outside zustand for mutable refs)
export const sessionInstances = new Map<string, SshSessionInstance>();

// ============ Terminal Store ============

export interface TerminalPanelState {
  key: string;
  activeSessionKey: string;
  sessions: TerminalSessionItem[];
}

interface TerminalState {
  // Tabs
  tabs: TerminalTabItem[];
  activeTabKey: string;

  // Panels (terminal panels within tabs)
  panels: TerminalPanelState[];

  // Layout
  theme: 'light' | 'dark';
  fullscreen: boolean;
  commandBarVisible: boolean;
  commandBarText: string;

  // Actions
  addTab: (tab: TerminalTabItem) => void;
  removeTab: (key: string) => void;
  setActiveTab: (key: string) => void;

  openSshSession: (hostId: number, hostName: string, hostAddress: string) => string;
  openSftpSession: (hostId: number, hostName: string, hostAddress: string) => string;
  closeSession: (panelKey: string, sessionKey: string) => void;
  setActiveSession: (panelKey: string, sessionKey: string) => void;
  updateSessionStatus: (sessionKey: string, status: TerminalConnectStatus) => void;

  setTheme: (theme: 'light' | 'dark') => void;
  toggleFullscreen: () => void;
  setCommandBarVisible: (visible: boolean) => void;
  setCommandBarText: (text: string) => void;
}

// Default "New Connection" tab
const defaultTab: TerminalTabItem = {
  key: 'new-connection',
  title: '新建连接',
  icon: 'PlusOutlined',
  type: 'new-connection',
  closable: false,
};

export const useTerminalStore = create<TerminalState>((set, get) => ({
  tabs: [defaultTab],
  activeTabKey: 'new-connection',
  panels: [],
  theme: 'light',
  fullscreen: false,
  commandBarVisible: false,
  commandBarText: '',

  addTab: (tab) => {
    const state = get();
    // Don't add duplicate
    if (state.tabs.find((t) => t.key === tab.key)) {
      set({ activeTabKey: tab.key });
      return;
    }
    set({
      tabs: [...state.tabs, tab],
      activeTabKey: tab.key,
    });
  },

  removeTab: (key) => {
    const state = get();
    const idx = state.tabs.findIndex((t) => t.key === key);
    if (idx === -1) return;
    const tab = state.tabs[idx]!;
    if (!tab.closable && tab.closable !== undefined) return;

    const newTabs = state.tabs.filter((t) => t.key !== key);

    // If removing a terminal panel, clean up sessions
    if (tab.type === 'terminal-panel') {
      const panel = state.panels.find((p) => p.key === key);
      if (panel) {
        panel.sessions.forEach((s) => {
          const inst = sessionInstances.get(s.key);
          if (inst) {
            inst.ws?.close();
            inst.terminal.dispose();
            sessionInstances.delete(s.key);
          }
        });
      }
      set({
        tabs: newTabs,
        panels: state.panels.filter((p) => p.key !== key),
        activeTabKey:
          state.activeTabKey === key
            ? newTabs[Math.min(idx, newTabs.length - 1)]?.key || 'new-connection'
            : state.activeTabKey,
      });
    } else {
      set({
        tabs: newTabs,
        activeTabKey:
          state.activeTabKey === key
            ? newTabs[Math.min(idx, newTabs.length - 1)]?.key || 'new-connection'
            : state.activeTabKey,
      });
    }
  },

  setActiveTab: (key) => set({ activeTabKey: key }),

  openSshSession: (hostId, hostName, hostAddress) => {
    const state = get();
    const sessionKey = generateKey('ssh');
    const session: TerminalSessionItem = {
      key: sessionKey,
      hostId,
      hostName,
      hostAddress,
      title: `${hostName}`,
      type: 'ssh',
      color: SessionTypeColors.ssh,
      connectStatus: TerminalConnectStatus.CONNECTING,
    };

    // Find existing terminal panel or create new one
    let panelKey: string;
    const existingPanel = state.panels.find((p) =>
      state.tabs.find((t) => t.key === p.key && t.type === 'terminal-panel')
    );

    if (existingPanel) {
      panelKey = existingPanel.key;
      set({
        panels: state.panels.map((p) =>
          p.key === panelKey
            ? { ...p, sessions: [...p.sessions, session], activeSessionKey: sessionKey }
            : p
        ),
        activeTabKey: panelKey,
      });
    } else {
      panelKey = generateKey('panel');
      const panelTab: TerminalTabItem = {
        key: panelKey,
        title: hostName,
        type: 'terminal-panel',
        closable: true,
      };
      const panel: TerminalPanelState = {
        key: panelKey,
        activeSessionKey: sessionKey,
        sessions: [session],
      };
      set({
        tabs: [...state.tabs, panelTab],
        panels: [...state.panels, panel],
        activeTabKey: panelKey,
      });
    }

    return sessionKey;
  },

  openSftpSession: (hostId, hostName, hostAddress) => {
    const state = get();
    const sessionKey = generateKey('sftp');
    const session: TerminalSessionItem = {
      key: sessionKey,
      hostId,
      hostName,
      hostAddress,
      title: `${hostName} (SFTP)`,
      type: 'sftp',
      color: SessionTypeColors.sftp,
      connectStatus: TerminalConnectStatus.CONNECTING,
    };

    let panelKey: string;
    const existingPanel = state.panels.find((p) =>
      state.tabs.find((t) => t.key === p.key && t.type === 'terminal-panel')
    );

    if (existingPanel) {
      panelKey = existingPanel.key;
      set({
        panels: state.panels.map((p) =>
          p.key === panelKey
            ? { ...p, sessions: [...p.sessions, session], activeSessionKey: sessionKey }
            : p
        ),
        activeTabKey: panelKey,
      });
    } else {
      panelKey = generateKey('panel');
      const panelTab: TerminalTabItem = {
        key: panelKey,
        title: hostName,
        type: 'terminal-panel',
        closable: true,
      };
      const panel: TerminalPanelState = {
        key: panelKey,
        activeSessionKey: sessionKey,
        sessions: [session],
      };
      set({
        tabs: [...state.tabs, panelTab],
        panels: [...state.panels, panel],
        activeTabKey: panelKey,
      });
    }

    return sessionKey;
  },

  closeSession: (panelKey, sessionKey) => {
    const state = get();
    const panel = state.panels.find((p) => p.key === panelKey);
    if (!panel) return;

    // Cleanup instance
    const inst = sessionInstances.get(sessionKey);
    if (inst) {
      inst.ws?.close();
      inst.terminal.dispose();
      sessionInstances.delete(sessionKey);
    }

    const newSessions = panel.sessions.filter((s) => s.key !== sessionKey);

    if (newSessions.length === 0) {
      // Remove the entire panel tab
      set({
        tabs: state.tabs.filter((t) => t.key !== panelKey),
        panels: state.panels.filter((p) => p.key !== panelKey),
        activeTabKey: state.activeTabKey === panelKey ? 'new-connection' : state.activeTabKey,
      });
    } else {
      const lastSession = newSessions[newSessions.length - 1];
      const newActiveKey =
        panel.activeSessionKey === sessionKey ? (lastSession?.key ?? '') : panel.activeSessionKey;
      set({
        panels: state.panels.map((p) =>
          p.key === panelKey ? { ...p, sessions: newSessions, activeSessionKey: newActiveKey } : p
        ),
      });
    }
  },

  setActiveSession: (panelKey, sessionKey) => {
    set({
      panels: get().panels.map((p) => (p.key === panelKey ? { ...p, activeSessionKey: sessionKey } : p)),
    });
  },

  updateSessionStatus: (sessionKey, status) => {
    set({
      panels: get().panels.map((p) => ({
        ...p,
        sessions: p.sessions.map((s) => (s.key === sessionKey ? { ...s, connectStatus: status } : s)),
      })),
    });
  },

  setTheme: (theme) => set({ theme }),
  toggleFullscreen: () => set({ fullscreen: !get().fullscreen }),
  setCommandBarVisible: (visible) => set({ commandBarVisible: visible }),
  setCommandBarText: (text) => set({ commandBarText: text }),
}));
