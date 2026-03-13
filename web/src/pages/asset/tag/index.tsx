import { useState, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Table, Button, Modal, Form, Input, Tag, message, Popconfirm, ColorPicker } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { getTagList, createTag, deleteTag, type Tag as TagType } from '@/api/tag';

const TagPage = () => {
  const [tags, setTags] = useState<TagType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const loadTags = async () => {
    setLoading(true);
    try {
      const data = await getTagList();
      setTags(data || []);
    } catch (e) {
      console.warn('加载标签失败', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTags();
  }, []);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const color = typeof values.color === 'string' ? values.color : values.color?.toHexString?.() || '#1890ff';
      await createTag({ name: values.name, color });
      message.success('创建成功');
      setModalOpen(false);
      loadTags();
    } catch {
      // validation
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    await deleteTag(id);
    message.success('删除成功');
    loadTags();
  };

  return (
    <PageContainer>
      <Card
        title="标签管理"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              form.resetFields();
              form.setFieldsValue({ color: '#1890ff' });
              setModalOpen(true);
            }}
          >
            新建标签
          </Button>
        }
      >
        <Table
          dataSource={tags}
          rowKey="id"
          loading={loading}
          pagination={false}
          columns={[
            {
              title: '标签',
              dataIndex: 'name',
              width: 200,
              render: (name: string, record: TagType) => (
                <Tag color={record.color}>{name}</Tag>
              ),
            },
            { title: '颜色', dataIndex: 'color', width: 120 },
            { title: '创建时间', dataIndex: 'createTime', width: 170 },
            {
              title: '操作',
              width: 80,
              render: (_: any, record: TagType) => (
                <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
                  <a style={{ color: '#ff4d4f' }}>删除</a>
                </Popconfirm>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title="新建标签"
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        destroyOnClose
        width={400}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="标签名称" rules={[{ required: true, message: '请输入标签名称' }]}>
            <Input placeholder="如：生产环境" maxLength={32} />
          </Form.Item>
          <Form.Item name="color" label="颜色">
            <ColorPicker />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default TagPage;
