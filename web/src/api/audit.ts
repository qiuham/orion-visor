import request from '@/utils/request';

export interface OperationLog {
  id: number;
  userId: number;
  username: string;
  module: string;
  type: string;
  severity: number;
  description?: string;
  requestUrl?: string;
  requestMethod?: string;
  duration?: number;
  result?: string;
  createTime?: string;
}

export interface ConnectLog {
  id: number;
  userId: number;
  username: string;
  hostId: number;
  hostName: string;
  hostAddress: string;
  type: string; // SSH, RDP, VNC
  status: string;
  startTime?: string;
  endTime?: string;
  createTime?: string;
}

export interface PageResult<T> {
  rows: T[];
  total: number;
}

export function getOperationLogs(params?: {
  page?: number;
  pageSize?: number;
  username?: string;
  module?: string;
  type?: string;
}) {
  return request.get<any, PageResult<OperationLog>>('/audit/operation-log', { params });
}

export function getConnectLogs(params?: {
  page?: number;
  pageSize?: number;
  username?: string;
  hostName?: string;
  type?: string;
}) {
  return request.get<any, PageResult<ConnectLog>>('/audit/connect-log', { params });
}
