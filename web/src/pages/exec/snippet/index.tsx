import { useState, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Table, Button, Modal, Form, Input, message, Popconfirm, Space, Tag, Tooltip } from 'antd';
import { PlusOutlined, CopyOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { getSnippetList, createSnippet, updateSnippet, deleteSnippet, type CommandSnippet } from '@/api/snippet';

const SnippetPage = () => {
  const [snippets, setSnippets] = useState<CommandSnippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getSnippetList();
      setSnippets(data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = () => {
    setEditingId(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (record: CommandSnippet) => {
    setEditingId(record.id);
    form.setFieldsValue({ name: record.name, command: record.command });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (editingId) {
        await updateSnippet(editingId, values);
        message.success('更新成功');
      } else {
        await createSnippet(values);
        message.success('创建成功');
      }
      setModalOpen(false);
      loadData();
    } catch {
      // validation error
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    await deleteSnippet(id);
    message.success('删除成功');
    loadData();
  };

  const handleCopy = (command: string) => {
    navigator.clipboard.writeText(command).then(
      () => message.success('已复制到剪贴板'),
      () => message.error('复制失败'),
    );
  };

  return (
    <PageContainer>
      <Card
        title="命令片段"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新建片段
          </Button>
        }
      >
        <Table
          dataSource={snippets}
          rowKey="id"
          loading={loading}
          pagination={false}
          columns={[
            {
              title: '名称',
              dataIndex: 'name',
              width: 200,
              render: (name: string) => <Tag color="blue">{name}</Tag>,
            },
            {
              title: '命令',
              dataIndex: 'command',
              ellipsis: true,
              render: (cmd: string) => (
                <code style={{ fontSize: 12, background: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }}>
                  {cmd}
                </code>
              ),
            },
            {
              title: '创建时间',
              dataIndex: 'createTime',
              width: 170,
            },
            {
              title: '操作',
              width: 130,
              render: (_: any, record: CommandSnippet) => (
                <Space size={4}>
                  <Tooltip title="复制命令">
                    <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => handleCopy(record.command)} />
                  </Tooltip>
                  <Tooltip title="编辑">
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                  </Tooltip>
                  <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
                    <Tooltip title="删除">
                      <Button type="link" size="small" danger icon={<DeleteOutlined />} />
                    </Tooltip>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={editingId ? '编辑片段' : '新建片段'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        destroyOnClose
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="如：查看磁盘使用率" maxLength={64} />
          </Form.Item>
          <Form.Item name="command" label="命令" rules={[{ required: true, message: '请输入命令' }]}>
            <Input.TextArea
              placeholder="如：df -h"
              rows={6}
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default SnippetPage;
