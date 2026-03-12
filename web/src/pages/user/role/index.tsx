import { useRef, useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Modal, Form, Input, InputNumber, Select, Tag, message, Popconfirm, Tree, Drawer } from 'antd';
import { PlusOutlined, SettingOutlined } from '@ant-design/icons';
import {
  getRoleList,
  createRole,
  updateRole,
  deleteRole,
  getRoleMenus,
  updateRoleMenus,
  getMenuList,
  type Role,
  type Menu,
} from '@/api/role';

const statusOptions = [
  { label: '启用', value: 1 },
  { label: '禁用', value: 2 },
];

// 将菜单列表转为树结构
const buildMenuTree = (menus: Menu[]): any[] => {
  const map = new Map<number, any>();
  const roots: any[] = [];
  menus.forEach((m) => {
    map.set(m.id, { title: m.name, key: m.id, children: [] });
  });
  menus.forEach((m) => {
    const node = map.get(m.id);
    if (m.parentId && map.has(m.parentId)) {
      map.get(m.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
};

const RolePage = () => {
  const actionRef = useRef<ActionType>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // 权限配置
  const [permDrawerOpen, setPermDrawerOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [menuTree, setMenuTree] = useState<any[]>([]);
  const [checkedKeys, setCheckedKeys] = useState<number[]>([]);
  const [savingPerm, setSavingPerm] = useState(false);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: 1, sort: 0 });
    setModalOpen(true);
  };

  const openEdit = (record: Role) => {
    setEditing(record);
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      sort: record.sort,
      status: record.status,
      remark: record.remark,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (editing) {
        await updateRole(editing.id, values);
        message.success('更新成功');
      } else {
        await createRole(values);
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
    await deleteRole(id);
    message.success('删除成功');
    actionRef.current?.reload();
  };

  // 打开权限配置
  const openPermDrawer = async (role: Role) => {
    setCurrentRole(role);
    setPermDrawerOpen(true);
    try {
      const [menus, roleMenus] = await Promise.all([getMenuList(), getRoleMenus(role.id)]);
      setMenuTree(buildMenuTree(menus));
      setCheckedKeys(roleMenus || []);
    } catch {
      message.error('加载菜单失败');
    }
  };

  const handleSavePerm = async () => {
    if (!currentRole) return;
    setSavingPerm(true);
    try {
      await updateRoleMenus(currentRole.id, checkedKeys);
      message.success('权限保存成功');
      setPermDrawerOpen(false);
    } catch {
      message.error('保存失败');
    } finally {
      setSavingPerm(false);
    }
  };

  const columns: ProColumns<Role>[] = [
    { title: '角色名称', dataIndex: 'name', width: 160 },
    { title: '角色编码', dataIndex: 'code', width: 140 },
    { title: '排序', dataIndex: 'sort', width: 80, search: false },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (_, r) => (
        <Tag color={r.status === 1 ? 'green' : 'red'}>
          {r.status === 1 ? '启用' : '禁用'}
        </Tag>
      ),
    },
    { title: '备注', dataIndex: 'remark', ellipsis: true, search: false },
    {
      title: '操作',
      valueType: 'option',
      width: 200,
      render: (_, record) => [
        <a key="edit" onClick={() => openEdit(record)}>编辑</a>,
        <a key="perm" onClick={() => openPermDrawer(record)}>
          <SettingOutlined /> 权限
        </a>,
        <Popconfirm key="del" title="确定删除？" onConfirm={() => handleDelete(record.id)}>
          <a style={{ color: '#ff4d4f' }}>删除</a>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <PageContainer>
      <ProTable<Role>
        actionRef={actionRef}
        columns={columns}
        rowKey="id"
        search={false}
        pagination={false}
        request={async () => {
          try {
            const data = await getRoleList();
            return { data: data || [], success: true };
          } catch {
            return { data: [], success: false };
          }
        }}
        headerTitle="角色管理"
        toolBarRender={() => [
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新建角色
          </Button>,
        ]}
      />

      {/* 新建/编辑角色 */}
      <Modal
        title={editing ? '编辑角色' : '新建角色'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        destroyOnClose
        width={480}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="角色名称" rules={[{ required: true }]}>
            <Input placeholder="如：运维管理员" maxLength={32} />
          </Form.Item>
          <Form.Item name="code" label="角色编码" rules={[{ required: true }]}>
            <Input placeholder="如：ops_admin" maxLength={32} disabled={!!editing} />
          </Form.Item>
          <Form.Item name="sort" label="排序">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select options={statusOptions} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} maxLength={256} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 权限配置抽屉 */}
      <Drawer
        title={`配置权限 - ${currentRole?.name || ''}`}
        open={permDrawerOpen}
        onClose={() => setPermDrawerOpen(false)}
        width={400}
        extra={
          <Button type="primary" onClick={handleSavePerm} loading={savingPerm}>
            保存
          </Button>
        }
      >
        <Tree
          checkable
          defaultExpandAll
          treeData={menuTree}
          checkedKeys={checkedKeys}
          onCheck={(keys) => setCheckedKeys(keys as number[])}
        />
      </Drawer>
    </PageContainer>
  );
};

export default RolePage;
