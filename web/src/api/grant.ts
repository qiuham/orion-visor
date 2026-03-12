import request from '@/utils/request';

export function getGrantedHosts(grantType: string, grantId: number) {
  return request.get<any, number[]>('/asset-grant', { params: { grantType, grantId } });
}

export function updateGrant(data: { grantType: string; grantId: number; hostIds: number[] }) {
  return request.put('/asset-grant', data);
}

export function getUserAccessibleHosts(userId: number) {
  return request.get<any, number[]>(`/asset-grant/user/${userId}/hosts`);
}
