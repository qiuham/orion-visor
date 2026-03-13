import { useTerminalStore } from '../store';
import {
  CloseOutlined,
  PlusOutlined,
  CodeOutlined,
  DesktopOutlined,
  BgColorsOutlined,
  ThunderboltOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
} from '@ant-design/icons';
import { Tooltip } from 'antd';

const tabIcons: Record<string, React.ReactNode> = {
  'new-connection': <PlusOutlined />,
  'display-setting': <DesktopOutlined />,
  'shortcut-setting': <ThunderboltOutlined />,
  'theme-setting': <BgColorsOutlined />,
  'terminal-panel': <CodeOutlined />,
};

interface LayoutHeaderProps {
  onFullscreen: () => void;
  isFullscreen: boolean;
}

const LayoutHeader: React.FC<LayoutHeaderProps> = ({ onFullscreen, isFullscreen }) => {
  const { tabs, activeTabKey, setActiveTab, removeTab } = useTerminalStore();

  return (
    <div className="terminal-header">
      {/* Logo */}
      <div className="terminal-header-left">
        <div className="logo-icon">T</div>
        <span className="logo-text">Web 终端</span>
      </div>

      {/* Tabs */}
      <div className="terminal-header-center">
        <div className="terminal-header-tabs">
          {tabs.map((tab) => (
            <div
              key={tab.key}
              className={`terminal-header-tab ${activeTabKey === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="tab-title">
                {tabIcons[tab.type] || <CodeOutlined />}
                <span>{tab.title}</span>
              </span>
              {tab.closable !== false && (
                <span
                  className="tab-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTab(tab.key);
                  }}
                >
                  <CloseOutlined />
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right actions */}
      <div className="terminal-header-right">
        <Tooltip title={isFullscreen ? '退出全屏' : '全屏'} placement="bottom">
          <div className="terminal-sidebar-icon-wrapper">
            <button className="terminal-sidebar-icon" onClick={onFullscreen}>
              {isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            </button>
          </div>
        </Tooltip>
      </div>
    </div>
  );
};

export default LayoutHeader;
