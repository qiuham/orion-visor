import {
  CloudServerOutlined,
  CodeOutlined,
  DashboardOutlined,
  DesktopOutlined,
  FileSearchOutlined,
  LogoutOutlined,
  SettingOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { ProLayout } from '@ant-design/pro-components';
import type { MenuDataItem } from '@ant-design/pro-components';
import { Dropdown, message } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';

const menuData: MenuDataItem[] = [
  {
    path: '/dashboard',
    name: '工作台',
    icon: <DashboardOutlined />,
  },
  {
    path: '/asset',
    name: '资产管理',
    icon: <CloudServerOutlined />,
    children: [
      { path: '/asset/host', name: '主机管理' },
      { path: '/asset/identity', name: '主机凭据' },
      { path: '/asset/grant', name: '资产授权' },
    ],
  },
  {
    path: '/terminal',
    name: '终端',
    icon: <DesktopOutlined />,
  },
  {
    path: '/exec',
    name: '批量执行',
    icon: <CodeOutlined />,
    children: [
      { path: '/exec/command', name: '命令执行' },
      { path: '/exec/log', name: '执行日志' },
      { path: '/exec/cron', name: '定时任务' },
    ],
  },
  {
    path: '/user',
    name: '用户管理',
    icon: <TeamOutlined />,
    children: [
      { path: '/user/list', name: '用户列表' },
      { path: '/user/role', name: '角色管理' },
    ],
  },
  {
    path: '/audit',
    name: '审计日志',
    icon: <FileSearchOutlined />,
    children: [
      { path: '/audit/operation', name: '操作日志' },
      { path: '/audit/connect', name: '连接日志' },
    ],
  },
  {
    path: '/system',
    name: '系统设置',
    icon: <SettingOutlined />,
    children: [
      { path: '/system/setting', name: '系统配置' },
      { path: '/system/menu', name: '菜单管理' },
      { path: '/system/dict', name: '字典管理' },
    ],
  },
];

const BasicLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    logout();
    message.success('已退出登录');
    navigate('/login');
  };

  return (
    <ProLayout
      title="Orion Visor"
      layout="mix"
      fixSiderbar
      fixedHeader
      location={{ pathname: location.pathname }}
      menuDataRender={() => menuData}
      menuItemRender={(item, dom) => (
        <a onClick={() => item.path && navigate(item.path)}>{dom}</a>
      )}
      avatarProps={{
        title: user?.nickname || user?.username || '用户',
        size: 'small',
        render: (_props, dom) => (
          <Dropdown
            menu={{
              items: [
                {
                  key: 'logout',
                  icon: <LogoutOutlined />,
                  label: '退出登录',
                  onClick: handleLogout,
                },
              ],
            }}
          >
            {dom}
          </Dropdown>
        ),
      }}
    >
      <Outlet />
    </ProLayout>
  );
};

export default BasicLayout;
