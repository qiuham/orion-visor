// ============ Terminal Types & Constants ============

export interface TerminalTabItem {
  key: string;
  title: string;
  icon?: string;
  type: 'new-connection' | 'display-setting' | 'shortcut-setting' | 'theme-setting' | 'terminal-panel';
  closable?: boolean;
}

export interface TerminalSessionItem {
  key: string;
  hostId: number;
  hostName: string;
  hostAddress: string;
  title: string;
  type: 'ssh' | 'sftp';
  color: string;
  connectStatus: TerminalConnectStatus;
}

export enum TerminalConnectStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  FAILED = 'failed',
}

export const ConnectStatusConfig: Record<TerminalConnectStatus, { color: string; label: string }> = {
  [TerminalConnectStatus.CONNECTING]: { color: 'processing', label: '连接中' },
  [TerminalConnectStatus.CONNECTED]: { color: 'success', label: '已连接' },
  [TerminalConnectStatus.DISCONNECTED]: { color: 'default', label: '已断开' },
  [TerminalConnectStatus.FAILED]: { color: 'error', label: '失败' },
};

// Session type colors (from original Arco design colors)
export const SessionTypeColors = {
  ssh: '#3491FA',   // blue
  sftp: '#0FC6C2',  // cyan
};

// SSH action bar items
export const SshActionBarItems = [
  { key: 'copy', icon: 'CopyOutlined', title: '复制' },
  { key: 'paste', icon: 'SnippetsOutlined', title: '粘贴' },
  { key: 'selectAll', icon: 'SelectOutlined', title: '全选' },
  { key: 'search', icon: 'SearchOutlined', title: '搜索' },
  { key: 'fontSizeUp', icon: 'FontSizeOutlined', title: '增大字号' },
  { key: 'fontSizeDown', icon: 'FontSizeOutlined', title: '减小字号' },
  { key: 'clear', icon: 'ClearOutlined', title: '清屏' },
  { key: 'disconnect', icon: 'DisconnectOutlined', title: '断开连接' },
  { key: 'reconnect', icon: 'ReloadOutlined', title: '重新连接' },
];

// Context menu items
export const ContextMenuItems = [
  { key: 'copy', icon: 'CopyOutlined', label: '复制' },
  { key: 'paste', icon: 'SnippetsOutlined', label: '粘贴' },
  { key: 'selectAll', icon: 'SelectOutlined', label: '全选' },
  { key: 'clear', icon: 'ClearOutlined', label: '清屏' },
  { key: 'search', icon: 'SearchOutlined', label: '搜索' },
  { key: 'disconnect', icon: 'DisconnectOutlined', label: '断开连接' },
];

// New connection view types
export type NewConnectionType = 'group' | 'list' | 'favorite' | 'latest';

// ============ Shortcut Key Config ============

export interface ShortcutKeyConfig {
  item: string;
  label: string;
  type: 'global' | 'session' | 'terminal';
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  code: string;
  enabled: boolean;
}

export const DefaultShortcuts: ShortcutKeyConfig[] = [
  // 全局快捷键
  { item: 'changeToPrevTab', label: '切换到上一个Tab', type: 'global', ctrlKey: true, shiftKey: true, altKey: false, code: 'ArrowLeft', enabled: true },
  { item: 'changeToNextTab', label: '切换到下一个Tab', type: 'global', ctrlKey: true, shiftKey: true, altKey: false, code: 'ArrowRight', enabled: true },
  { item: 'closeTab', label: '关闭当前Tab', type: 'global', ctrlKey: true, shiftKey: true, altKey: false, code: 'KeyW', enabled: true },
  { item: 'openCommandSnippet', label: '打开命令片段', type: 'global', ctrlKey: true, shiftKey: false, altKey: false, code: 'KeyP', enabled: true },
  { item: 'screenshot', label: '截图', type: 'global', ctrlKey: true, shiftKey: true, altKey: false, code: 'KeyS', enabled: true },
  { item: 'openSftp', label: '打开SFTP', type: 'global', ctrlKey: true, shiftKey: true, altKey: false, code: 'KeyF', enabled: true },
  { item: 'toggleCommandBar', label: '切换命令栏', type: 'global', ctrlKey: true, shiftKey: false, altKey: false, code: 'Backquote', enabled: true },
  { item: 'checkAppSetting', label: '打开设置', type: 'global', ctrlKey: true, shiftKey: false, altKey: false, code: 'Comma', enabled: true },
  { item: 'toggleFullscreen', label: '切换全屏', type: 'global', ctrlKey: false, shiftKey: false, altKey: false, code: 'F11', enabled: true },
  // 会话快捷键
  { item: 'changeToPrevSession', label: '切换到上一个会话', type: 'session', ctrlKey: true, shiftKey: false, altKey: true, code: 'ArrowLeft', enabled: true },
  { item: 'changeToNextSession', label: '切换到下一个会话', type: 'session', ctrlKey: true, shiftKey: false, altKey: true, code: 'ArrowRight', enabled: true },
  { item: 'closeSession', label: '关闭当前会话', type: 'session', ctrlKey: true, shiftKey: false, altKey: true, code: 'KeyW', enabled: true },
  { item: 'openNewConnect', label: '打开新连接', type: 'session', ctrlKey: true, shiftKey: false, altKey: true, code: 'KeyN', enabled: true },
  { item: 'connectToCurrentHost', label: '连接当前主机', type: 'session', ctrlKey: true, shiftKey: false, altKey: true, code: 'KeyR', enabled: true },
  // 终端快捷键
  { item: 'copy', label: '复制', type: 'terminal', ctrlKey: true, shiftKey: true, altKey: false, code: 'KeyC', enabled: true },
  { item: 'paste', label: '粘贴', type: 'terminal', ctrlKey: true, shiftKey: true, altKey: false, code: 'KeyV', enabled: true },
  { item: 'selectAll', label: '全选', type: 'terminal', ctrlKey: true, shiftKey: true, altKey: false, code: 'KeyA', enabled: true },
  { item: 'search', label: '搜索', type: 'terminal', ctrlKey: true, shiftKey: false, altKey: false, code: 'KeyF', enabled: true },
  { item: 'fontSizeUp', label: '增大字号', type: 'terminal', ctrlKey: true, shiftKey: false, altKey: false, code: 'Equal', enabled: true },
  { item: 'fontSizeDown', label: '减小字号', type: 'terminal', ctrlKey: true, shiftKey: false, altKey: false, code: 'Minus', enabled: true },
  { item: 'clear', label: '清屏', type: 'terminal', ctrlKey: true, shiftKey: true, altKey: false, code: 'KeyL', enabled: true },
  { item: 'toTop', label: '到顶部', type: 'terminal', ctrlKey: true, shiftKey: false, altKey: false, code: 'Home', enabled: true },
  { item: 'toBottom', label: '到底部', type: 'terminal', ctrlKey: true, shiftKey: false, altKey: false, code: 'End', enabled: true },
];

// Generate unique key
let keyCounter = 0;
export function generateKey(prefix = 'tab'): string {
  return `${prefix}_${Date.now()}_${++keyCounter}`;
}
