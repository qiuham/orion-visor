import { useState, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Table, Button, Modal, Form, Input, InputNumber, message, Popconfirm } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import {
  getDictKeys,
  createDictKey,
  deleteDictKey,
  getDictValues,
  createDictValue,
  deleteDictValue,
  type DictKey,
  type DictValue,
} from '@/api/system';

const DictPage = () => {
  const [keys, setKeys] = useState<DictKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<DictKey | null>(null);
  const [values, setValues] = useState<DictValue[]>([]);
  const [valuesLoading, setValuesLoading] = useState(false);

  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [valueModalOpen, setValueModalOpen] = useState(false);
  const [keyForm] = Form.useForm();
  const [valueForm] = Form.useForm();

  const loadKeys = async () => {
    setLoading(true);
    try {
      const data = await getDictKeys();
      setKeys(data || []);
    } catch (e) {
      console.warn('加载字典键失败', e);
    } finally {
      setLoading(false);
    }
  };

  const loadValues = async (keyName: string) => {
    setValuesLoading(true);
    try {
      const data = await getDictValues(keyName);
      setValues(data || []);
    } catch {
      setValues([]);
    } finally {
      setValuesLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const handleSelectKey = (record: DictKey) => {
    setSelectedKey(record);
    loadValues(record.keyName);
  };

  const handleCreateKey = async () => {
    try {
      const vals = await keyForm.validateFields();
      await createDictKey(vals);
      message.success('创建成功');
      setKeyModalOpen(false);
      loadKeys();
    } catch {
      // validation
    }
  };

  const handleDeleteKey = async (id: number) => {
    await deleteDictKey(id);
    message.success('删除成功');
    if (selectedKey?.id === id) {
      setSelectedKey(null);
      setValues([]);
    }
    loadKeys();
  };

  const handleCreateValue = async () => {
    if (!selectedKey) return;
    try {
      const vals = await valueForm.validateFields();
      await createDictValue({ ...vals, keyName: selectedKey.keyName });
      message.success('创建成功');
      setValueModalOpen(false);
      loadValues(selectedKey.keyName);
    } catch {
      // validation
    }
  };

  const handleDeleteValue = async (id: number) => {
    await deleteDictValue(id);
    message.success('删除成功');
    if (selectedKey) loadValues(selectedKey.keyName);
  };

  return (
    <PageContainer>
      <div style={{ display: 'flex', gap: 16 }}>
        {/* 左：字典键 */}
        <Card
          title="字典键"
          style={{ width: 400, flexShrink: 0 }}
          extra={
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => {
                keyForm.resetFields();
                setKeyModalOpen(true);
              }}
            >
              新建
            </Button>
          }
        >
          <Table
            dataSource={keys}
            rowKey="id"
            size="small"
            loading={loading}
            pagination={false}
            onRow={(record) => ({
              onClick: () => handleSelectKey(record),
              style: {
                cursor: 'pointer',
                background: selectedKey?.id === record.id ? '#e6f7ff' : undefined,
              },
            })}
            columns={[
              { title: '键名', dataIndex: 'keyName', width: 160 },
              { title: '描述', dataIndex: 'description', ellipsis: true },
              {
                title: '操作',
                width: 60,
                render: (_, record) => (
                  <Popconfirm title="确定删除？" onConfirm={() => handleDeleteKey(record.id)}>
                    <a style={{ color: '#ff4d4f' }}>删除</a>
                  </Popconfirm>
                ),
              },
            ]}
          />
        </Card>

        {/* 右：字典值 */}
        <Card
          title={selectedKey ? `字典值 - ${selectedKey.keyName}` : '字典值'}
          style={{ flex: 1 }}
          extra={
            selectedKey && (
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => {
                  valueForm.resetFields();
                  valueForm.setFieldsValue({ sort: 0 });
                  setValueModalOpen(true);
                }}
              >
                新建
              </Button>
            )
          }
        >
          {selectedKey ? (
            <Table
              dataSource={values}
              rowKey="id"
              size="small"
              loading={valuesLoading}
              pagination={false}
              columns={[
                { title: '值', dataIndex: 'value', width: 120 },
                { title: '标签', dataIndex: 'label', width: 120 },
                { title: '扩展', dataIndex: 'extra', ellipsis: true },
                { title: '排序', dataIndex: 'sort', width: 60 },
                {
                  title: '操作',
                  width: 60,
                  render: (_, record) => (
                    <Popconfirm title="确定删除？" onConfirm={() => handleDeleteValue(record.id)}>
                      <a style={{ color: '#ff4d4f' }}>删除</a>
                    </Popconfirm>
                  ),
                },
              ]}
            />
          ) : (
            <p style={{ color: '#999' }}>请先选择左侧的字典键</p>
          )}
        </Card>
      </div>

      {/* 新建字典键 */}
      <Modal
        title="新建字典键"
        open={keyModalOpen}
        onOk={handleCreateKey}
        onCancel={() => setKeyModalOpen(false)}
        destroyOnClose
        width={400}
      >
        <Form form={keyForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="keyName" label="键名" rules={[{ required: true }]}>
            <Input placeholder="如：host_type" maxLength={64} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input placeholder="描述" maxLength={128} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 新建字典值 */}
      <Modal
        title="新建字典值"
        open={valueModalOpen}
        onOk={handleCreateValue}
        onCancel={() => setValueModalOpen(false)}
        destroyOnClose
        width={400}
      >
        <Form form={valueForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="value" label="值" rules={[{ required: true }]}>
            <Input placeholder="字典值" maxLength={64} />
          </Form.Item>
          <Form.Item name="label" label="标签" rules={[{ required: true }]}>
            <Input placeholder="显示标签" maxLength={64} />
          </Form.Item>
          <Form.Item name="extra" label="扩展数据">
            <Input placeholder="可选扩展字段" maxLength={256} />
          </Form.Item>
          <Form.Item name="sort" label="排序">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default DictPage;
