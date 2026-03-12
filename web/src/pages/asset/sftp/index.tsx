import { useState, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import {
  Card, Table, Button, Space, Select, Breadcrumb, Modal, Input, Upload,
  message, Popconfirm, Tooltip, Spin,
} from 'antd';
import {
  FolderOutlined, FileOutlined, ArrowUpOutlined, ReloadOutlined,
  DeleteOutlined, DownloadOutlined, UploadOutlined, FolderAddOutlined,
  EditOutlined, HomeOutlined,
} from '@ant-design/icons';
import { getHostList, type Host } from '@/api/host';
import {
  listFiles, mkdir, removeFile, downloadFile, getFileContent,
  saveFileContent, uploadFile, type FileInfo,
} from '@/api/sftp';
import { useAuthStore } from '@/store/auth';

const formatSize = (bytes: number): string => {
  if (bytes === 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
};

const SftpPage = () => {
  const token = useAuthStore((s) => s.token);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [hostId, setHostId] = useState<number | null>(null);
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [mkdirOpen, setMkdirOpen] = useState(false);
  const [newDirName, setNewDirName] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editPath, setEditPath] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    getHostList({ page: 1, pageSize: 1000 })
      .then((res) => setHosts(res.rows || []))
      .catch(() => {});
  }, []);

  const loadFiles = async (hid: number, path: string) => {
    setLoading(true);
    try {
      const data = await listFiles(hid, path);
      // Sort: dirs first, then by name
      const sorted = (data || []).sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      setFiles(sorted);
      setCurrentPath(path);
    } catch {
      message.error('读取目录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHost = (id: number) => {
    setHostId(id);
    loadFiles(id, '/');
  };

  const navigateTo = (path: string) => {
    if (hostId) loadFiles(hostId, path);
  };

  const goUp = () => {
    if (currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    navigateTo('/' + parts.join('/') || '/');
  };

  const handleMkdir = async () => {
    if (!hostId || !newDirName.trim()) return;
    const path = currentPath === '/' ? `/${newDirName}` : `${currentPath}/${newDirName}`;
    try {
      await mkdir(hostId, path);
      message.success('创建成功');
      setMkdirOpen(false);
      setNewDirName('');
      loadFiles(hostId, currentPath);
    } catch {
      message.error('创建失败');
    }
  };

  const handleDelete = async (path: string) => {
    if (!hostId) return;
    try {
      await removeFile(hostId, path);
      message.success('删除成功');
      loadFiles(hostId, currentPath);
    } catch {
      message.error('删除失败');
    }
  };

  const handleDownload = (path: string) => {
    if (!hostId) return;
    const url = downloadFile(hostId, path);
    const a = document.createElement('a');
    a.href = url + `&token=${token}`;
    a.download = '';
    a.click();
  };

  const handleEdit = async (path: string) => {
    if (!hostId) return;
    setEditLoading(true);
    setEditOpen(true);
    setEditPath(path);
    try {
      const res = await getFileContent(hostId, path);
      setEditContent(res.content);
    } catch {
      message.error('读取文件失败');
      setEditOpen(false);
    } finally {
      setEditLoading(false);
    }
  };

  const handleSave = async () => {
    if (!hostId) return;
    setEditLoading(true);
    try {
      await saveFileContent(hostId, editPath, editContent);
      message.success('保存成功');
      setEditOpen(false);
    } catch {
      message.error('保存失败');
    } finally {
      setEditLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    if (!hostId) return;
    try {
      await uploadFile(hostId, currentPath, file);
      message.success('上传成功');
      loadFiles(hostId, currentPath);
    } catch {
      message.error('上传失败');
    }
    return false; // prevent antd auto upload
  };

  // Build breadcrumb from path
  const pathParts = currentPath.split('/').filter(Boolean);
  const breadcrumbItems = [
    { title: <a onClick={() => navigateTo('/')}><HomeOutlined /> /</a>, key: '/' },
    ...pathParts.map((part, idx) => {
      const path = '/' + pathParts.slice(0, idx + 1).join('/');
      return { title: <a onClick={() => navigateTo(path)}>{part}</a>, key: path };
    }),
  ];

  return (
    <PageContainer>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space>
          <span>主机：</span>
          <Select
            showSearch
            placeholder="选择主机"
            value={hostId}
            onChange={handleSelectHost}
            style={{ width: 280 }}
            optionFilterProp="label"
            options={hosts.map((h) => ({ label: `${h.name} (${h.address})`, value: h.id }))}
          />
          {hostId && (
            <>
              <Button icon={<ArrowUpOutlined />} onClick={goUp} disabled={currentPath === '/'}>
                上级
              </Button>
              <Button icon={<ReloadOutlined />} onClick={() => loadFiles(hostId, currentPath)}>
                刷新
              </Button>
              <Button icon={<FolderAddOutlined />} onClick={() => { setNewDirName(''); setMkdirOpen(true); }}>
                新建目录
              </Button>
              <Upload beforeUpload={(file) => { handleUpload(file as File); return false; }} showUploadList={false}>
                <Button icon={<UploadOutlined />}>上传文件</Button>
              </Upload>
            </>
          )}
        </Space>
      </Card>

      {hostId && (
        <Card
          size="small"
          title={<Breadcrumb items={breadcrumbItems} />}
        >
          <Spin spinning={loading}>
            <Table
              dataSource={files}
              rowKey="path"
              size="small"
              pagination={false}
              scroll={{ y: 520 }}
              columns={[
                {
                  title: '名称',
                  dataIndex: 'name',
                  ellipsis: true,
                  render: (name: string, record: FileInfo) => (
                    <a
                      onClick={() => record.isDir && navigateTo(record.path)}
                      style={{ cursor: record.isDir ? 'pointer' : 'default' }}
                    >
                      <Space>
                        {record.isDir ? <FolderOutlined style={{ color: '#faad14' }} /> : <FileOutlined />}
                        {name}
                      </Space>
                    </a>
                  ),
                },
                {
                  title: '大小',
                  dataIndex: 'size',
                  width: 100,
                  render: (size: number, record: FileInfo) => record.isDir ? '-' : formatSize(size),
                },
                {
                  title: '权限',
                  dataIndex: 'mode',
                  width: 110,
                },
                {
                  title: '修改时间',
                  dataIndex: 'modTime',
                  width: 170,
                  render: (t: number) => t ? new Date(t).toLocaleString() : '-',
                },
                {
                  title: '操作',
                  width: 140,
                  render: (_: any, record: FileInfo) => (
                    <Space size={4}>
                      {!record.isDir && (
                        <>
                          <Tooltip title="下载">
                            <Button type="link" size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(record.path)} />
                          </Tooltip>
                          <Tooltip title="编辑">
                            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record.path)} />
                          </Tooltip>
                        </>
                      )}
                      <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.path)}>
                        <Tooltip title="删除">
                          <Button type="link" size="small" danger icon={<DeleteOutlined />} />
                        </Tooltip>
                      </Popconfirm>
                    </Space>
                  ),
                },
              ]}
            />
          </Spin>
        </Card>
      )}

      <Modal
        title="新建目录"
        open={mkdirOpen}
        onOk={handleMkdir}
        onCancel={() => setMkdirOpen(false)}
        width={400}
      >
        <Input
          placeholder="目录名称"
          value={newDirName}
          onChange={(e) => setNewDirName(e.target.value)}
          onPressEnter={handleMkdir}
        />
      </Modal>

      <Modal
        title={`编辑文件 - ${editPath.split('/').pop()}`}
        open={editOpen}
        onOk={handleSave}
        onCancel={() => setEditOpen(false)}
        width={800}
        confirmLoading={editLoading}
      >
        <Spin spinning={editLoading}>
          <Input.TextArea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={20}
            style={{ fontFamily: 'monospace', fontSize: 13 }}
          />
        </Spin>
      </Modal>
    </PageContainer>
  );
};

export default SftpPage;
