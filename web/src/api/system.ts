import request from '@/utils/request';

export interface SystemSetting {
  item: string;
  value: string;
  remark?: string;
}

export interface DictKey {
  id: number;
  keyName: string;
  description?: string;
  createTime?: string;
}

export interface DictValue {
  id: number;
  keyName: string;
  value: string;
  label: string;
  extra?: string;
  sort: number;
  createTime?: string;
}

export function getSettings() {
  return request.get<any, SystemSetting[]>('/system/setting');
}

export function updateSetting(item: string, value: string) {
  return request.put(`/system/setting/${item}`, { value });
}

export function getDictKeys() {
  return request.get<any, DictKey[]>('/dict/key');
}

export function createDictKey(data: { keyName: string; description?: string }) {
  return request.post('/dict/key', data);
}

export function deleteDictKey(id: number) {
  return request.delete(`/dict/key/${id}`);
}

export function getDictValues(keyName: string) {
  return request.get<any, DictValue[]>(`/dict/value/${keyName}`);
}

export function createDictValue(data: Partial<DictValue>) {
  return request.post('/dict/value', data);
}

export function deleteDictValue(id: number) {
  return request.delete(`/dict/value/${id}`);
}
