import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { LoginForm, ProFormText } from '@ant-design/pro-components';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { login, getCurrentUser, getPermissions } from '@/api/auth';
import { useAuthStore } from '@/store/auth';

const LoginPage = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleLogin = async (values: { username: string; password: string }) => {
    try {
      const res = await login(values);
      // 先存 token，后续请求需要
      useAuthStore.getState().setAuth(res.token, {
        ...res.user,
        permissions: [],
      });
      // 获取权限
      const permissions = await getPermissions();
      const user = await getCurrentUser();
      setAuth(res.token, { ...user, permissions });
      message.success('登录成功');
      navigate('/');
    } catch {
      message.error('登录失败，请检查用户名和密码');
    }
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f0f2f5',
    }}>
      <LoginForm
        title="运维平台"
        subTitle="轻量级运维管理平台"
        onFinish={handleLogin}
      >
        <ProFormText
          name="username"
          fieldProps={{ size: 'large', prefix: <UserOutlined /> }}
          placeholder="用户名"
          rules={[{ required: true, message: '请输入用户名' }]}
        />
        <ProFormText.Password
          name="password"
          fieldProps={{ size: 'large', prefix: <LockOutlined /> }}
          placeholder="密码"
          rules={[{ required: true, message: '请输入密码' }]}
        />
      </LoginForm>
    </div>
  );
};

export default LoginPage;
