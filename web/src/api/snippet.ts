import request from '@/utils/request';

export interface CommandSnippet {
  id: number;
  name: string;
  command: string;
  groupId: number;
  createTime?: string;
  updateTime?: string;
}

export function getSnippetList(): Promise<CommandSnippet[]> {
  return request.get('/command-snippet');
}

export function createSnippet(data: { name: string; command: string; groupId?: number }): Promise<CommandSnippet> {
  return request.post('/command-snippet', data);
}

export function updateSnippet(id: number, data: { name?: string; command?: string; groupId?: number }) {
  return request.put(`/command-snippet/${id}`, data);
}

export function deleteSnippet(id: number) {
  return request.delete(`/command-snippet/${id}`);
}
