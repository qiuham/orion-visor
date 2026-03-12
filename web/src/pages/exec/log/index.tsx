import { useRef, useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Tag, Modal, Collapse, Space, Typography, Divider } from 'antd';
import { getExecJobList, getExecJobHosts, type ExecJob, type ExecJobHost } from '@/api/exec';

const { Text } = Typography;

const statusColorMap: Record<string, string> = {
  pending: 'default',
  running: 'processing',
  completed: 'success',
  failed: 'error',
  cancelled: 'warning',
};

const statusTextMap: Record<string, string> = {
  pending: '等待中',
  running: '执行中',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消',
};

const ExecLogPage = () => {
  const actionRef = useRef<ActionType>();
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailJob, setDetailJob] = useState<ExecJob | null>(null);
  const [detailHosts, setDetailHosts] = useState<ExecJobHost[]>([]);

  const viewDetail = async (record: ExecJob) => {
    setDetailJob(record);
    setDetailOpen(true);
    try {
      const hosts = await getExecJobHosts(record.id);
      setDetailHosts(hosts || []);
    } catch {
      setDetailHosts([]);
    }
  };

  const columns: ProColumns<ExecJob>[] = [
    { title: '任务名称', dataIndex: 'name', width: 200, ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      valueType: 'select',
      fieldProps: {
        options: Object.entries(statusTextMap).map(([k, v]) => ({ label: v, value: k })),
      },
      render: (_, r) => (
        <Tag color={statusColorMap[r.status]}>{statusTextMap[r.status] || r.status}</Tag>
      ),
    },
    { title: '执行用户', dataIndex: 'createUser', width: 120, search: false },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      width: 170,
      valueType: 'dateTime',
      search: false,
      sorter: true,
    },
    {
      title: '完成时间',
      dataIndex: 'finishTime',
      width: 170,
      valueType: 'dateTime',
      search: false,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 80,
      render: (_, record) => [
        <a key="detail" onClick={() => viewDetail(record)}>详情</a>,
      ],
    },
  ];

  return (
    <PageContainer>
      <ProTable<ExecJob>
        actionRef={actionRef}
        columns={columns}
        rowKey="id"
        search={{ labelWidth: 'auto' }}
        pagination={{ defaultPageSize: 20, showTotal: (t) => `共 ${t} 条` }}
        request={async (params) => {
          try {
            const res = await getExecJobList({
              page: params.current,
              pageSize: params.pageSize,
              status: params.status,
            });
            return { data: res.rows || [], total: res.total || 0, success: true };
          } catch {
            return { data: [], total: 0, success: false };
          }
        }}
        headerTitle="执行日志"
      />

      <Modal
        title={`执行详情 - ${detailJob?.name || ''}`}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={800}
      >
        {detailJob && (
          <div style={{ marginBottom: 16 }}>
            <Space>
              <Tag color={statusColorMap[detailJob.status]}>
                {statusTextMap[detailJob.status]}
              </Tag>
              <Text type="secondary">命令: </Text>
              <Text code>{detailJob.command}</Text>
            </Space>
          </div>
        )}
        <Collapse
          defaultActiveKey={detailHosts.map((h) => String(h.id))}
          items={detailHosts.map((jh) => ({
            key: String(jh.id),
            label: (
              <Space>
                <Text strong>{jh.hostName}</Text>
                <Text type="secondary">{jh.hostAddress}</Text>
                <Tag color={statusColorMap[jh.status]}>
                  {statusTextMap[jh.status] || jh.status}
                </Tag>
                {jh.exitCode !== undefined && jh.exitCode !== null && (
                  <Tag color={jh.exitCode === 0 ? 'green' : 'red'}>Exit: {jh.exitCode}</Tag>
                )}
              </Space>
            ),
            children: (
              <div>
                {jh.output && (
                  <pre style={{ background: '#1e1e1e', color: '#d4d4d4', padding: 12, borderRadius: 4, maxHeight: 300, overflow: 'auto', fontSize: 13, fontFamily: 'monospace' }}>
                    {jh.output}
                  </pre>
                )}
                {jh.errorOutput && (
                  <>
                    <Divider plain>错误输出</Divider>
                    <pre style={{ background: '#2d1515', color: '#ff6b6b', padding: 12, borderRadius: 4, maxHeight: 200, overflow: 'auto', fontSize: 13, fontFamily: 'monospace' }}>
                      {jh.errorOutput}
                    </pre>
                  </>
                )}
                {!jh.output && !jh.errorOutput && <Text type="secondary">无输出</Text>}
              </div>
            ),
          }))}
        />
      </Modal>
    </PageContainer>
  );
};

export default ExecLogPage;
