import { useState, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Col, Row, Statistic, Spin, Table, Tag, Space } from 'antd';
import {
  DesktopOutlined,
  CloudServerOutlined,
  UserOutlined,
  AuditOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { getDashboardStats, type DashboardStats } from '@/api/system';
import { getConnectLogs, type ConnectLog } from '@/api/audit';
import { getExecJobList, type ExecJob } from '@/api/exec';

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

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentLogs, setRecentLogs] = useState<ConnectLog[]>([]);
  const [recentJobs, setRecentJobs] = useState<ExecJob[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [s, logs, jobs] = await Promise.all([
          getDashboardStats(),
          getConnectLogs({ page: 1, pageSize: 5 }).catch(() => ({ rows: [], total: 0 })),
          getExecJobList({ page: 1, pageSize: 5 }).catch(() => ({ rows: [], total: 0 })),
        ]);
        setStats(s);
        setRecentLogs(logs.rows || []);
        setRecentJobs(jobs.rows || []);
      } catch {
        setStats({ hostCount: 0, userCount: 0, sessionCount: 0, todayOperations: 0 });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <PageContainer>
      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable>
              <Statistic
                title="主机总数"
                value={stats?.hostCount || 0}
                prefix={<CloudServerOutlined style={{ color: '#1890ff' }} />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable>
              <Statistic
                title="终端会话"
                value={stats?.sessionCount || 0}
                prefix={<DesktopOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable>
              <Statistic
                title="用户数"
                value={stats?.userCount || 0}
                prefix={<UserOutlined style={{ color: '#722ed1' }} />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable>
              <Statistic
                title="今日操作"
                value={stats?.todayOperations || 0}
                prefix={<AuditOutlined style={{ color: '#fa8c16' }} />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} lg={12}>
            <Card
              title={<Space><ClockCircleOutlined /><span>最近连接</span></Space>}
              size="small"
            >
              <Table
                dataSource={recentLogs}
                rowKey="id"
                size="small"
                pagination={false}
                locale={{ emptyText: '暂无数据' }}
                columns={[
                  { title: '用户', dataIndex: 'username', width: 80 },
                  { title: '主机', dataIndex: 'hostName', width: 120, ellipsis: true },
                  {
                    title: '协议',
                    dataIndex: 'type',
                    width: 60,
                    render: (t: string) => <Tag>{t}</Tag>,
                  },
                  { title: '时间', dataIndex: 'startTime', width: 150 },
                ]}
              />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card
              title={<Space><ClockCircleOutlined /><span>最近执行</span></Space>}
              size="small"
            >
              <Table
                dataSource={recentJobs}
                rowKey="id"
                size="small"
                pagination={false}
                locale={{ emptyText: '暂无数据' }}
                columns={[
                  { title: '任务', dataIndex: 'name', width: 150, ellipsis: true },
                  {
                    title: '状态',
                    dataIndex: 'status',
                    width: 80,
                    render: (s: string) => (
                      <Tag color={statusColorMap[s]}>{statusTextMap[s] || s}</Tag>
                    ),
                  },
                  { title: '用户', dataIndex: 'createUser', width: 80 },
                  { title: '时间', dataIndex: 'createTime', width: 150 },
                ]}
              />
            </Card>
          </Col>
        </Row>
      </Spin>
    </PageContainer>
  );
};

export default Dashboard;
