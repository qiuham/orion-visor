import { useRef, useState, useEffect } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Modal, Form, Input, Select, Tag, message, Popconfirm, Space, Drawer, Table } from 'antd';
import { PlusOutlined, PlayCircleOutlined, FileTextOutlined } from '@ant-design/icons';
import { getHostList, type Host } from '@/api/host';
import {
  getCronList,
  createCron,
  updateCron,
  deleteCron,
  triggerCron,
  getCronLogs,
  type CronJob,
  type CronJobLog,
} from '@/api/exec';

const { TextArea } = Input;

const CronPage = () => {
  const actionRef = useRef<ActionType>();
  const [hosts, setHosts] = useState<Host[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CronJob | null>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [logDrawerOpen, setLogDrawerOpen] = useState(false);
  const [logs, setLogs] = useState<CronJobLog[]>([]);
  const [logCronName, setLogCronName] = useState('');

  useEffect(() => {
    getHostList({ pageSize: 1000, status: 1 })
      .then((res) => setHosts(res.rows || []))
      .catch(() => {});
  }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: 1 });
    setModalOpen(true);
  };

  const openEdit = (record: CronJob) => {
    setEditing(record);
    form.setFieldsValue({
      name: record.name,
      expression: record.expression,
      command: record.command,
      hostIds: record.hostIds,
      status: record.status,
      remark: record.remark,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (editing) {
        await updateCron(editing.id, values);
        message.success('更新成功');
      } else {
        await createCron(values);
        message.success('创建成功');
      }
      setModalOpen(false);
      actionRef.current?.reload();
    } catch {
      // validation
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    await deleteCron(id);
    message.success('删除成功');
    actionRef.current?.reload();
  };

  const handleTrigger = async (id: number) => {
    await triggerCron(id);
    message.success('已触发执行');
  };

  const viewLogs = async (record: CronJob) => {
    setLogCronName(record.name);
    setLogDrawerOpen(true);
    try {
      const res = await getCronLogs(record.id, { pageSize: 50 });
      setLogs(res.rows || []);
    } catch {
      setLogs([]);
    }
  };

  const columns: ProColumns<CronJob>[] = [
    { title: '任务名称', dataIndex: 'name', width: 180 },
    { title: 'Cron 表达式', dataIndex: 'expression', width: 160, search: false },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (_, r) => (
        <Tag color={r.status === 1 ? 'green' : 'red'}>
          {r.status === 1 ? '启用' : '禁用'}
        </Tag>
      ),
    },
    { title: '上次执行', dataIndex: 'lastExecTime', width: 170, valueType: 'dateTime', search: false },
    { title: '下次执行', dataIndex: 'nextExecTime', width: 170, valueType: 'dateTime', search: false },
    { title: '创建时间', dataIndex: 'createTime', width: 170, valueType: 'dateTime', search: false },
    {
      title: '操作',
      valueType: 'option',
      width: 220,
      render: (_, record) => (
        <Space>
          <a onClick={() => openEdit(record)}>编辑</a>
          <a onClick={() => handleTrigger(record.id)}>
            <PlayCircleOutlined /> 执行
          </a>
          <a onClick={() => viewLogs(record)}>
            <FileTextOutlined /> 日志
          </a>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <a style={{ color: '#ff4d4f' }}>删除</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer>
      <ProTable<CronJob>
        actionRef={actionRef}
        columns={columns}
        rowKey="id"
        search={false}
        pagination={{ defaultPageSize: 20, showTotal: (t) => `共 ${t} 条` }}
        request={async (params) => {
          try {
            const res = await getCronList({ page: params.current, pageSize: params.pageSize });
            return { data: res.rows || [], total: res.total || 0, success: true };
          } catch {
            return { data: [], total: 0, success: false };
          }
        }}
        headerTitle="定时任务"
        toolBarRender={() => [
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新建任务
          </Button>,
        ]}
      />

      <Modal
        title={editing ? '编辑定时任务' : '新建定时任务'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        destroyOnClose
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="任务名称" rules={[{ required: true }]}>
            <Input placeholder="任务名称" maxLength={64} />
          </Form.Item>
          <Form.Item
            name="expression"
            label="Cron 表达式"
            rules={[{ required: true }]}
            extra="如: 0 0 * * * (每天零点)"
          >
            <Input placeholder="0 */5 * * *" maxLength={64} />
          </Form.Item>
          <Form.Item name="hostIds" label="目标主机" rules={[{ required: true, message: '请选择主机' }]}>
            <Select
              mode="multiple"
              placeholder="选择执行主机"
              showSearch
              optionFilterProp="label"
              options={hosts.map((h) => ({ label: `${h.name} (${h.address})`, value: h.id }))}
            />
          </Form.Item>
          <Form.Item name="command" label="执行命令" rules={[{ required: true }]}>
            <TextArea rows={4} placeholder="Shell 命令" style={{ fontFamily: 'monospace' }} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select options={[{ label: '启用', value: 1 }, { label: '禁用', value: 2 }]} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} maxLength={256} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={`执行日志 - ${logCronName}`}
        open={logDrawerOpen}
        onClose={() => setLogDrawerOpen(false)}
        width={600}
      >
        <Table
          dataSource={logs}
          rowKey="id"
          size="small"
          pagination={false}
          columns={[
            {
              title: '状态',
              dataIndex: 'status',
              width: 80,
              render: (s: string) => <Tag color={s === 'completed' ? 'green' : 'red'}>{s}</Tag>,
            },
            { title: '开始时间', dataIndex: 'startTime', width: 170 },
            { title: '结束时间', dataIndex: 'finishTime', width: 170 },
            {
              title: '输出',
              dataIndex: 'output',
              ellipsis: true,
              render: (text: string) =>
                text ? (
                  <pre style={{ margin: 0, fontSize: 12, maxHeight: 100, overflow: 'auto' }}>
                    {text}
                  </pre>
                ) : (
                  '-'
                ),
            },
          ]}
        />
      </Drawer>
    </PageContainer>
  );
};

export default CronPage;
