import { useEffect, useRef } from 'react';
import {
  CopyOutlined,
  SnippetsOutlined,
  SelectOutlined,
  ClearOutlined,
  SearchOutlined,
  DisconnectOutlined,
} from '@ant-design/icons';

const menuItems = [
  { key: 'copy', icon: <CopyOutlined />, label: '复制' },
  { key: 'paste', icon: <SnippetsOutlined />, label: '粘贴' },
  { key: 'selectAll', icon: <SelectOutlined />, label: '全选' },
  { key: 'divider1', divider: true },
  { key: 'clear', icon: <ClearOutlined />, label: '清屏' },
  { key: 'search', icon: <SearchOutlined />, label: '搜索' },
  { key: 'divider2', divider: true },
  { key: 'disconnect', icon: <DisconnectOutlined />, label: '断开连接' },
];

interface ContextMenuProps {
  x: number;
  y: number;
  onAction: (action: string) => void;
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onAction, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  const adjustedX = Math.min(x, window.innerWidth - 180);
  const adjustedY = Math.min(y, window.innerHeight - 280);

  return (
    <div
      ref={menuRef}
      className="terminal-context-menu"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {menuItems.map((item) =>
        'divider' in item && item.divider ? (
          <div key={item.key} className="terminal-context-menu-divider" />
        ) : (
          <div
            key={item.key}
            className="terminal-context-menu-item"
            onClick={() => onAction(item.key)}
          >
            <span className="menu-icon">{item.icon}</span>
            <span>{item.label}</span>
          </div>
        )
      )}
    </div>
  );
};

export default ContextMenu;
