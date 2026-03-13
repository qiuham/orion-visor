import { useEffect, useRef } from 'react';
import { Select, InputNumber, Switch, Divider } from 'antd';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { useTerminalStore } from '../store';
import { terminalThemes, getThemeByName } from '../themes';

const fontFamilies = [
  'Menlo, Monaco, "Courier New", monospace',
  'Monaco, monospace',
  '"Courier New", monospace',
  '"Fira Code", monospace',
  '"Source Code Pro", monospace',
  '"JetBrains Mono", monospace',
  'Consolas, monospace',
];

const cursorStyles: Array<{ label: string; value: 'block' | 'underline' | 'bar' }> = [
  { label: '方块', value: 'block' },
  { label: '下划线', value: 'underline' },
  { label: '竖线', value: 'bar' },
];

const DisplaySettingView: React.FC = () => {
  const {
    terminalThemeName, fontSize, fontFamily, cursorStyle, cursorBlink, scrollback,
    setTerminalTheme, setFontSize, setFontFamily, setCursorStyle, setCursorBlink, setScrollback,
  } = useTerminalStore();

  const previewRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);

  // Terminal preview
  useEffect(() => {
    if (!previewRef.current) return;
    const theme = getThemeByName(terminalThemeName);
    const term = new Terminal({
      cursorBlink,
      fontSize,
      fontFamily,
      cursorStyle,
      theme: theme.schema,
      rows: 8,
      cols: 60,
      scrollback: 0,
      disableStdin: true,
    });
    term.open(previewRef.current);

    term.writeln('\x1b[36m~ $ \x1b[0mls -la');
    term.writeln('total 48');
    term.writeln('drwxr-xr-x  6 user user 4096 Mar 13 10:00 \x1b[34m.\x1b[0m');
    term.writeln('drwxr-xr-x  3 user user 4096 Mar 12 09:00 \x1b[34m..\x1b[0m');
    term.writeln('-rw-r--r--  1 user user  220 Mar 10 08:00 \x1b[32m.bashrc\x1b[0m');
    term.writeln('-rw-r--r--  1 user user 3771 Mar 10 08:00 .profile');
    term.writeln('drwxr-xr-x  2 user user 4096 Mar 11 14:00 \x1b[34mdocuments\x1b[0m');
    term.writeln('\x1b[36m~ $ \x1b[0m\x1b[5m▌\x1b[0m');

    terminalRef.current = term;

    return () => {
      term.dispose();
    };
  }, [terminalThemeName, fontSize, fontFamily, cursorStyle, cursorBlink]);

  return (
    <div className="new-connection-container">
      <div className="new-connection-wrapper">
        <h2 className="new-connection-title">显示设置</h2>

        {/* Theme selection */}
        <h3 className="new-connection-subtitle">终端主题</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          {terminalThemes.map((theme) => (
            <div
              key={theme.name}
              onClick={() => setTerminalTheme(theme.name)}
              style={{
                width: 120,
                height: 72,
                borderRadius: 6,
                border: terminalThemeName === theme.name ? '2px solid #3860FF' : '2px solid transparent',
                background: theme.schema.background,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: 8,
                transition: 'border-color 0.2s',
              }}
            >
              <div style={{ display: 'flex', gap: 4 }}>
                {[theme.schema.red, theme.schema.green, theme.schema.yellow, theme.schema.blue, theme.schema.magenta, theme.schema.cyan].map((color, i) => (
                  <div key={i} style={{ width: 8, height: 8, borderRadius: 4, background: color as string }} />
                ))}
              </div>
              <div style={{ fontSize: 11, color: theme.schema.foreground as string, textAlign: 'center' }}>
                {theme.label}
              </div>
            </div>
          ))}
        </div>

        {/* Terminal preview */}
        <h3 className="new-connection-subtitle">预览</h3>
        <div
          ref={previewRef}
          style={{
            borderRadius: 6,
            overflow: 'hidden',
            marginBottom: 24,
            border: '1px solid rgba(0,0,0,0.06)',
          }}
        />

        <Divider />

        {/* Font settings */}
        <h3 className="new-connection-subtitle">字体设置</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '16px 24px', alignItems: 'center', maxWidth: 500 }}>
          <span style={{ color: 'var(--terminal-color-content-text-2)' }}>字体</span>
          <Select
            value={fontFamily}
            onChange={setFontFamily}
            options={fontFamilies.map((f) => ({ label: f.split(',')[0]?.replace(/"/g, ''), value: f }))}
          />

          <span style={{ color: 'var(--terminal-color-content-text-2)' }}>字号</span>
          <InputNumber
            min={8}
            max={28}
            value={fontSize}
            onChange={(v) => v && setFontSize(v)}
          />

          <span style={{ color: 'var(--terminal-color-content-text-2)' }}>光标样式</span>
          <Select
            value={cursorStyle}
            onChange={setCursorStyle}
            options={cursorStyles}
          />

          <span style={{ color: 'var(--terminal-color-content-text-2)' }}>光标闪烁</span>
          <Switch checked={cursorBlink} onChange={setCursorBlink} />

          <span style={{ color: 'var(--terminal-color-content-text-2)' }}>回滚行数</span>
          <InputNumber
            min={100}
            max={99999}
            step={500}
            value={scrollback}
            onChange={(v) => v && setScrollback(v)}
          />
        </div>
      </div>
    </div>
  );
};

export default DisplaySettingView;
