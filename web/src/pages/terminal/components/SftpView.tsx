import { useEffect, useState, useCallback } from 'react';
import { Table, Button, Breadcrumb, Space, message, Upload, Modal, Input, Tooltip } from 'antd';
import {
  FolderOutlined,
  FileOutlined,
  HomeOutlined,
  ReloadOutlined,
  UploadOutlined,
  FolderAddOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ArrowUpOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { listFiles, mkdir, removeFile, downloadFile, uploadFile, getFileContent, type FileInfo } from '@/api/sftp';
import type { TerminalSessionItem } from '../types';
import { useAuthStore } from '@/store/auth';

interface SftpViewProps {
  session: TerminalSessionItem;
  isActive: boolean;
}

const SftpView: React.FC<SftpViewProps> = ({ session, isActive }) => {
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [mkdirVisible, setMkdirVisible] = useState(false);
  const [mkdirName, setMkdirName] = useState('');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  const token = useAuthStore((s) => s.token);

  const loadFiles = useCallback(
    (path: string) => {
      setLoading(true);
      listFiles(session.hostId, path)
        .then((res) => {
          // Sort: directories first, then by name
          const sorted = (res || []).sort((a, b) => {
            if (a.isDir && !b.isDir) return -1;
            if (!a.isDir && b.isDir) return 1;
            return a.name.localeCompare(b.name);
          });
          setFiles(sorted);
          setCurrentPath(path);
        })
        .catch((e) => {
          console.warn('加载文件列表失败', e);
          message.error('加载文件列表失败');
        })
        .finally(() => setLoading(false));
    },
    [session.hostId]
  );

  useEffect(() => {
    if (isActive) {
      loadFiles(currentPath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  useEffect(() => {
    loadFiles('/');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigateTo = (path: string) => {
    loadFiles(path);
  };

  const goUp = () => {
    if (currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    navigateTo('/' + parts.join('/') || '/');
  };

  const handleDoubleClick = (file: FileInfo) => {
    if (file.isDir) {
      navigateTo(file.path);
    }
  };

  const handleMkdir = () => {
    if (!mkdirName.trim()) return;
    const path = currentPath === '/' ? `/${mkdirName}` : `${currentPath}/${mkdirName}`;
    mkdir(session.hostId, path)
      .then(() => {
        message.success('创建成功');
        setMkdirVisible(false);
        setMkdirName('');
        loadFiles(currentPath);
      })
      .catch(() => message.error('创建失败'));
  };

  const handleDelete = (file: FileInfo) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定删除 ${file.name} 吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        removeFile(session.hostId, file.path)
          .then(() => {
            message.success('删除成功');
            loadFiles(currentPath);
          })
          .catch(() => message.error('删除失败'));
      },
    });
  };

  const handleDownload = (file: FileInfo) => {
    const url = downloadFile(session.hostId, file.path);
    const link = document.createElement('a');
    link.href = url + `&token=${token}`;
    link.download = file.name;
    link.click();
  };

  const handleUpload = (file: File) => {
    uploadFile(session.hostId, currentPath, file)
      .then(() => {
        message.success('上传成功');
        loadFiles(currentPath);
      })
      .catch(() => message.error('上传失败'));
    return false; // Prevent default upload
  };

  const handlePreview = (file: FileInfo) => {
    getFileContent(session.hostId, file.path)
      .then((res) => {
        setPreviewContent(res.content);
        setPreviewTitle(file.name);
        setPreviewVisible(true);
      })
      .catch(() => message.error('读取文件内容失败'));
  };

  const formatSize = (size: number): string => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
    return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`;
  };

  const formatTime = (timestamp: number): string => {
    if (!timestamp) return '-';
    const d = new Date(timestamp * 1000);
    return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  // Breadcrumb parts
  const pathParts = currentPath.split('/').filter(Boolean);

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: FileInfo) => (
        <span
          style={{ cursor: record.isDir ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 6 }}
          onDoubleClick={() => handleDoubleClick(record)}
        >
          {record.isDir ? <FolderOutlined style={{ color: '#faad14' }} /> : <FileOutlined style={{ color: '#8c8c8c' }} />}
          {name}
        </span>
      ),
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: 120,
      render: (size: number, record: FileInfo) => (record.isDir ? '-' : formatSize(size)),
    },
    {
      title: '权限',
      dataIndex: 'mode',
      key: 'mode',
      width: 120,
    },
    {
      title: '修改时间',
      dataIndex: 'modTime',
      key: 'modTime',
      width: 180,
      render: (t: number) => formatTime(t),
    },
    {
      title: '操作',
      key: 'actions',
      width: 140,
      render: (_: unknown, record: FileInfo) => (
        <Space size={4}>
          {!record.isDir && (
            <>
              <Tooltip title="下载">
                <Button size="small" type="text" icon={<DownloadOutlined />} onClick={() => handleDownload(record)} />
              </Tooltip>
              <Tooltip title="查看">
                <Button size="small" type="text" icon={<EyeOutlined />} onClick={() => handlePreview(record)} />
              </Tooltip>
            </>
          )}
          <Tooltip title="删除">
            <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ display: isActive ? 'flex' : 'none', flexDirection: 'column', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <Tooltip title="上一级">
          <Button size="small" icon={<ArrowUpOutlined />} onClick={goUp} disabled={currentPath === '/'} />
        </Tooltip>
        <Tooltip title="根目录">
          <Button size="small" icon={<HomeOutlined />} onClick={() => navigateTo('/')} />
        </Tooltip>
        <Tooltip title="刷新">
          <Button size="small" icon={<ReloadOutlined />} onClick={() => loadFiles(currentPath)} />
        </Tooltip>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Breadcrumb
            items={[
              { title: <span style={{ cursor: 'pointer' }} onClick={() => navigateTo('/')}>/</span> },
              ...pathParts.map((part, i) => ({
                title: (
                  <span
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigateTo('/' + pathParts.slice(0, i + 1).join('/'))}
                  >
                    {part}
                  </span>
                ),
              })),
            ]}
          />
        </div>
        <Tooltip title="新建文件夹">
          <Button size="small" icon={<FolderAddOutlined />} onClick={() => setMkdirVisible(true)} />
        </Tooltip>
        <Upload
          showUploadList={false}
          beforeUpload={handleUpload}
          multiple={false}
        >
          <Tooltip title="上传文件">
            <Button size="small" icon={<UploadOutlined />} />
          </Tooltip>
        </Upload>
      </div>

      {/* File table */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 4px' }}>
        <Table
          columns={columns}
          dataSource={files}
          rowKey="path"
          loading={loading}
          size="small"
          pagination={false}
          scroll={{ y: 'calc(100vh - 200px)' }}
          onRow={(record) => ({
            onDoubleClick: () => handleDoubleClick(record),
          })}
        />
      </div>

      {/* Mkdir modal */}
      <Modal
        title="新建文件夹"
        open={mkdirVisible}
        onOk={handleMkdir}
        onCancel={() => { setMkdirVisible(false); setMkdirName(''); }}
        okText="创建"
        cancelText="取消"
      >
        <Input
          placeholder="文件夹名称"
          value={mkdirName}
          onChange={(e) => setMkdirName(e.target.value)}
          onPressEnter={handleMkdir}
        />
      </Modal>

      {/* Preview modal */}
      <Modal
        title={previewTitle}
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width={720}
      >
        <pre style={{
          maxHeight: 500,
          overflow: 'auto',
          background: '#f5f5f5',
          padding: 12,
          borderRadius: 4,
          fontSize: 12,
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}>
          {previewContent}
        </pre>
      </Modal>
    </div>
  );
};

export default SftpView;
