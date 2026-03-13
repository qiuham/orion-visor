import {
  CodeOutlined,
  SwapOutlined,
  SendOutlined,
  CameraOutlined,
} from '@ant-design/icons';
import { Tooltip } from 'antd';
import { useTerminalStore } from '../store';

interface RightSidebarProps {
  onOpenSnippets: () => void;
  onOpenCommandBar: () => void;
  onScreenshot: () => void;
}

const RightSidebar: React.FC<RightSidebarProps> = ({
  onOpenSnippets,
  onOpenCommandBar,
  onScreenshot,
}) => {
  const { commandBarVisible } = useTerminalStore();

  const topActions = [
    {
      key: 'snippets',
      icon: <CodeOutlined />,
      title: '命令片段',
      onClick: onOpenSnippets,
    },
    {
      key: 'transfer',
      icon: <SwapOutlined rotate={90} />,
      title: '文件传输',
      onClick: () => {},
    },
  ];

  const bottomActions = [
    {
      key: 'command-bar',
      icon: <SendOutlined />,
      title: '发送命令',
      active: commandBarVisible,
      onClick: onOpenCommandBar,
    },
    {
      key: 'screenshot',
      icon: <CameraOutlined />,
      title: '截图',
      onClick: onScreenshot,
    },
  ];

  return (
    <div className="terminal-right-sidebar">
      <div className="terminal-sidebar-group">
        {topActions.map((action) => (
          <Tooltip key={action.key} title={action.title} placement="left">
            <div className="terminal-sidebar-icon-wrapper">
              <button className="terminal-sidebar-icon" onClick={action.onClick}>
                {action.icon}
              </button>
            </div>
          </Tooltip>
        ))}
      </div>
      <div className="terminal-sidebar-group">
        {bottomActions.map((action) => (
          <Tooltip key={action.key} title={action.title} placement="left">
            <div className="terminal-sidebar-icon-wrapper">
              <button
                className={`terminal-sidebar-icon ${'active' in action && action.active ? 'active' : ''}`}
                onClick={action.onClick}
              >
                {action.icon}
              </button>
            </div>
          </Tooltip>
        ))}
      </div>
    </div>
  );
};

export default RightSidebar;
