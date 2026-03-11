import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import BasicLayout from '@/layouts/BasicLayout';
import LoginPage from '@/pages/login';
import Dashboard from '@/pages/dashboard';
import HostPage from '@/pages/asset/host';

// 路由守卫
const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <BasicLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        {/* 资产管理 */}
        <Route path="asset/host" element={<HostPage />} />
        <Route path="asset/identity" element={<PlaceholderPage title="主机凭据" />} />
        <Route path="asset/grant" element={<PlaceholderPage title="资产授权" />} />
        {/* 终端 */}
        <Route path="terminal" element={<PlaceholderPage title="终端" />} />
        {/* 批量执行 */}
        <Route path="exec/command" element={<PlaceholderPage title="命令执行" />} />
        <Route path="exec/log" element={<PlaceholderPage title="执行日志" />} />
        <Route path="exec/cron" element={<PlaceholderPage title="定时任务" />} />
        {/* 用户管理 */}
        <Route path="user/list" element={<PlaceholderPage title="用户列表" />} />
        <Route path="user/role" element={<PlaceholderPage title="角色管理" />} />
        {/* 审计 */}
        <Route path="audit/operation" element={<PlaceholderPage title="操作日志" />} />
        <Route path="audit/connect" element={<PlaceholderPage title="连接日志" />} />
        {/* 系统 */}
        <Route path="system/setting" element={<PlaceholderPage title="系统配置" />} />
        <Route path="system/menu" element={<PlaceholderPage title="菜单管理" />} />
        <Route path="system/dict" element={<PlaceholderPage title="字典管理" />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
};

// 占位页面，后续逐步替换为真实页面
const PlaceholderPage = ({ title }: { title: string }) => (
  <div style={{ padding: 24 }}>
    <h2>{title}</h2>
    <p style={{ color: '#999' }}>页面开发中...</p>
  </div>
);

export default App;
