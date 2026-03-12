import { useRef, useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Modal, Form, Input, Select, Tag, message, Popconfirm } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import {
  getIdentityList,
  createIdentity,
  updateIdentity,
  deleteIdentity,
  type HostIdentity,
} from '@/api/identity';

const typeOptions = [
  { label: '密码', value: 'password' },
  { label: '密钥', value: 'key' },
];

const IdentityPage = () => {
  const actionRef = useRef<ActionType>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<HostIdentity | null>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const authType = Form.useWatch('type', form);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ type: 'password' });
    setModalOpen(true);
  };

  const openEdit = (record: HostIdentity) => {
    setEditing(record);
    form.setFieldsValue({
      name: record.name,
      type: record.type,
      username: record.username,
      remark: record.remark,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (editing) {
        await updateIdentity(editing.id, values);
        message.success('更新成功');
      } else {
        await createIdentity(values);
        message.success('创建成功');
      }
      setModalOpen(false);
      actionRef.current?.reload();
    } catch {
      // validation
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    await deleteIdentity(id);
    message.success('删除成功');
    actionRef.current?.reload();
  };

  const columns: ProColumns<HostIdentity>[] = [
    { title: '凭据名称', dataIndex: 'name', width: 180 },
    {
      title: '类型',
      dataIndex: 'type',
      width: 100,
      valueType: 'select',
      fieldProps: { options: typeOptions },
      render: (_, r) => (
        <Tag color={r.type === 'password' ? 'blue' : 'green'}>
          {r.type === 'password' ? '密码' : '密钥'}
        </Tag>
      ),
    },
    { title: '用户名', dataIndex: 'username', width: 140, search: false },
    { title: '备注', dataIndex: 'remark', ellipsis: true, search: false },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      width: 170,
      valueType: 'dateTime',
      search: false,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 120,
      render: (_, record) => [
        <a key="edit" onClick={() => openEdit(record)}>编辑</a>,
        <Popconfirm key="del" title="确定删除？" onConfirm={() => handleDelete(record.id)}>
          <a style={{ color: '#ff4d4f' }}>删除</a>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <PageContainer>
      <ProTable<HostIdentity>
        actionRef={actionRef}
        columns={columns}
        rowKey="id"
        search={{ labelWidth: 'auto' }}
        pagination={{ defaultPageSize: 20, showTotal: (t) => `共 ${t} 条` }}
        request={async (params) => {
          try {
            const res = await getIdentityList({
              page: params.current,
              pageSize: params.pageSize,
              name: params.name,
              type: params.type,
            });
            return { data: res.rows || [], total: res.total || 0, success: true };
          } catch {
            return { data: [], total: 0, success: false };
          }
        }}
        headerTitle="主机凭据"
        toolBarRender={() => [
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新建凭据
          </Button>,
        ]}
      />

      <Modal
        title={editing ? '编辑凭据' : '新建凭据'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        destroyOnClose
        width={520}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="凭据名称" rules={[{ required: true, message: '请输入凭据名称' }]}>
            <Input placeholder="如：root-password" maxLength={64} />
          </Form.Item>
          <Form.Item name="type" label="认证类型" rules={[{ required: true }]}>
            <Select options={typeOptions} disabled={!!editing} />
          </Form.Item>
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input placeholder="SSH 用户名" maxLength={64} />
          </Form.Item>
          {authType === 'password' && (
            <Form.Item
              name="password"
              label="密码"
              rules={editing ? [] : [{ required: true, message: '请输入密码' }]}
            >
              <Input.Password placeholder={editing ? '留空则不修改' : '请输入密码'} />
            </Form.Item>
          )}
          {authType === 'key' && (
            <>
              <Form.Item
                name="keyText"
                label="私钥内容"
                rules={editing ? [] : [{ required: true, message: '请输入私钥' }]}
              >
                <Input.TextArea rows={4} placeholder="粘贴 PEM 格式私钥" />
              </Form.Item>
              <Form.Item name="passphrase" label="私钥密码">
                <Input.Password placeholder="如有密码保护则填写" />
              </Form.Item>
            </>
          )}
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} placeholder="备注信息" maxLength={256} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default IdentityPage;
