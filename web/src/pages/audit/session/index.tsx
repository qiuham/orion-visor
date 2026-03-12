import { useRef, useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Modal, Tag, message, Popconfirm, Space } from 'antd';
import { PlayCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  getTerminalSessions,
  getTerminalSessionData,
  deleteTerminalSession,
  type TerminalSession,
} from '@/api/terminal';

const TerminalSessionPage = () => {
  const actionRef = useRef<ActionType>();
  const [replayOpen, setReplayOpen] = useState(false);
  const [replayData, setReplayData] = useState<any>(null);
  const [replayLoading, setReplayLoading] = useState(false);
  const replayRef = useRef<HTMLDivElement>(null);

  const handleReplay = async (record: TerminalSession) => {
    setReplayLoading(true);
    setReplayOpen(true);
    try {
      const data = await getTerminalSessionData(record.id);
      setReplayData(data);
    } catch {
      message.error('加载录屏数据失败');
      setReplayOpen(false);
    } finally {
      setReplayLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    await deleteTerminalSession(id);
    message.success('删除成功');
    actionRef.current?.reload();
  };

  const columns: ProColumns<TerminalSession>[] = [
    { title: '用户', dataIndex: 'username', width: 100 },
    { title: '主机名称', dataIndex: 'hostName', width: 160 },
    { title: '主机地址', dataIndex: 'hostAddress', width: 140, search: false },
    {
      title: '类型',
      dataIndex: 'type',
      width: 80,
      render: (_, r) => <Tag color="green">{r.type || 'SSH'}</Tag>,
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      width: 170,
      valueType: 'dateTime',
      search: false,
    },
    {
      title: '结束时间',
      dataIndex: 'endTime',
      width: 170,
      valueType: 'dateTime',
      search: false,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 140,
      render: (_, record) => (
        <Space>
          <a onClick={() => handleReplay(record)}>
            <PlayCircleOutlined /> 回放
          </a>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <a style={{ color: '#ff4d4f' }}>
              <DeleteOutlined /> 删除
            </a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer>
      <ProTable<TerminalSession>
        actionRef={actionRef}
        columns={columns}
        rowKey="id"
        search={false}
        pagination={{ defaultPageSize: 20, showTotal: (t) => `共 ${t} 条` }}
        request={async (params) => {
          try {
            const res = await getTerminalSessions({
              page: params.current,
              pageSize: params.pageSize,
            });
            return { data: res.rows || [], total: res.total || 0, success: true };
          } catch {
            return { data: [], total: 0, success: false };
          }
        }}
        headerTitle="终端录屏"
      />

      <Modal
        title="终端回放"
        open={replayOpen}
        onCancel={() => {
          setReplayOpen(false);
          setReplayData(null);
        }}
        footer={null}
        width={900}
        styles={{ body: { padding: 0 } }}
      >
        <div
          ref={replayRef}
          style={{
            background: '#1e1e1e',
            padding: 12,
            borderRadius: 4,
            minHeight: 400,
            maxHeight: 600,
            overflow: 'auto',
          }}
        >
          {replayLoading ? (
            <p style={{ color: '#999', textAlign: 'center', paddingTop: 180 }}>加载中...</p>
          ) : replayData ? (
            <ReplayPlayer data={replayData} />
          ) : (
            <p style={{ color: '#999', textAlign: 'center', paddingTop: 180 }}>暂无数据</p>
          )}
        </div>
      </Modal>
    </PageContainer>
  );
};

/**
 * 简易 asciicast 回放器
 * 逐帧播放终端录屏数据
 */
const ReplayPlayer = ({ data }: { data: any }) => {
  const [output, setOutput] = useState('');
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<number[]>([]);

  const startReplay = () => {
    // 清空之前的定时器
    timerRef.current.forEach(clearTimeout);
    timerRef.current = [];
    setOutput('');
    setPlaying(true);

    // asciicast v2 格式: 每行是 [time, type, data]
    const events = Array.isArray(data) ? data : data?.events || data?.stdout || [];
    if (!events.length) {
      setOutput('无录屏数据');
      setPlaying(false);
      return;
    }

    let accumulated = '';
    events.forEach((event: any, idx: number) => {
      const delay = Array.isArray(event) ? (event[0] || 0) * 1000 : 0;
      const text = Array.isArray(event) ? event[2] || '' : typeof event === 'string' ? event : '';
      const timer = window.setTimeout(() => {
        // 解码 base64 如果需要
        let decoded = text;
        try {
          decoded = atob(text);
        } catch {
          decoded = text;
        }
        accumulated += decoded;
        setOutput(accumulated);
        if (idx === events.length - 1) {
          setPlaying(false);
        }
      }, delay);
      timerRef.current.push(timer);
    });
  };

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <Button
          type="primary"
          size="small"
          icon={<PlayCircleOutlined />}
          onClick={startReplay}
          disabled={playing}
        >
          {playing ? '播放中...' : '开始回放'}
        </Button>
      </div>
      <pre
        style={{
          color: '#d4d4d4',
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
          fontSize: 13,
          lineHeight: 1.4,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          margin: 0,
          minHeight: 300,
        }}
      >
        {output || '点击「开始回放」播放终端录屏'}
      </pre>
    </div>
  );
};

export default TerminalSessionPage;
