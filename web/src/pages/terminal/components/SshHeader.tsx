import { message, Tooltip } from 'antd';
import {
  CopyOutlined,
  SnippetsOutlined,
  SearchOutlined,
  ClearOutlined,
  DisconnectOutlined,
  ReloadOutlined,
  FontSizeOutlined,
  ColumnWidthOutlined,
} from '@ant-design/icons';
import type { TerminalSessionItem } from '../types';
import { ConnectStatusConfig } from '../types';

const actionIcons: Record<string, React.ReactNode> = {
  copy: <CopyOutlined />,
  paste: <SnippetsOutlined />,
  search: <SearchOutlined />,
  fontSizeUp: <FontSizeOutlined />,
  fontSizeDown: <ColumnWidthOutlined />,
  clear: <ClearOutlined />,
  disconnect: <DisconnectOutlined />,
  reconnect: <ReloadOutlined />,
};

interface SshHeaderProps {
  session: TerminalSessionItem;
  onAction: (action: string) => void;
}

const SshHeader: React.FC<SshHeaderProps> = ({ session, onAction }) => {
  const statusConfig = ConnectStatusConfig[session.connectStatus];

  const actions = [
    { key: 'copy', title: '复制' },
    { key: 'paste', title: '粘贴' },
    { key: 'search', title: '搜索' },
    { key: 'fontSizeUp', title: '增大字号' },
    { key: 'fontSizeDown', title: '减小字号' },
    { key: 'clear', title: '清屏' },
    { key: 'disconnect', title: '断开连接' },
    { key: 'reconnect', title: '重新连接' },
  ];

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(session.hostAddress).then(() => {
      message.success('已复制');
    }).catch(() => {
      // clipboard API may not be available
    });
  };

  return (
    <div className="ssh-header">
      <div className="ssh-header-left">
        <span className="address-label">
          <span className="address-text" onClick={handleCopyAddress} title={session.hostAddress}>
            {session.hostAddress}
          </span>
        </span>
      </div>
      <div className="ssh-header-right">
        <div className="ssh-header-action-bar">
          {actions.map((action) => (
            <Tooltip key={action.key} title={action.title} placement="bottom">
              <button
                className="ssh-header-action-btn"
                onClick={() => onAction(action.key)}
              >
                {actionIcons[action.key]}
              </button>
            </Tooltip>
          ))}
        </div>
        <div className="ssh-header-status">
          <span className={`status-dot ${session.connectStatus}`} />
          <span className="status-text">{statusConfig.label}</span>
        </div>
      </div>
    </div>
  );
};

export default SshHeader;
