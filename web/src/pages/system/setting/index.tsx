import { useState, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Form, Input, Button, message, Spin } from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import { getSettings, updateSetting, type SystemSetting } from '@/api/system';

const SystemSettingPage = () => {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await getSettings();
      setSettings(data || []);
      const values: Record<string, string> = {};
      (data || []).forEach((s) => {
        values[s.item] = s.value;
      });
      form.setFieldsValue(values);
    } catch {
      message.error('加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async () => {
    const values = form.getFieldsValue();
    setSaving(true);
    try {
      for (const [item, value] of Object.entries(values)) {
        const orig = settings.find((s) => s.item === item);
        if (orig && orig.value !== value) {
          await updateSetting(item, value as string);
        }
      }
      message.success('保存成功');
      await loadSettings();
    } catch {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer>
      <Card
        title="系统配置"
        extra={
          <>
            <Button icon={<ReloadOutlined />} onClick={loadSettings} style={{ marginRight: 8 }}>
              刷新
            </Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
              保存
            </Button>
          </>
        }
      >
        <Spin spinning={loading}>
          <Form form={form} layout="vertical" style={{ maxWidth: 600 }}>
            {settings.map((s) => (
              <Form.Item key={s.item} name={s.item} label={s.item} extra={s.remark}>
                <Input placeholder={`配置项: ${s.item}`} />
              </Form.Item>
            ))}
            {settings.length === 0 && !loading && (
              <p style={{ color: '#999' }}>暂无配置项</p>
            )}
          </Form>
        </Spin>
      </Card>
    </PageContainer>
  );
};

export default SystemSettingPage;
