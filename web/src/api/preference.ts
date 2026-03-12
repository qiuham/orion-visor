import request from '@/utils/request';

export interface UserPreference {
  id: number;
  userId: number;
  type: string;
  item: string;
  value: string;
}

export interface Favorite {
  id: number;
  userId: number;
  type: string;
  relId: number;
  createTime?: string;
}

export function getPreferences(type?: string) {
  return request.get<any, UserPreference[]>('/preference', { params: { type } });
}

export function setPreference(data: { type: string; item: string; value: string }) {
  return request.put('/preference', data);
}

export function deletePreference(type: string, item: string) {
  return request.delete('/preference', { params: { type, item } });
}

export function getFavorites(type?: string) {
  return request.get<any, Favorite[]>('/favorite', { params: { type } });
}

export function addFavorite(data: { type: string; relId: number }) {
  return request.post('/favorite', data);
}

export function removeFavorite(type: string, relId: number) {
  return request.delete('/favorite', { params: { type, relId } });
}
