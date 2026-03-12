import request from '@/utils/request';

export interface ExecJob {
  id: number;
  name: string;
  command: string;
  parameterSchema?: string;
  timeout: number;
  status: string; // pending, running, completed, failed, cancelled
  hostIds?: number[];
  createUser?: string;
  createTime?: string;
  updateTime?: string;
  finishTime?: string;
}

export interface ExecJobHost {
  id: number;
  jobId: number;
  hostId: number;
  hostName: string;
  hostAddress: string;
  status: string;
  exitCode?: number;
  output?: string;
  errorOutput?: string;
  startTime?: string;
  finishTime?: string;
}

export interface PageResult<T> {
  rows: T[];
  total: number;
}

export function createExecJob(data: { name: string; command: string; timeout?: number; hostIds: number[] }) {
  return request.post('/exec/job', data);
}

export function getExecJobList(params?: { page?: number; pageSize?: number; status?: string }) {
  return request.get<any, PageResult<ExecJob>>('/exec/job', { params });
}

export function getExecJob(id: number) {
  return request.get<any, ExecJob>(`/exec/job/${id}`);
}

export function getExecJobHosts(id: number) {
  return request.get<any, ExecJobHost[]>(`/exec/job/${id}/hosts`);
}

export function cancelExecJob(id: number) {
  return request.put(`/exec/job/${id}/cancel`);
}

// 定时任务
export interface CronJob {
  id: number;
  name: string;
  expression: string;
  command: string;
  hostIds?: number[];
  status: number; // 1=启用 2=禁用
  remark?: string;
  lastExecTime?: string;
  nextExecTime?: string;
  createTime?: string;
}

export interface CronJobLog {
  id: number;
  cronId: number;
  status: string;
  output?: string;
  startTime?: string;
  finishTime?: string;
}

export function getCronList(params?: { page?: number; pageSize?: number }) {
  return request.get<any, PageResult<CronJob>>('/cron', { params });
}

export function createCron(data: Partial<CronJob>) {
  return request.post('/cron', data);
}

export function updateCron(id: number, data: Partial<CronJob>) {
  return request.put(`/cron/${id}`, data);
}

export function deleteCron(id: number) {
  return request.delete(`/cron/${id}`);
}

export function triggerCron(id: number) {
  return request.post(`/cron/${id}/trigger`);
}

export function getCronLogs(id: number, params?: { page?: number; pageSize?: number }) {
  return request.get<any, PageResult<CronJobLog>>(`/cron/${id}/logs`, { params });
}
