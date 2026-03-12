import request from '@/utils/request';

export interface LoginParams {
  username: string;
  password: string;
}

export interface LoginResult {
  token: string;
  user: {
    id: number;
    username: string;
    nickname: string;
    avatar?: string;
  };
}

export interface CurrentUser {
  id: number;
  username: string;
  nickname: string;
  avatar?: string;
  permissions: string[];
}

export function login(params: LoginParams): Promise<LoginResult> {
  return request.post('/auth/login', params);
}

export function getCurrentUser(): Promise<CurrentUser> {
  return request.get('/user/current');
}

export function getPermissions(): Promise<string[]> {
  return request.get('/user/current/permissions');
}

export function updatePassword(oldPassword: string, newPassword: string) {
  return request.put('/user/current/password', { oldPassword, newPassword });
}

export function logout() {
  return request.post('/auth/logout');
}
