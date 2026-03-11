import request from '@/utils/request';

export interface HostGroup {
  id: number;
  parentId: number;
  name: string;
  sort: number;
  createTime: string;
  updateTime: string;
}

export interface HostGroupCreateParams {
  parentId?: number;
  name: string;
  sort?: number;
}

export interface HostGroupUpdateParams {
  name?: string;
  sort?: number;
}

export function getHostGroupList(): Promise<HostGroup[]> {
  return request.get('/host-group');
}

export function createHostGroup(data: HostGroupCreateParams): Promise<HostGroup> {
  return request.post('/host-group', data);
}

export function updateHostGroup(id: number, data: HostGroupUpdateParams): Promise<void> {
  return request.put(`/host-group/${id}`, data);
}

export function deleteHostGroup(id: number): Promise<void> {
  return request.delete(`/host-group/${id}`);
}

export function getGroupHosts(id: number): Promise<number[]> {
  return request.get(`/host-group/${id}/hosts`);
}

export function updateGroupHosts(id: number, hostIds: number[]): Promise<void> {
  return request.put(`/host-group/${id}/hosts`, { hostIds });
}
