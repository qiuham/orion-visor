import { useEffect, useState } from 'react';
import {
  BellOutlined,
  CloudServerOutlined,
  CodeOutlined,
  DashboardOutlined,
  DesktopOutlined,
  FileSearchOutlined,
  FundOutlined,
  LogoutOutlined,
  SettingOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { ProLayout } from '@ant-design/pro-components';
import type { MenuDataItem } from '@ant-design/pro-components';
import { Badge, Dropdown, message, Popover, List, Button, Tag, Space } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { getUnreadCount, getNotifications, markAllRead, markRead, type Notification } from '@/api/notification';

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
      { path: '/asset/tag', name: '标签管理' },
    ],
  },
  {
    path: '/terminal',
    name: '终端',
    icon: <DesktopOutlined />,
  },
  {
    path: '/monitor',
    name: '主机监控',
    icon: <FundOutlined />,
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
      { path: '/audit/session', name: '终端录屏' },
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
      { path: '/system/stats', name: '统计报表' },
    ],
  },
];

const typeColorMap: Record<string, string> = {
  info: 'blue',
  warning: 'orange',
  error: 'red',
  success: 'green',
};

const BasicLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);

  // 轮询未读数量
  useEffect(() => {
    const fetchUnread = () => {
      getUnreadCount()
        .then((res) => setUnreadCount(res?.count || 0))
        .catch(() => {});
    };
    fetchUnread();
    const timer = setInterval(fetchUnread, 30000);
    return () => clearInterval(timer);
  }, []);

  const loadNotifications = () => {
    getNotifications({ page: 1, pageSize: 10 })
      .then((res) => setNotifications(res.rows || []))
      .catch(() => {});
  };

  const handleNotifOpen = (open: boolean) => {
    setNotifOpen(open);
    if (open) loadNotifications();
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
    setUnreadCount(0);
    loadNotifications();
  };

  const handleMarkRead = async (id: number) => {
    await markRead(id);
    setUnreadCount((c) => Math.max(0, c - 1));
    loadNotifications();
  };

  const handleLogout = () => {
    logout();
    message.success('已退出登录');
    navigate('/login');
  };

  const notificationContent = (
    <div style={{ width: 360 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0 8px' }}>
        <span style={{ fontWeight: 500 }}>通知消息</span>
        {unreadCount > 0 && (
          <Button type="link" size="small" onClick={handleMarkAllRead}>
            全部已读
          </Button>
        )}
      </div>
      <List
        size="small"
        dataSource={notifications}
        locale={{ emptyText: '暂无通知' }}
        renderItem={(item) => (
          <List.Item
            style={{
              background: item.status === 0 ? '#f0f5ff' : undefined,
              cursor: 'pointer',
              padding: '8px 4px',
            }}
            onClick={() => item.status === 0 && handleMarkRead(item.id)}
          >
            <List.Item.Meta
              title={
                <Space>
                  <Tag color={typeColorMap[item.type] || 'default'} style={{ marginRight: 0 }}>
                    {item.type}
                  </Tag>
                  <span>{item.title}</span>
                </Space>
              }
              description={
                <div style={{ fontSize: 12, color: '#999' }}>
                  {item.content && <div>{item.content}</div>}
                  <div>{item.createTime}</div>
                </div>
              }
            />
          </List.Item>
        )}
      />
    </div>
  );

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
      actionsRender={() => [
        <Popover
          key="notification"
          content={notificationContent}
          trigger="click"
          open={notifOpen}
          onOpenChange={handleNotifOpen}
          placement="bottomRight"
        >
          <Badge count={unreadCount} size="small" offset={[-2, 2]}>
            <BellOutlined style={{ fontSize: 18, cursor: 'pointer' }} />
          </Badge>
        </Popover>,
      ]}
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
