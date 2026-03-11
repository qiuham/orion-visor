import request from '@/utils/request';

// ============ Types ============

export interface Host {
  id: number;
  type: string;
  name: string;
  code: string;
  address: string;
  port: number;
  status: number;
  tags: string;
  remark: string;
  identityId: number;
  createTime: string;
  updateTime: string;
  creator: string;
}

export interface HostListParams {
  page?: number;
  pageSize?: number;
  name?: string;
  type?: string;
  status?: number;
  groupId?: number;
}

export interface HostCreateParams {
  type: string;
  name: string;
  code: string;
  address: string;
  port: number;
  tags?: string;
  remark?: string;
}

export interface HostUpdateParams {
  name?: string;
  address?: string;
  port?: number;
  status?: number;
  tags?: string;
  remark?: string;
  identityId?: number;
}

export interface PageResult<T> {
  total: number;
  rows: T[];
}

// ============ Host API ============

export function getHostList(params: HostListParams): Promise<PageResult<Host>> {
  return request.get('/host', { params });
}

export function getHost(id: number): Promise<Host> {
  return request.get(`/host/${id}`);
}

export function createHost(data: HostCreateParams): Promise<Host> {
  return request.post('/host', data);
}

export function updateHost(id: number, data: HostUpdateParams): Promise<void> {
  return request.put(`/host/${id}`, data);
}

export function deleteHost(id: number): Promise<void> {
  return request.delete(`/host/${id}`);
}
