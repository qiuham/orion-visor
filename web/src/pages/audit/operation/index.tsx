import { useRef } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Tag } from 'antd';
import { getOperationLogs, type OperationLog } from '@/api/audit';

const severityMap: Record<number, { text: string; color: string }> = {
  1: { text: '低', color: 'blue' },
  2: { text: '中', color: 'orange' },
  3: { text: '高', color: 'red' },
};

const OperationLogPage = () => {
  const actionRef = useRef<ActionType>();

  const columns: ProColumns<OperationLog>[] = [
    { title: '操作用户', dataIndex: 'username', width: 120 },
    { title: '模块', dataIndex: 'module', width: 100 },
    { title: '操作类型', dataIndex: 'type', width: 120 },
    {
      title: '风险等级',
      dataIndex: 'severity',
      width: 90,
      search: false,
      render: (_, r) => {
        const s = severityMap[r.severity];
        return s ? <Tag color={s.color}>{s.text}</Tag> : '-';
      },
    },
    { title: '描述', dataIndex: 'description', ellipsis: true, search: false },
    { title: '请求方法', dataIndex: 'requestMethod', width: 90, search: false },
    { title: '请求路径', dataIndex: 'requestUrl', width: 200, ellipsis: true, search: false },
    {
      title: '耗时(ms)',
      dataIndex: 'duration',
      width: 90,
      search: false,
    },
    {
      title: '结果',
      dataIndex: 'result',
      width: 80,
      search: false,
      render: (_, r) => (
        <Tag color={r.result === 'success' ? 'green' : 'red'}>
          {r.result === 'success' ? '成功' : '失败'}
        </Tag>
      ),
    },
    {
      title: '操作时间',
      dataIndex: 'createTime',
      width: 170,
      valueType: 'dateTime',
      search: false,
      sorter: true,
    },
  ];

  return (
    <PageContainer>
      <ProTable<OperationLog>
        actionRef={actionRef}
        columns={columns}
        rowKey="id"
        search={{ labelWidth: 'auto' }}
        pagination={{ defaultPageSize: 20, showTotal: (t) => `共 ${t} 条` }}
        request={async (params) => {
          try {
            const res = await getOperationLogs({
              page: params.current,
              pageSize: params.pageSize,
              username: params.username,
              module: params.module,
              type: params.type,
            });
            return { data: res.rows || [], total: res.total || 0, success: true };
          } catch {
            return { data: [], total: 0, success: false };
          }
        }}
        headerTitle="操作日志"
      />
    </PageContainer>
  );
};

export default OperationLogPage;
