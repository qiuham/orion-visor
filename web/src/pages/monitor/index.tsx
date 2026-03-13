import { useState, useEffect, useRef } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Select, Button, Space, Tag, Row, Col, Progress, Statistic, Empty } from 'antd';
import { DashboardOutlined, DisconnectOutlined, LinkOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { getHostList, type Host } from '@/api/host';
import { useAuthStore } from '@/store/auth';

interface Metrics {
  cpu: number;
  memoryUsed: number;
  memoryTotal: number;
  diskUsed: number;
  diskTotal: number;
  loadAvg1: number;
  loadAvg5: number;
  loadAvg15: number;
  uptime: string;
  timestamp: number;
}

const MAX_HISTORY = 60; // 保留最近 60 个数据点

const MonitorPage = () => {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [selectedHostId, setSelectedHostId] = useState<number>();
  const [connected, setConnected] = useState(false);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [cpuHistory, setCpuHistory] = useState<number[]>([]);
  const [memHistory, setMemHistory] = useState<number[]>([]);
  const [timeLabels, setTimeLabels] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    getHostList({ pageSize: 1000, status: 1 })
      .then((res) => setHosts(res.rows || []))
      .catch((e) => console.warn('加载主机列表失败', e));
    return () => wsRef.current?.close();
  }, []);

  const handleConnect = () => {
    if (!selectedHostId) return;
    wsRef.current?.close();
    setCpuHistory([]);
    setMemHistory([]);
    setTimeLabels([]);
    setMetrics(null);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(
      `${protocol}//${window.location.host}/ws/monitor/${selectedHostId}?token=${token}`
    );
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);

    ws.onmessage = (event) => {
      try {
        const data: Metrics = JSON.parse(event.data);
        setMetrics(data);
        const now = new Date().toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

        setCpuHistory((prev) => [...prev.slice(-(MAX_HISTORY - 1)), data.cpu]);
        setMemHistory((prev) => {
          const pct = data.memoryTotal > 0 ? (data.memoryUsed / data.memoryTotal) * 100 : 0;
          return [...prev.slice(-(MAX_HISTORY - 1)), Math.round(pct * 10) / 10];
        });
        setTimeLabels((prev) => [...prev.slice(-(MAX_HISTORY - 1)), now]);
      } catch (e) {
        console.warn('解析监控数据失败', e);
      }
    };

    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
  };

  const handleDisconnect = () => {
    wsRef.current?.close();
    setConnected(false);
  };

  const memPct = metrics && metrics.memoryTotal > 0
    ? Math.round((metrics.memoryUsed / metrics.memoryTotal) * 1000) / 10
    : 0;

  const diskPct = metrics && metrics.diskTotal > 0
    ? Math.round((metrics.diskUsed / metrics.diskTotal) * 1000) / 10
    : 0;

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const chartOption = {
    tooltip: { trigger: 'axis' as const },
    legend: { data: ['CPU %', '内存 %'] },
    grid: { left: 40, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category' as const, data: timeLabels },
    yAxis: { type: 'value' as const, max: 100, min: 0 },
    series: [
      {
        name: 'CPU %',
        type: 'line',
        smooth: true,
        data: cpuHistory,
        itemStyle: { color: '#1890ff' },
        areaStyle: { color: 'rgba(24,144,255,0.1)' },
      },
      {
        name: '内存 %',
        type: 'line',
        smooth: true,
        data: memHistory,
        itemStyle: { color: '#52c41a' },
        areaStyle: { color: 'rgba(82,196,26,0.1)' },
      },
    ],
  };

  return (
    <PageContainer>
      <Card size="small" style={{ marginBottom: 16 }} bodyStyle={{ padding: '8px 16px' }}>
        <Space>
          <Select
            style={{ width: 300 }}
            placeholder="选择监控主机"
            showSearch
            optionFilterProp="label"
            value={selectedHostId}
            onChange={setSelectedHostId}
            disabled={connected}
            options={hosts.map((h) => ({
              label: `${h.name} (${h.address}:${h.port})`,
              value: h.id,
            }))}
          />
          {!connected ? (
            <Button type="primary" icon={<LinkOutlined />} onClick={handleConnect} disabled={!selectedHostId}>
              开始监控
            </Button>
          ) : (
            <Button danger icon={<DisconnectOutlined />} onClick={handleDisconnect}>
              停止
            </Button>
          )}
          {connected && <Tag color="green">监控中</Tag>}
        </Space>
      </Card>

      {metrics ? (
        <>
          {/* 仪表盘 */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Card size="small" title="CPU 使用率">
                <div style={{ textAlign: 'center' }}>
                  <Progress
                    type="dashboard"
                    percent={Math.round(metrics.cpu * 10) / 10}
                    strokeColor={metrics.cpu > 80 ? '#ff4d4f' : metrics.cpu > 60 ? '#faad14' : '#52c41a'}
                    format={(pct) => `${pct}%`}
                  />
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card size="small" title="内存使用">
                <div style={{ textAlign: 'center' }}>
                  <Progress
                    type="dashboard"
                    percent={memPct}
                    strokeColor={memPct > 80 ? '#ff4d4f' : memPct > 60 ? '#faad14' : '#1890ff'}
                    format={(pct) => `${pct}%`}
                  />
                  <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                    {formatBytes(metrics.memoryUsed)} / {formatBytes(metrics.memoryTotal)}
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card size="small" title="磁盘使用">
                <div style={{ textAlign: 'center' }}>
                  <Progress
                    type="dashboard"
                    percent={diskPct}
                    strokeColor={diskPct > 90 ? '#ff4d4f' : diskPct > 70 ? '#faad14' : '#722ed1'}
                    format={(pct) => `${pct}%`}
                  />
                  <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                    {formatBytes(metrics.diskUsed)} / {formatBytes(metrics.diskTotal)}
                  </div>
                </div>
              </Card>
            </Col>
          </Row>

          {/* 负载 + 运行时间 */}
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={8}>
              <Card size="small">
                <Statistic title="Load 1min" value={metrics.loadAvg1} precision={2} />
              </Card>
            </Col>
            <Col xs={8}>
              <Card size="small">
                <Statistic title="Load 5min" value={metrics.loadAvg5} precision={2} />
              </Card>
            </Col>
            <Col xs={8}>
              <Card size="small">
                <Statistic title="Load 15min" value={metrics.loadAvg15} precision={2} />
              </Card>
            </Col>
          </Row>

          {/* 实时趋势图 */}
          <Card title="实时趋势" style={{ marginTop: 16 }} size="small">
            <ReactECharts option={chartOption} style={{ height: 300 }} />
          </Card>
        </>
      ) : (
        <Card>
          <Empty
            image={<DashboardOutlined style={{ fontSize: 64, color: '#ccc' }} />}
            description={connected ? '等待数据...' : '请选择主机并开始监控'}
          />
        </Card>
      )}
    </PageContainer>
  );
};

export default MonitorPage;
