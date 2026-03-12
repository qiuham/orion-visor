import request from '@/utils/request';

export interface User {
  id: number;
  username: string;
  nickname: string;
  email?: string;
  phone?: string;
  avatar?: string;
  status: number;
  lastLoginTime?: string;
  createTime?: string;
  updateTime?: string;
}

export interface PageResult<T> {
  rows: T[];
  total: number;
}

export function getUserList(params?: { page?: number; pageSize?: number; username?: string; status?: number }) {
  return request.get<any, PageResult<User>>('/user', { params });
}

export function createUser(data: Partial<User> & { password: string }) {
  return request.post('/user', data);
}

export function updateUser(id: number, data: Partial<User>) {
  return request.put(`/user/${id}`, data);
}

export function deleteUser(id: number) {
  return request.delete(`/user/${id}`);
}

export function resetPassword(id: number, password: string) {
  return request.put(`/user/${id}/password`, { password });
}

export function getUserRoles(id: number) {
  return request.get<any, number[]>(`/user/${id}/roles`);
}

export function updateUserRoles(id: number, roleIds: number[]) {
  return request.put(`/user/${id}/roles`, { roleIds });
}
