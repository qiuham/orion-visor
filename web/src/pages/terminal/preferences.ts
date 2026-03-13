// ============ Terminal Preferences (localStorage) ============

export interface TerminalPreferences {
  // Display
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  cursorStyle: 'block' | 'underline' | 'bar';
  cursorBlink: boolean;
  scrollback: number;

  // Theme
  terminalThemeName: string;
  uiTheme: 'light' | 'dark';

  // New connection
  newConnectionType: 'group' | 'list' | 'favorite' | 'latest';

  // Action bar visibility
  actionBarItems: Record<string, boolean>;

  // Context menu visibility
  contextMenuItems: Record<string, boolean>;

  // Latest connections (host IDs)
  latestHostIds: number[];

  // Favorite host IDs
  favoriteHostIds: number[];
}

const STORAGE_KEY = 'terminal_preferences';

const defaultPreferences: TerminalPreferences = {
  fontFamily: 'Menlo, Monaco, "Courier New", monospace',
  fontSize: 14,
  lineHeight: 1.0,
  letterSpacing: 0,
  cursorStyle: 'block',
  cursorBlink: true,
  scrollback: 5000,
  terminalThemeName: 'default-dark',
  uiTheme: 'light',
  newConnectionType: 'list',
  actionBarItems: {
    copy: true,
    paste: true,
    selectAll: true,
    search: true,
    fontSizeUp: true,
    fontSizeDown: true,
    clear: true,
    disconnect: true,
    reconnect: true,
  },
  contextMenuItems: {
    copy: true,
    paste: true,
    selectAll: true,
    clear: true,
    search: true,
    disconnect: true,
  },
  latestHostIds: [],
  favoriteHostIds: [],
};

export function loadPreferences(): TerminalPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultPreferences, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.warn('加载终端偏好设置失败', e);
  }
  return { ...defaultPreferences };
}

export function savePreferences(prefs: Partial<TerminalPreferences>): void {
  try {
    const current = loadPreferences();
    const merged = { ...current, ...prefs };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch (e) {
    console.warn('保存终端偏好设置失败', e);
  }
}

export function addLatestHost(hostId: number): void {
  const prefs = loadPreferences();
  const ids = [hostId, ...prefs.latestHostIds.filter((id) => id !== hostId)].slice(0, 30);
  savePreferences({ latestHostIds: ids });
}

export function toggleFavoriteHost(hostId: number): boolean {
  const prefs = loadPreferences();
  const isFav = prefs.favoriteHostIds.includes(hostId);
  if (isFav) {
    savePreferences({ favoriteHostIds: prefs.favoriteHostIds.filter((id) => id !== hostId) });
  } else {
    savePreferences({ favoriteHostIds: [...prefs.favoriteHostIds, hostId] });
  }
  return !isFav;
}

export function isFavoriteHost(hostId: number): boolean {
  const prefs = loadPreferences();
  return prefs.favoriteHostIds.includes(hostId);
}

export function getLatestHostIds(): number[] {
  return loadPreferences().latestHostIds;
}

export function getFavoriteHostIds(): number[] {
  return loadPreferences().favoriteHostIds;
}

export { defaultPreferences };
