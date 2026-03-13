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

// Generate unique key
let keyCounter = 0;
export function generateKey(prefix = 'tab'): string {
  return `${prefix}_${Date.now()}_${++keyCounter}`;
}
