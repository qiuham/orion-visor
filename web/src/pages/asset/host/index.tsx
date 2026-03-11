import { useRef, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Tag, Modal, Form, Input, InputNumber, Select, message, Popconfirm, Card } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { getHostList, createHost, updateHost, deleteHost, type Host, type HostCreateParams } from '@/api/host';
import HostGroupTree from './HostGroupTree';

const statusMap: Record<number, { text: string; color: string }> = {
  1: { text: '启用', color: 'green' },
  2: { text: '禁用', color: 'red' },
};

const typeOptions = [
  { label: 'SSH', value: 'SSH' },
  { label: 'RDP', value: 'RDP' },
  { label: 'VNC', value: 'VNC' },
];

const HostPage = () => {
  const actionRef = useRef<ActionType>();
  const [selectedGroupId, setSelectedGroupId] = useState<number | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHost, setEditingHost] = useState<Host | null>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const handleGroupSelect = (groupId: number | undefined) => {
    setSelectedGroupId(groupId);
    // 切换分组后刷新列表
    actionRef.current?.reload();
  };

  const openCreateModal = () => {
    setEditingHost(null);
    form.resetFields();
    form.setFieldsValue({ type: 'SSH', port: 22, status: 1 });
    setModalOpen(true);
  };

  const openEditModal = (record: Host) => {
    setEditingHost(record);
    form.setFieldsValue({
      name: record.name,
      address: record.address,
      port: record.port,
      type: record.type,
      status: record.status,
      tags: record.tags,
      remark: record.remark,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (editingHost) {
        await updateHost(editingHost.id, {
          name: values.name,
          address: values.address,
          port: values.port,
          status: values.status,
          tags: values.tags,
          remark: values.remark,
        });
        message.success('更新成功');
      } else {
        const params: HostCreateParams = {
          type: values.type,
          name: values.name,
          code: values.code,
          address: values.address,
          port: values.port,
          tags: values.tags,
          remark: values.remark,
        };
        await createHost(params);
        message.success('创建成功');
      }
      setModalOpen(false);
      actionRef.current?.reload();
    } catch {
      // validation error
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteHost(id);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch {
      message.error('删除失败');
    }
  };

  const columns: ProColumns<Host>[] = [
    {
      title: '主机名称',
      dataIndex: 'name',
      ellipsis: true,
      width: 160,
    },
    {
      title: '主机编码',
      dataIndex: 'code',
      ellipsis: true,
      width: 120,
      search: false,
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 80,
      valueType: 'select',
      fieldProps: { options: typeOptions },
      render: (_, record) => <Tag>{record.type}</Tag>,
    },
    {
      title: '主机地址',
      dataIndex: 'address',
      ellipsis: true,
      width: 140,
      search: false,
    },
    {
      title: '端口',
      dataIndex: 'port',
      width: 80,
      search: false,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      valueType: 'select',
      fieldProps: {
        options: [
          { label: '启用', value: 1 },
          { label: '禁用', value: 2 },
        ],
      },
      render: (_, record) => {
        const s = statusMap[record.status];
        return s ? <Tag color={s.color}>{s.text}</Tag> : '-';
      },
    },
    {
      title: '备注',
      dataIndex: 'remark',
      ellipsis: true,
      width: 160,
      search: false,
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      width: 170,
      valueType: 'dateTime',
      search: false,
      sorter: true,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 120,
      fixed: 'right',
      render: (_, record) => [
        <a key="edit" onClick={() => openEditModal(record)}>
          编辑
        </a>,
        <Popconfirm
          key="delete"
          title="确定删除该主机吗？"
          onConfirm={() => handleDelete(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <a style={{ color: '#ff4d4f' }}>删除</a>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <PageContainer>
      <div style={{ display: 'flex', gap: 16 }}>
        {/* 左侧分组树 */}
        <Card
          bodyStyle={{ padding: 0, height: 'calc(100vh - 220px)', overflow: 'hidden' }}
          style={{ width: 260, flexShrink: 0 }}
        >
          <HostGroupTree selectedGroupId={selectedGroupId} onSelect={handleGroupSelect} />
        </Card>

        {/* 右侧主机列表 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <ProTable<Host>
            actionRef={actionRef}
            columns={columns}
            rowKey="id"
            scroll={{ x: 1100 }}
            search={{
              labelWidth: 'auto',
              defaultCollapsed: false,
            }}
            pagination={{
              defaultPageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
            request={async (params) => {
              const { current, pageSize, name, type, status } = params;
              try {
                const res = await getHostList({
                  page: current,
                  pageSize,
                  name,
                  type,
                  status,
                  groupId: selectedGroupId,
                });
                return {
                  data: res.rows || [],
                  total: res.total || 0,
                  success: true,
                };
              } catch {
                return { data: [], total: 0, success: false };
              }
            }}
            headerTitle={
              selectedGroupId ? (
                <span>
                  主机列表{' '}
                  <Tag
                    closable
                    onClose={() => handleGroupSelect(undefined)}
                    style={{ marginLeft: 8 }}
                  >
                    按分组筛选中
                  </Tag>
                </span>
              ) : (
                '主机列表'
              )
            }
            toolBarRender={() => [
              <Button key="reload" icon={<ReloadOutlined />} onClick={() => actionRef.current?.reload()}>
                刷新
              </Button>,
              <Button key="create" type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
                新建主机
              </Button>,
            ]}
          />
        </div>
      </div>

      {/* 新建/编辑弹窗 */}
      <Modal
        title={editingHost ? '编辑主机' : '新建主机'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        okText="确定"
        cancelText="取消"
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="主机名称"
            rules={[{ required: true, message: '请输入主机名称' }]}
          >
            <Input placeholder="请输入主机名称" maxLength={64} />
          </Form.Item>
          {!editingHost && (
            <Form.Item
              name="code"
              label="主机编码"
              rules={[{ required: true, message: '请输入主机编码' }]}
            >
              <Input placeholder="唯一编码，如 web-server-01" maxLength={64} />
            </Form.Item>
          )}
          <Form.Item
            name="type"
            label="协议类型"
            rules={[{ required: true, message: '请选择协议类型' }]}
          >
            <Select options={typeOptions} disabled={!!editingHost} />
          </Form.Item>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="address"
              label="主机地址"
              rules={[{ required: true, message: '请输入主机地址' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="IP 或域名" maxLength={128} />
            </Form.Item>
            <Form.Item
              name="port"
              label="端口"
              rules={[{ required: true, message: '请输入端口' }]}
              style={{ width: 120 }}
            >
              <InputNumber min={1} max={65535} style={{ width: '100%' }} />
            </Form.Item>
          </div>
          {editingHost && (
            <Form.Item name="status" label="状态">
              <Select
                options={[
                  { label: '启用', value: 1 },
                  { label: '禁用', value: 2 },
                ]}
              />
            </Form.Item>
          )}
          <Form.Item name="tags" label="标签">
            <Input placeholder="多个标签用逗号分隔" maxLength={512} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="备注信息" maxLength={512} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default HostPage;
