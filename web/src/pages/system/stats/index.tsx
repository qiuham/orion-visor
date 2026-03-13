import { useState, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Col, Row, Spin, Statistic, Select } from 'antd';
import {
  CloudServerOutlined,
  UserOutlined,
  DesktopOutlined,
  CodeOutlined,
  ClockCircleOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { getDashboardStats, getStatsTrend, type DashboardStats, type StatsTrend } from '@/api/system';

const StatsPage = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trend, setTrend] = useState<StatsTrend | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(14);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, t] = await Promise.all([getDashboardStats(), getStatsTrend(days)]);
      setStats(s);
      setTrend(t);
    } catch (e) {
      console.warn('加载统计数据失败', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [days]);

  // 趋势折线图
  const trendOption = {
    tooltip: { trigger: 'axis' as const },
    legend: { data: ['连接数', '操作数', '执行任务'] },
    grid: { left: 40, right: 20, top: 40, bottom: 30 },
    xAxis: {
      type: 'category' as const,
      data: (trend?.connectionTrend || []).map((d) => d.date?.substring(5) || ''),
    },
    yAxis: { type: 'value' as const },
    series: [
      {
        name: '连接数',
        type: 'line',
        smooth: true,
        data: (trend?.connectionTrend || []).map((d) => d.count),
        itemStyle: { color: '#1890ff' },
      },
      {
        name: '操作数',
        type: 'line',
        smooth: true,
        data: (trend?.operationTrend || []).map((d) => d.count),
        itemStyle: { color: '#52c41a' },
      },
      {
        name: '执行任务',
        type: 'line',
        smooth: true,
        data: (trend?.execTrend || []).map((d) => d.count),
        itemStyle: { color: '#fa8c16' },
      },
    ],
  };

  // 操作模块饼图
  const moduleOption = {
    tooltip: { trigger: 'item' as const },
    legend: { bottom: 0 },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        label: { show: true, formatter: '{b}: {c}' },
        data: (trend?.operationByModule || []).map((d) => ({
          name: d.module,
          value: d.count,
        })),
      },
    ],
  };

  // 主机类型饼图
  const hostTypeOption = {
    tooltip: { trigger: 'item' as const },
    legend: { bottom: 0 },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        label: { show: true, formatter: '{b}: {c}' },
        data: (trend?.hostByType || []).map((d) => ({
          name: d.module,
          value: d.count,
        })),
      },
    ],
  };

  // 连接协议柱状图
  const connTypeOption = {
    tooltip: { trigger: 'axis' as const },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category' as const,
      data: (trend?.connectionByType || []).map((d) => d.module),
    },
    yAxis: { type: 'value' as const },
    series: [
      {
        type: 'bar',
        data: (trend?.connectionByType || []).map((d) => d.count),
        itemStyle: {
          color: (params: any) => {
            const colors = ['#1890ff', '#52c41a', '#722ed1', '#fa8c16'];
            return colors[params.dataIndex % colors.length];
          },
        },
      },
    ],
  };

  return (
    <PageContainer>
      <Spin spinning={loading}>
        {/* 概览卡片 */}
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={8} lg={4}>
            <Card size="small" hoverable>
              <Statistic title="主机" value={stats?.hostCount || 0} prefix={<CloudServerOutlined />} valueStyle={{ color: '#1890ff' }} />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card size="small" hoverable>
              <Statistic title="用户" value={stats?.userCount || 0} prefix={<UserOutlined />} valueStyle={{ color: '#722ed1' }} />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card size="small" hoverable>
              <Statistic title="终端会话" value={stats?.sessionCount || 0} prefix={<DesktopOutlined />} valueStyle={{ color: '#52c41a' }} />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card size="small" hoverable>
              <Statistic title="今日操作" value={stats?.todayOperations || 0} prefix={<AuditOutlined />} valueStyle={{ color: '#fa8c16' }} />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card size="small" hoverable>
              <Statistic title="执行任务" value={stats?.execJobCount || 0} prefix={<CodeOutlined />} valueStyle={{ color: '#13c2c2' }} />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card size="small" hoverable>
              <Statistic title="定时任务" value={stats?.cronJobCount || 0} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#eb2f96' }} />
            </Card>
          </Col>
        </Row>

        {/* 趋势图 */}
        <Card
          title="活动趋势"
          style={{ marginTop: 16 }}
          extra={
            <Select
              value={days}
              onChange={setDays}
              style={{ width: 120 }}
              options={[
                { label: '7 天', value: 7 },
                { label: '14 天', value: 14 },
                { label: '30 天', value: 30 },
              ]}
            />
          }
        >
          <ReactECharts option={trendOption} style={{ height: 320 }} />
        </Card>

        {/* 分布图 */}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} lg={8}>
            <Card title="操作模块分布" size="small">
              <ReactECharts option={moduleOption} style={{ height: 280 }} />
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="主机类型分布" size="small">
              <ReactECharts option={hostTypeOption} style={{ height: 280 }} />
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="连接协议统计" size="small">
              <ReactECharts option={connTypeOption} style={{ height: 280 }} />
            </Card>
          </Col>
        </Row>
      </Spin>
    </PageContainer>
  );
};

export default StatsPage;
