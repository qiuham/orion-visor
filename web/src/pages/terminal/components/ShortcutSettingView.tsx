import { useState, useCallback, useEffect, useRef } from 'react';
import { Switch, Button, Table, Tag, Space, message } from 'antd';
import { ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import type { ShortcutKeyConfig } from '../types';
import { DefaultShortcuts } from '../types';
import { loadPreferences, savePreferences } from '../preferences';

// Key code display names
const keyDisplayMap: Record<string, string> = {
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓',
  Backquote: '`',
  Comma: ',',
  Equal: '=',
  Minus: '-',
  Home: 'Home',
  End: 'End',
  F11: 'F11',
};

function getKeyDisplay(code: string): string {
  if (keyDisplayMap[code]) return keyDisplayMap[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return code;
}

function formatShortcut(sc: ShortcutKeyConfig): string {
  const parts: string[] = [];
  if (sc.ctrlKey) parts.push('Ctrl');
  if (sc.shiftKey) parts.push('Shift');
  if (sc.altKey) parts.push('Alt');
  parts.push(getKeyDisplay(sc.code));
  return parts.join(' + ');
}

const typeLabels: Record<string, { label: string; color: string }> = {
  global: { label: '全局', color: 'blue' },
  session: { label: '会话', color: 'green' },
  terminal: { label: '终端', color: 'orange' },
};

const ShortcutSettingView: React.FC = () => {
  const [enabled, setEnabled] = useState(true);
  const [shortcuts, setShortcuts] = useState<ShortcutKeyConfig[]>([]);
  const [recordingItem, setRecordingItem] = useState<string | null>(null);
  const recordingRef = useRef<string | null>(null);

  // Load from preferences
  useEffect(() => {
    const prefs = loadPreferences();
    setEnabled(prefs.shortcutEnabled);
    setShortcuts(prefs.shortcuts?.length ? prefs.shortcuts : [...DefaultShortcuts]);
  }, []);

  // Keep ref in sync
  useEffect(() => {
    recordingRef.current = recordingItem;
  }, [recordingItem]);

  // Global keydown listener for recording
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const item = recordingRef.current;
      if (!item) return;
      // Ignore modifier-only presses
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

      e.preventDefault();
      e.stopPropagation();

      setShortcuts((prev) =>
        prev.map((sc) =>
          sc.item === item
            ? { ...sc, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey, code: e.code }
            : sc
        )
      );
      setRecordingItem(null);
    };

    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, []);

  const handleSave = useCallback(() => {
    savePreferences({ shortcutEnabled: enabled, shortcuts });
    message.success('快捷键设置已保存');
  }, [enabled, shortcuts]);

  const handleReset = useCallback(() => {
    setShortcuts([...DefaultShortcuts]);
    setEnabled(true);
    message.info('已重置为默认快捷键');
  }, []);

  const handleToggleItem = useCallback((item: string, checked: boolean) => {
    setShortcuts((prev) =>
      prev.map((sc) => (sc.item === item ? { ...sc, enabled: checked } : sc))
    );
  }, []);

  const columns = [
    {
      title: '分组',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: string) => {
        const cfg = typeLabels[type];
        return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : type;
      },
    },
    {
      title: '操作名称',
      dataIndex: 'label',
      key: 'label',
      width: 180,
    },
    {
      title: '快捷键',
      key: 'shortcut',
      width: 220,
      render: (_: unknown, record: ShortcutKeyConfig) => {
        const isRecording = recordingItem === record.item;
        return (
          <div
            onClick={() => setRecordingItem(record.item)}
            style={{
              padding: '4px 12px',
              border: isRecording ? '2px solid #3860FF' : '1px solid rgba(0,0,0,0.15)',
              borderRadius: 4,
              cursor: 'pointer',
              minHeight: 32,
              display: 'flex',
              alignItems: 'center',
              background: isRecording ? 'rgba(56, 96, 255, 0.05)' : 'transparent',
              fontSize: 13,
              fontFamily: 'monospace',
              transition: 'all 0.2s',
            }}
          >
            {isRecording ? (
              <span style={{ color: '#3860FF', fontStyle: 'italic' }}>按下快捷键...</span>
            ) : (
              formatShortcut(record)
            )}
          </div>
        );
      },
    },
    {
      title: '启用',
      key: 'enabled',
      width: 80,
      render: (_: unknown, record: ShortcutKeyConfig) => (
        <Switch
          size="small"
          checked={record.enabled}
          onChange={(checked) => handleToggleItem(record.item, checked)}
        />
      ),
    },
  ];

  // Group shortcuts by type for display
  const groupOrder: Array<'global' | 'session' | 'terminal'> = ['global', 'session', 'terminal'];
  const sortedShortcuts = [...shortcuts].sort(
    (a, b) => groupOrder.indexOf(a.type) - groupOrder.indexOf(b.type)
  );

  return (
    <div className="new-connection-container">
      <div className="new-connection-wrapper">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 className="new-connection-title" style={{ margin: 0 }}>快捷键设置</h2>
          <Space>
            <span style={{ color: 'var(--terminal-color-content-text-2)', fontSize: 13 }}>全局启用</span>
            <Switch checked={enabled} onChange={setEnabled} />
          </Space>
        </div>

        <p style={{ color: 'var(--terminal-color-content-text-3)', fontSize: 13, marginBottom: 16 }}>
          点击快捷键列可重新录入组合键。修改后请点击保存。
        </p>

        <Table
          columns={columns}
          dataSource={sortedShortcuts}
          rowKey="item"
          size="small"
          pagination={false}
          style={{ marginBottom: 24 }}
        />

        <Space>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
            保存
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            重置默认
          </Button>
        </Space>
      </div>
    </div>
  );
};

export default ShortcutSettingView;
