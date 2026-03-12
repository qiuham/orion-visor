import { useState, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Table, Tag, Spin } from 'antd';
import { getMenuList, type Menu } from '@/api/role';

const typeMap: Record<number, { text: string; color: string }> = {
  1: { text: '目录', color: 'blue' },
  2: { text: '菜单', color: 'green' },
  3: { text: '按钮', color: 'orange' },
};

// 构建树结构
const buildTree = (menus: Menu[]): Menu[] => {
  const map = new Map<number, Menu & { children: Menu[] }>();
  const roots: Menu[] = [];
  menus.forEach((m) => map.set(m.id, { ...m, children: [] }));
  menus.forEach((m) => {
    const node = map.get(m.id)!;
    if (m.parentId && map.has(m.parentId)) {
      map.get(m.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
};

const MenuPage = () => {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getMenuList()
      .then((data) => setMenus(buildTree(data || [])))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageContainer>
      <Card title="菜单管理">
        <Spin spinning={loading}>
          <Table
            dataSource={menus}
            rowKey="id"
            pagination={false}
            defaultExpandAllRows
            columns={[
              { title: '名称', dataIndex: 'name', width: 200 },
              { title: '权限标识', dataIndex: 'permission', width: 200 },
              {
                title: '类型',
                dataIndex: 'type',
                width: 80,
                render: (t: number) => {
                  const m = typeMap[t];
                  return m ? <Tag color={m.color}>{m.text}</Tag> : '-';
                },
              },
              { title: '路径', dataIndex: 'path', width: 200 },
              { title: '图标', dataIndex: 'icon', width: 100 },
              { title: '排序', dataIndex: 'sort', width: 80 },
            ]}
          />
        </Spin>
      </Card>
    </PageContainer>
  );
};

export default MenuPage;
