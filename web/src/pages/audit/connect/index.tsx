import { useRef } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Tag } from 'antd';
import { getConnectLogs, type ConnectLog } from '@/api/audit';

const typeColorMap: Record<string, string> = {
  SSH: 'green',
  RDP: 'blue',
  VNC: 'purple',
};

const ConnectLogPage = () => {
  const actionRef = useRef<ActionType>();

  const columns: ProColumns<ConnectLog>[] = [
    { title: '用户', dataIndex: 'username', width: 120 },
    { title: '主机名称', dataIndex: 'hostName', width: 160 },
    { title: '主机地址', dataIndex: 'hostAddress', width: 140, search: false },
    {
      title: '协议',
      dataIndex: 'type',
      width: 80,
      valueType: 'select',
      fieldProps: {
        options: [
          { label: 'SSH', value: 'SSH' },
          { label: 'RDP', value: 'RDP' },
          { label: 'VNC', value: 'VNC' },
        ],
      },
      render: (_, r) => <Tag color={typeColorMap[r.type] || 'default'}>{r.type}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      search: false,
      render: (_, r) => (
        <Tag color={r.status === 'connected' ? 'green' : r.status === 'disconnected' ? 'default' : 'red'}>
          {r.status === 'connected' ? '已连接' : r.status === 'disconnected' ? '已断开' : r.status}
        </Tag>
      ),
    },
    { title: '开始时间', dataIndex: 'startTime', width: 170, valueType: 'dateTime', search: false },
    { title: '结束时间', dataIndex: 'endTime', width: 170, valueType: 'dateTime', search: false },
    {
      title: '记录时间',
      dataIndex: 'createTime',
      width: 170,
      valueType: 'dateTime',
      search: false,
      sorter: true,
    },
  ];

  return (
    <PageContainer>
      <ProTable<ConnectLog>
        actionRef={actionRef}
        columns={columns}
        rowKey="id"
        search={{ labelWidth: 'auto' }}
        pagination={{ defaultPageSize: 20, showTotal: (t) => `共 ${t} 条` }}
        request={async (params) => {
          try {
            const res = await getConnectLogs({
              page: params.current,
              pageSize: params.pageSize,
              username: params.username,
              hostName: params.hostName,
              type: params.type,
            });
            return { data: res.rows || [], total: res.total || 0, success: true };
          } catch {
            return { data: [], total: 0, success: false };
          }
        }}
        headerTitle="连接日志"
      />
    </PageContainer>
  );
};

export default ConnectLogPage;
