import { CloseOutlined, PlusOutlined, CodeOutlined, FolderOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import type { TerminalPanelState } from '../store';
import { useTerminalStore } from '../store';
import SshView from './SshView';

interface TerminalPanelProps {
  panel: TerminalPanelState;
}

const TerminalPanel: React.FC<TerminalPanelProps> = ({ panel }) => {
  const { setActiveSession, closeSession, setActiveTab } = useTerminalStore();

  const sessionIcons: Record<string, React.ReactNode> = {
    ssh: <CodeOutlined />,
    sftp: <FolderOutlined />,
  };

  return (
    <div className="terminal-panel-container">
      {/* Session tabs */}
      <div className="terminal-panel-nav">
        {panel.sessions.map((session) => (
          <div
            key={session.key}
            className={`terminal-panel-tab ${panel.activeSessionKey === session.key ? 'active' : ''}`}
            style={{ '--tab-color': session.color } as React.CSSProperties}
            onClick={() => setActiveSession(panel.key, session.key)}
          >
            <span className="panel-tab-title">
              {sessionIcons[session.type] || <CodeOutlined />}
              <span>{session.title}</span>
            </span>
            <span
              className="panel-tab-close"
              onClick={(e) => {
                e.stopPropagation();
                closeSession(panel.key, session.key);
              }}
            >
              <CloseOutlined />
            </span>
          </div>
        ))}
        <Tooltip title="新建连接" placement="bottom">
          <div
            className="terminal-panel-tab-add"
            onClick={() => setActiveTab('new-connection')}
          >
            <PlusOutlined />
          </div>
        </Tooltip>
      </div>

      {/* Session content */}
      <div className="terminal-panel-body">
        {panel.sessions.map((session) => {
          if (session.type === 'ssh') {
            return (
              <SshView
                key={session.key}
                session={session}
                isActive={panel.activeSessionKey === session.key}
              />
            );
          }
          // SFTP view placeholder
          if (session.type === 'sftp') {
            return (
              <div
                key={session.key}
                style={{
                  display: panel.activeSessionKey === session.key ? 'flex' : 'none',
                  width: '100%',
                  height: '100%',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--terminal-color-content-text-1)',
                }}
              >
                SFTP 文件管理 (开发中)
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
};

export default TerminalPanel;
