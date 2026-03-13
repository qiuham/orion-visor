import { useEffect, useState, useCallback } from 'react';
import { Tree, Input, Button, Dropdown, Modal, Form, InputNumber, message, Spin } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  FolderOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import {
  getHostGroupList,
  createHostGroup,
  updateHostGroup,
  deleteHostGroup,
  type HostGroup,
  type HostGroupCreateParams,
} from '@/api/hostGroup';

const { Search } = Input;

interface HostGroupTreeProps {
  selectedGroupId: number | undefined;
  onSelect: (groupId: number | undefined) => void;
}

/** 将扁平分组列表转换为树形结构 */
function buildTree(groups: HostGroup[], searchText: string): DataNode[] {
  const map = new Map<number, DataNode & { children: DataNode[] }>();
  const roots: DataNode[] = [];

  // 构建节点映射
  for (const g of groups) {
    map.set(g.id, {
      key: g.id,
      title: g.name,
      icon: ({ expanded }: { expanded?: boolean }) =>
        expanded ? <FolderOpenOutlined /> : <FolderOutlined />,
      children: [],
    });
  }

  // 构建父子关系
  for (const g of groups) {
    const node = map.get(g.id)!;
    if (g.parentId && map.has(g.parentId)) {
      map.get(g.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // 搜索过滤
  if (searchText) {
    const filterTree = (nodes: DataNode[]): DataNode[] => {
      return nodes
        .map((node) => {
          const children = filterTree((node.children as DataNode[]) || []);
          const title = node.title as string;
          if (title.includes(searchText) || children.length > 0) {
            return { ...node, children };
          }
          return null;
        })
        .filter(Boolean) as DataNode[];
    };
    return filterTree(roots);
  }

  return roots;
}

const HostGroupTree: React.FC<HostGroupTreeProps> = ({ selectedGroupId, onSelect }) => {
  const [groups, setGroups] = useState<HostGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<HostGroup | null>(null);
  const [form] = Form.useForm();

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getHostGroupList();
      setGroups(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('加载分组失败', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const treeData = buildTree(groups, searchText);

  const handleSelect = (selectedKeys: React.Key[]) => {
    if (selectedKeys.length > 0) {
      const id = selectedKeys[0] as number;
      onSelect(id === selectedGroupId ? undefined : id);
    } else {
      onSelect(undefined);
    }
  };

  const openCreateModal = (parentId?: number) => {
    setEditingGroup(null);
    form.resetFields();
    form.setFieldsValue({ parentId: parentId || 0, name: '', sort: 0 });
    setModalOpen(true);
  };

  const openEditModal = (group: HostGroup) => {
    setEditingGroup(group);
    form.setFieldsValue({ name: group.name, sort: group.sort });
    setModalOpen(true);
  };

  const handleDelete = (group: HostGroup) => {
    Modal.confirm({
      title: '删除分组',
      content: `确定删除分组「${group.name}」吗？`,
      okText: '确定',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteHostGroup(group.id);
          message.success('删除成功');
          if (selectedGroupId === group.id) {
            onSelect(undefined);
          }
          fetchGroups();
        } catch {
          message.error('删除失败');
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingGroup) {
        await updateHostGroup(editingGroup.id, { name: values.name, sort: values.sort });
        message.success('更新成功');
      } else {
        const params: HostGroupCreateParams = {
          name: values.name,
          sort: values.sort || 0,
        };
        if (values.parentId) {
          params.parentId = values.parentId;
        }
        await createHostGroup(params);
        message.success('创建成功');
      }
      setModalOpen(false);
      fetchGroups();
    } catch {
      // validation error
    }
  };

  // 右键菜单 / 操作按钮
  const titleRender = (nodeData: DataNode) => {
    const group = groups.find((g) => g.id === nodeData.key);
    if (!group) return nodeData.title as string;

    const menuItems = [
      {
        key: 'addChild',
        icon: <PlusOutlined />,
        label: '新建子分组',
        onClick: () => openCreateModal(group.id),
      },
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: '编辑',
        onClick: () => openEditModal(group),
      },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: '删除',
        danger: true,
        onClick: () => handleDelete(group),
      },
    ];

    return (
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {group.name}
        </span>
        <Dropdown menu={{ items: menuItems }} trigger={['click']}>
          <MoreOutlined
            style={{ padding: '0 4px', cursor: 'pointer' }}
            onClick={(e) => e.stopPropagation()}
          />
        </Dropdown>
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 12px 8px', display: 'flex', gap: 8 }}>
        <Search
          placeholder="搜索分组"
          allowClear
          size="small"
          onChange={(e) => setSearchText(e.target.value)}
          style={{ flex: 1 }}
        />
        <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => openCreateModal()}>
          新建
        </Button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 4px' }}>
        <Spin spinning={loading}>
          {treeData.length > 0 ? (
            <Tree
              showIcon
              blockNode
              treeData={treeData}
              selectedKeys={selectedGroupId ? [selectedGroupId] : []}
              onSelect={handleSelect}
              titleRender={titleRender}
              defaultExpandAll
            />
          ) : (
            <div style={{ textAlign: 'center', color: '#999', padding: '24px 0' }}>
              {loading ? '' : '暂无分组'}
            </div>
          )}
        </Spin>
      </div>

      <Modal
        title={editingGroup ? '编辑分组' : '新建分组'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        okText="确定"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          {!editingGroup && (
            <Form.Item name="parentId" hidden>
              <Input />
            </Form.Item>
          )}
          <Form.Item
            name="name"
            label="分组名称"
            rules={[{ required: true, message: '请输入分组名称' }]}
          >
            <Input placeholder="请输入分组名称" maxLength={64} />
          </Form.Item>
          <Form.Item name="sort" label="排序">
            <InputNumber min={0} max={999} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default HostGroupTree;
