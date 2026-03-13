import { useEffect, useState } from 'react';
import { Drawer, Button, Empty, message } from 'antd';
import { CodeOutlined, SendOutlined, CopyOutlined } from '@ant-design/icons';
import { getSnippetList, type CommandSnippet } from '@/api/snippet';
import { useTerminalStore, sessionInstances } from '../store';

interface CommandSnippetDrawerProps {
  open: boolean;
  onClose: () => void;
}

const CommandSnippetDrawer: React.FC<CommandSnippetDrawerProps> = ({ open, onClose }) => {
  const [snippets, setSnippets] = useState<CommandSnippet[]>([]);
  const [loading, setLoading] = useState(false);
  const { panels } = useTerminalStore();

  useEffect(() => {
    if (open) {
      setLoading(true);
      getSnippetList()
        .then((res) => setSnippets(res || []))
        .catch((e) => console.warn('加载命令片段失败', e))
        .finally(() => setLoading(false));
    }
  }, [open]);

  const sendToTerminal = (command: string) => {
    // Send to active SSH session
    for (const panel of panels) {
      const session = panel.sessions.find((s) => s.key === panel.activeSessionKey);
      if (session?.type === 'ssh') {
        const inst = sessionInstances.get(session.key);
        if (inst && (inst as any).sendCommand) {
          (inst as any).sendCommand(command);
          message.success('已发送');
          return;
        }
      }
    }
    message.warning('没有活跃的终端会话');
  };

  const copyCommand = (command: string) => {
    navigator.clipboard.writeText(command).then(() => {
      message.success('已复制');
    }).catch(() => {});
  };

  return (
    <Drawer
      title="命令片段"
      placement="right"
      width={360}
      open={open}
      onClose={onClose}
    >
      {snippets.length === 0 && !loading ? (
        <Empty
          image={<CodeOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
          description="暂无命令片段"
        />
      ) : (
        <ul className="snippet-list">
          {snippets.map((snippet) => (
            <li key={snippet.id} className="snippet-item">
              <div className="snippet-item-name">{snippet.name}</div>
              <div className="snippet-item-command">{snippet.command}</div>
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <Button
                  size="small"
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={() => sendToTerminal(snippet.command)}
                >
                  执行
                </Button>
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => copyCommand(snippet.command)}
                >
                  复制
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  );
};

export default CommandSnippetDrawer;
