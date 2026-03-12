import request from '@/utils/request';

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  isDir: boolean;
  modTime: number;
  mode: string;
}

export function listFiles(hostId: number, path: string): Promise<FileInfo[]> {
  return request.get(`/sftp/${hostId}/list`, { params: { path } });
}

export function mkdir(hostId: number, path: string) {
  return request.post(`/sftp/${hostId}/mkdir`, { path });
}

export function removeFile(hostId: number, path: string) {
  return request.post(`/sftp/${hostId}/remove`, { path });
}

export function downloadFile(hostId: number, path: string): string {
  return `/api/sftp/${hostId}/download?path=${encodeURIComponent(path)}`;
}

export function uploadFile(hostId: number, path: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('path', path);
  return request.post(`/sftp/${hostId}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function getFileContent(hostId: number, path: string): Promise<{ content: string }> {
  return request.get(`/sftp/${hostId}/content`, { params: { path } });
}

export function saveFileContent(hostId: number, path: string, content: string) {
  return request.post(`/sftp/${hostId}/save`, { path, content });
}
