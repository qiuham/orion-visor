import request from '@/utils/request';

export interface Notification {
  id: number;
  userId: number;
  title: string;
  content: string;
  type: string; // info, warning, error, success
  status: number; // 0=未读 1=已读
  readTime?: string;
  createTime?: string;
}

export interface PageResult<T> {
  rows: T[];
  total: number;
}

export function getNotifications(params?: { page?: number; pageSize?: number; status?: number }) {
  return request.get<any, PageResult<Notification>>('/notification', { params });
}

export function createNotification(data: { userId?: number; title: string; content?: string; type: string }) {
  return request.post('/notification', data);
}

export function getUnreadCount() {
  return request.get<any, { count: number }>('/notification/unread-count');
}

export function markRead(id: number) {
  return request.put(`/notification/${id}/read`);
}

export function markAllRead() {
  return request.put('/notification/read-all');
}

export function deleteNotification(id: number) {
  return request.delete(`/notification/${id}`);
}
