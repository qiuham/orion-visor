import request from '@/utils/request';

export interface HostIdentity {
  id: number;
  name: string;
  type: string; // 'password' | 'key'
  username: string;
  password?: string;
  keyText?: string;
  passphrase?: string;
  remark?: string;
  createTime?: string;
  updateTime?: string;
}

export interface IdentityListParams {
  page?: number;
  pageSize?: number;
  name?: string;
  type?: string;
}

export interface PageResult<T> {
  rows: T[];
  total: number;
}

export function getIdentityList(params?: IdentityListParams) {
  return request.get<any, PageResult<HostIdentity>>('/host-identity', { params });
}

export function getIdentity(id: number) {
  return request.get<any, HostIdentity>(`/host-identity/${id}`);
}

export function createIdentity(data: Partial<HostIdentity>) {
  return request.post('/host-identity', data);
}

export function updateIdentity(id: number, data: Partial<HostIdentity>) {
  return request.put(`/host-identity/${id}`, data);
}

export function deleteIdentity(id: number) {
  return request.delete(`/host-identity/${id}`);
}
