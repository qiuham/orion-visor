import {
  PlusOutlined,
  BgColorsOutlined,
  SettingOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { Tooltip } from 'antd';
import { useTerminalStore } from '../store';

const LeftSidebar: React.FC = () => {
  const { activeTabKey, setActiveTab, addTab, setUiTheme, uiTheme } = useTerminalStore();

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
      key: 'shortcut-setting',
      icon: <ThunderboltOutlined />,
      title: '快捷键设置',
      onClick: () => addTab({
        key: 'shortcut-setting',
        title: '快捷键设置',
        type: 'shortcut-setting',
        closable: true,
      }),
    },
    {
      key: 'display-setting',
      icon: <SettingOutlined />,
      title: '显示设置',
      onClick: () => addTab({
        key: 'display-setting',
        title: '显示设置',
        type: 'display-setting',
        closable: true,
      }),
    },
    {
      key: 'theme-toggle',
      icon: <BgColorsOutlined />,
      title: uiTheme === 'light' ? '切换暗色主题' : '切换亮色主题',
      onClick: () => setUiTheme(uiTheme === 'light' ? 'dark' : 'light'),
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
    </div>
  );
};

export default LeftSidebar;
