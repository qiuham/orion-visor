import request from '@/utils/request';

export interface Tag {
  id: number;
  name: string;
  color: string;
  createTime?: string;
}

export function getTagList() {
  return request.get<any, Tag[]>('/tag');
}

export function createTag(data: { name: string; color?: string }) {
  return request.post('/tag', data);
}

export function deleteTag(id: number) {
  return request.delete(`/tag/${id}`);
}
