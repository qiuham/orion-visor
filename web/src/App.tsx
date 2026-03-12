import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import BasicLayout from '@/layouts/BasicLayout';
import LoginPage from '@/pages/login';
import Dashboard from '@/pages/dashboard';
import HostPage from '@/pages/asset/host';
import IdentityPage from '@/pages/asset/identity';
import AssetGrantPage from '@/pages/asset/grant';
import TerminalPage from '@/pages/terminal';
import ExecCommandPage from '@/pages/exec/command';
import ExecLogPage from '@/pages/exec/log';
import CronPage from '@/pages/exec/cron';
import UserListPage from '@/pages/user/list';
import RolePage from '@/pages/user/role';
import OperationLogPage from '@/pages/audit/operation';
import ConnectLogPage from '@/pages/audit/connect';
import TerminalSessionPage from '@/pages/audit/session';
import SystemSettingPage from '@/pages/system/setting';
import MenuPage from '@/pages/system/menu';
import DictPage from '@/pages/system/dict';

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
        <Route path="asset/identity" element={<IdentityPage />} />
        <Route path="asset/grant" element={<AssetGrantPage />} />
        {/* 终端 */}
        <Route path="terminal" element={<TerminalPage />} />
        {/* 批量执行 */}
        <Route path="exec/command" element={<ExecCommandPage />} />
        <Route path="exec/log" element={<ExecLogPage />} />
        <Route path="exec/cron" element={<CronPage />} />
        {/* 用户管理 */}
        <Route path="user/list" element={<UserListPage />} />
        <Route path="user/role" element={<RolePage />} />
        {/* 审计 */}
        <Route path="audit/operation" element={<OperationLogPage />} />
        <Route path="audit/connect" element={<ConnectLogPage />} />
        <Route path="audit/session" element={<TerminalSessionPage />} />
        {/* 系统 */}
        <Route path="system/setting" element={<SystemSettingPage />} />
        <Route path="system/menu" element={<MenuPage />} />
        <Route path="system/dict" element={<DictPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
};

export default App;
