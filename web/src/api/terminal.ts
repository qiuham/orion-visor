import request from '@/utils/request';

export interface TerminalSession {
  id: number;
  userId: number;
  username: string;
  hostId: number;
  hostName: string;
  hostAddress: string;
  type: string;
  startTime?: string;
  endTime?: string;
  createTime?: string;
}

export interface PageResult<T> {
  rows: T[];
  total: number;
}

export function getTerminalSessions(params?: { page?: number; pageSize?: number }) {
  return request.get<any, PageResult<TerminalSession>>('/terminal-session', { params });
}

export function getTerminalSession(id: number) {
  return request.get<any, TerminalSession>(`/terminal-session/${id}`);
}

export function getTerminalSessionData(id: number) {
  return request.get<any, any>(`/terminal-session/${id}/data`);
}

export function deleteTerminalSession(id: number) {
  return request.delete(`/terminal-session/${id}`);
}
