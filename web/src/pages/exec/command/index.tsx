import { useState, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import {
  Card,
  Form,
  Input,
  Button,
  Select,
  InputNumber,
  message,
  Collapse,
  Tag,
  Space,
  Spin,
  Typography,
  Divider,
} from 'antd';
import { PlayCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { getHostList, type Host } from '@/api/host';
import { createExecJob, getExecJob, getExecJobHosts, type ExecJob, type ExecJobHost } from '@/api/exec';

const { TextArea } = Input;
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

const ExecCommandPage = () => {
  const [form] = Form.useForm();
  const [hosts, setHosts] = useState<Host[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [currentJob, setCurrentJob] = useState<ExecJob | null>(null);
  const [jobHosts, setJobHosts] = useState<ExecJobHost[]>([]);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    getHostList({ pageSize: 1000, status: 1 })
      .then((res) => setHosts(res.rows || []))
      .catch(() => {});
  }, []);

  // 轮询任务状态
  useEffect(() => {
    if (!currentJob || !polling) return;
    if (currentJob.status === 'completed' || currentJob.status === 'failed' || currentJob.status === 'cancelled') {
      setPolling(false);
      return;
    }
    const timer = setInterval(async () => {
      try {
        const [job, hosts] = await Promise.all([
          getExecJob(currentJob.id),
          getExecJobHosts(currentJob.id),
        ]);
        setCurrentJob(job);
        setJobHosts(hosts || []);
        if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
          setPolling(false);
        }
      } catch {
        // ignore
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [currentJob, polling]);

  const handleExecute = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const job = await createExecJob({
        name: values.name || `命令执行-${new Date().toLocaleString()}`,
        command: values.command,
        timeout: values.timeout || 60,
        hostIds: values.hostIds,
      });
      setCurrentJob(job as any);
      setPolling(true);
      message.success('命令已提交执行');
      // 立即获取主机结果
      const hosts = await getExecJobHosts((job as any).id);
      setJobHosts(hosts || []);
    } catch {
      // validation
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer>
      <Card title="命令执行" style={{ marginBottom: 16 }}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="任务名称">
            <Input placeholder="可选，自动生成" maxLength={64} />
          </Form.Item>
          <Form.Item
            name="hostIds"
            label="目标主机"
            rules={[{ required: true, message: '请选择至少一台主机' }]}
          >
            <Select
              mode="multiple"
              placeholder="选择执行主机"
              showSearch
              optionFilterProp="label"
              options={hosts.map((h) => ({
                label: `${h.name} (${h.address})`,
                value: h.id,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="command"
            label="执行命令"
            rules={[{ required: true, message: '请输入命令' }]}
          >
            <TextArea
              rows={6}
              placeholder="输入要执行的 Shell 命令..."
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>
          <Form.Item name="timeout" label="超时时间（秒）" initialValue={60}>
            <InputNumber min={5} max={3600} style={{ width: 200 }} />
          </Form.Item>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleExecute}
            loading={submitting}
            size="large"
          >
            执行
          </Button>
        </Form>
      </Card>

      {/* 执行结果 */}
      {currentJob && (
        <Card
          title={
            <Space>
              <span>执行结果</span>
              <Tag color={statusColorMap[currentJob.status]}>
                {statusTextMap[currentJob.status] || currentJob.status}
              </Tag>
              {polling && <Spin indicator={<LoadingOutlined />} size="small" />}
            </Space>
          }
        >
          {jobHosts.length === 0 ? (
            <Spin tip="等待结果..." />
          ) : (
            <Collapse
              defaultActiveKey={jobHosts.map((h) => String(h.id))}
              items={jobHosts.map((jh) => ({
                key: String(jh.id),
                label: (
                  <Space>
                    <Text strong>{jh.hostName}</Text>
                    <Text type="secondary">{jh.hostAddress}</Text>
                    <Tag color={statusColorMap[jh.status]}>
                      {statusTextMap[jh.status] || jh.status}
                    </Tag>
                    {jh.exitCode !== undefined && jh.exitCode !== null && (
                      <Tag color={jh.exitCode === 0 ? 'green' : 'red'}>
                        Exit: {jh.exitCode}
                      </Tag>
                    )}
                  </Space>
                ),
                children: (
                  <div>
                    {jh.output && (
                      <pre
                        style={{
                          background: '#1e1e1e',
                          color: '#d4d4d4',
                          padding: 12,
                          borderRadius: 4,
                          maxHeight: 400,
                          overflow: 'auto',
                          fontSize: 13,
                          fontFamily: 'monospace',
                        }}
                      >
                        {jh.output}
                      </pre>
                    )}
                    {jh.errorOutput && (
                      <>
                        <Divider plain>错误输出</Divider>
                        <pre
                          style={{
                            background: '#2d1515',
                            color: '#ff6b6b',
                            padding: 12,
                            borderRadius: 4,
                            maxHeight: 200,
                            overflow: 'auto',
                            fontSize: 13,
                            fontFamily: 'monospace',
                          }}
                        >
                          {jh.errorOutput}
                        </pre>
                      </>
                    )}
                    {!jh.output && !jh.errorOutput && (
                      <Text type="secondary">暂无输出</Text>
                    )}
                  </div>
                ),
              }))}
            />
          )}
        </Card>
      )}
    </PageContainer>
  );
};

export default ExecCommandPage;
