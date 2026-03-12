import request from '@/utils/request';

export interface Role {
  id: number;
  name: string;
  code: string;
  sort: number;
  status: number;
  remark?: string;
  createTime?: string;
  updateTime?: string;
}

export interface Menu {
  id: number;
  parentId: number;
  name: string;
  permission: string;
  type: number;
  sort: number;
  icon?: string;
  path?: string;
  children?: Menu[];
}

export function getRoleList() {
  return request.get<any, Role[]>('/role');
}

export function getRole(id: number) {
  return request.get<any, Role>(`/role/${id}`);
}

export function createRole(data: Partial<Role>) {
  return request.post('/role', data);
}

export function updateRole(id: number, data: Partial<Role>) {
  return request.put(`/role/${id}`, data);
}

export function deleteRole(id: number) {
  return request.delete(`/role/${id}`);
}

export function getRoleMenus(id: number) {
  return request.get<any, number[]>(`/role/${id}/menus`);
}

export function updateRoleMenus(id: number, menuIds: number[]) {
  return request.put(`/role/${id}/menus`, { menuIds });
}

export function getMenuList() {
  return request.get<any, Menu[]>('/menu');
}
