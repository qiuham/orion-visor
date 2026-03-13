import {
  PlusOutlined,
  BgColorsOutlined,
} from '@ant-design/icons';
import { Tooltip } from 'antd';
import { useTerminalStore } from '../store';

const LeftSidebar: React.FC = () => {
  const { activeTabKey, setActiveTab, setTheme, theme } = useTerminalStore();

  const topActions = [
    {
      key: 'new-connection',
      icon: <PlusOutlined />,
      title: '新建连接',
      onClick: () => setActiveTab('new-connection'),
    },
  ];

  const bottomActions = [
    {
      key: 'theme-setting',
      icon: <BgColorsOutlined />,
      title: theme === 'light' ? '切换暗色主题' : '切换亮色主题',
      onClick: () => setTheme(theme === 'light' ? 'dark' : 'light'),
    },
  ];

  return (
    <div className="terminal-left-sidebar">
      <div className="terminal-sidebar-group">
        {topActions.map((action) => (
          <Tooltip key={action.key} title={action.title} placement="right">
            <div className="terminal-sidebar-icon-wrapper">
              <button
                className={`terminal-sidebar-icon ${activeTabKey === action.key ? 'active' : ''}`}
                onClick={action.onClick}
              >
                {action.icon}
              </button>
            </div>
          </Tooltip>
        ))}
      </div>
      <div className="terminal-sidebar-group">
        {bottomActions.map((action) => (
          <Tooltip key={action.key} title={action.title} placement="right">
            <div className="terminal-sidebar-icon-wrapper">
              <button className="terminal-sidebar-icon" onClick={action.onClick}>
                {action.icon}
              </button>
            </div>
          </Tooltip>
        ))}
      </div>
    </div>
  );
};

export default LeftSidebar;
