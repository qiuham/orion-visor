import { useRef } from 'react';
import { Button } from 'antd';
import { SendOutlined, ClearOutlined } from '@ant-design/icons';
import { useTerminalStore, sessionInstances } from '../store';

const CommandBar: React.FC = () => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { commandBarText, setCommandBarText, panels } = useTerminalStore();

  const sendCommand = () => {
    if (!commandBarText.trim()) return;

    // Find active SSH session and send command
    for (const panel of panels) {
      const session = panel.sessions.find((s) => s.key === panel.activeSessionKey);
      if (session?.type === 'ssh') {
        const inst = sessionInstances.get(session.key);
        if (inst && (inst as any).sendCommand) {
          (inst as any).sendCommand(commandBarText);
        }
      }
    }
  };

  const sendToAll = () => {
    if (!commandBarText.trim()) return;

    // Send to all SSH sessions
    for (const panel of panels) {
      for (const session of panel.sessions) {
        if (session.type === 'ssh') {
          const inst = sessionInstances.get(session.key);
          if (inst && (inst as any).sendCommand) {
            (inst as any).sendCommand(commandBarText);
          }
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      sendCommand();
    }
  };

  return (
    <div className="terminal-command-bar">
      <textarea
        ref={textareaRef}
        className="terminal-command-bar-textarea"
        placeholder="输入命令... (Ctrl+Enter 发送)"
        value={commandBarText}
        onChange={(e) => setCommandBarText(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <div className="terminal-command-bar-actions">
        <Button
          size="small"
          icon={<ClearOutlined />}
          onClick={() => setCommandBarText('')}
        >
          清空
        </Button>
        <Button
          size="small"
          onClick={sendToAll}
        >
          发送全部
        </Button>
        <Button
          size="small"
          type="primary"
          icon={<SendOutlined />}
          onClick={sendCommand}
        >
          发送
        </Button>
      </div>
    </div>
  );
};

export default CommandBar;
