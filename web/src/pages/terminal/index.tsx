import { useEffect, useRef, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Select, Button, Space, message, Tag } from 'antd';
import {
  DisconnectOutlined,
  LinkOutlined,
  ExpandOutlined,
  CompressOutlined,
} from '@ant-design/icons';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { getHostList, type Host } from '@/api/host';
import { useAuthStore } from '@/store/auth';

const TerminalPage = () => {
  const termRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [selectedHostId, setSelectedHostId] = useState<number>();
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const token = useAuthStore((s) => s.token);

  // 加载主机列表
  useEffect(() => {
    getHostList({ pageSize: 1000, status: 1 })
      .then((res) => setHosts(res.rows || []))
      .catch((e) => console.warn('加载主机列表失败', e));
  }, []);

  // 初始化终端
  useEffect(() => {
    if (!termRef.current) return;

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        selectionBackground: '#264f78',
      },
      scrollback: 5000,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(termRef.current);
    fitAddon.fit();

    terminal.writeln('\x1b[36m欢迎使用 Web 终端\x1b[0m');
    terminal.writeln('请选择主机后点击「连接」开始 SSH 会话\r\n');

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      terminal.dispose();
      wsRef.current?.close();
    };
  }, []);

  // 连接 SSH
  const handleConnect = () => {
    if (!selectedHostId) {
      message.warning('请先选择主机');
      return;
    }

    const terminal = terminalRef.current;
    if (!terminal) return;

    // 断开旧连接
    wsRef.current?.close();
    terminal.clear();
    terminal.writeln('\x1b[33m正在连接...\x1b[0m\r\n');
    setConnecting(true);

    // 构建 WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/terminal/${selectedHostId}?token=${token}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setConnecting(false);
      terminal.writeln('\x1b[32m连接成功\x1b[0m\r\n');

      // 发送初始终端大小
      const size = { type: 'resize', cols: terminal.cols, rows: terminal.rows };
      ws.send(JSON.stringify(size));

      // 监听用户输入
      terminal.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'input', data }));
        }
      });

      // 监听终端大小变化
      terminal.onResize(({ cols, rows }) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'resize', cols, rows }));
        }
      });

      terminal.focus();
    };

    ws.onmessage = (event) => {
      terminal.write(event.data);
    };

    ws.onclose = () => {
      setConnected(false);
      setConnecting(false);
      terminal.writeln('\r\n\x1b[31m连接已断开\x1b[0m');
    };

    ws.onerror = () => {
      setConnected(false);
      setConnecting(false);
      terminal.writeln('\r\n\x1b[31m连接失败，请检查主机配置和凭证\x1b[0m');
    };
  };

  // 断开连接
  const handleDisconnect = () => {
    wsRef.current?.close();
    setConnected(false);
  };

  // 全屏切换
  const toggleFullscreen = () => {
    setFullscreen(!fullscreen);
    setTimeout(() => fitAddonRef.current?.fit(), 100);
  };

  const containerStyle = fullscreen
    ? {
        position: 'fixed' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        background: '#1e1e1e',
        padding: 8,
      }
    : {};

  return (
    <PageContainer>
      <div style={containerStyle}>
        <Card
          size="small"
          style={{ marginBottom: fullscreen ? 8 : 16 }}
          bodyStyle={{ padding: '8px 16px' }}
        >
          <Space>
            <Select
              style={{ width: 300 }}
              placeholder="选择主机"
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
              <Button
                type="primary"
                icon={<LinkOutlined />}
                onClick={handleConnect}
                loading={connecting}
                disabled={!selectedHostId}
              >
                连接
              </Button>
            ) : (
              <Button
                danger
                icon={<DisconnectOutlined />}
                onClick={handleDisconnect}
              >
                断开
              </Button>
            )}
            <Button
              icon={fullscreen ? <CompressOutlined /> : <ExpandOutlined />}
              onClick={toggleFullscreen}
            >
              {fullscreen ? '退出全屏' : '全屏'}
            </Button>
            {connected && <Tag color="green">已连接</Tag>}
          </Space>
        </Card>

        <div
          ref={termRef}
          style={{
            height: fullscreen ? 'calc(100vh - 60px)' : 'calc(100vh - 260px)',
            minHeight: 400,
            background: '#1e1e1e',
            borderRadius: 6,
            padding: 4,
          }}
        />
      </div>
    </PageContainer>
  );
};

export default TerminalPage;
