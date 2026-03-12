import { useState, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Transfer, Button, Select, message, Space, Empty } from 'antd';
import { getHostList, type Host } from '@/api/host';
import { getUserList, type User } from '@/api/user';
import { getRoleList, type Role } from '@/api/role';
import { getGrantedHosts, updateGrant } from '@/api/grant';

type GrantType = 'user' | 'role';

const AssetGrantPage = () => {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [grantType, setGrantType] = useState<GrantType>('user');
  const [selectedTarget, setSelectedTarget] = useState<number>();
  const [targetKeys, setTargetKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      getHostList({ pageSize: 1000 }).catch(() => ({ rows: [], total: 0 })),
      getUserList({ pageSize: 1000 }).catch(() => ({ rows: [], total: 0 })),
      getRoleList().catch(() => []),
    ]).then(([hostRes, userRes, roleRes]) => {
      setHosts(hostRes.rows || []);
      setUsers(userRes.rows || []);
      setRoles(Array.isArray(roleRes) ? roleRes : []);
    });
  }, []);

  const handleTargetChange = async (id: number) => {
    setSelectedTarget(id);
    try {
      const hostIds = await getGrantedHosts(grantType, id);
      setTargetKeys((hostIds || []).map(String));
    } catch {
      setTargetKeys([]);
    }
  };

  const handleSave = async () => {
    if (!selectedTarget) {
      message.warning('请先选择授权对象');
      return;
    }
    setLoading(true);
    try {
      await updateGrant({
        grantType,
        grantId: selectedTarget,
        hostIds: targetKeys.map(Number),
      });
      message.success('授权保存成功');
    } catch {
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  const targetOptions =
    grantType === 'user'
      ? users.map((u) => ({ label: `${u.nickname || u.username} (${u.username})`, value: u.id }))
      : roles.map((r) => ({ label: r.name, value: r.id }));

  const transferData = hosts.map((h) => ({
    key: String(h.id),
    title: h.name,
    description: `${h.address}:${h.port}`,
  }));

  return (
    <PageContainer>
      <Card title="资产授权" style={{ marginBottom: 16 }}>
        <Space style={{ marginBottom: 16 }}>
          <Select
            value={grantType}
            onChange={(v) => {
              setGrantType(v);
              setSelectedTarget(undefined);
              setTargetKeys([]);
            }}
            style={{ width: 120 }}
            options={[
              { label: '按用户', value: 'user' },
              { label: '按角色', value: 'role' },
            ]}
          />
          <Select
            placeholder={grantType === 'user' ? '选择用户' : '选择角色'}
            value={selectedTarget}
            onChange={handleTargetChange}
            style={{ width: 280 }}
            showSearch
            optionFilterProp="label"
            options={targetOptions}
          />
          <Button type="primary" onClick={handleSave} loading={loading} disabled={!selectedTarget}>
            保存授权
          </Button>
        </Space>

        {selectedTarget ? (
          <Transfer
            dataSource={transferData}
            titles={['可用主机', '已授权主机']}
            targetKeys={targetKeys}
            onChange={(keys) => setTargetKeys(keys as string[])}
            render={(item) => `${item.title} (${item.description})`}
            showSearch
            listStyle={{ width: 360, height: 400 }}
          />
        ) : (
          <Empty description="请选择授权对象" />
        )}
      </Card>
    </PageContainer>
  );
};

export default AssetGrantPage;
