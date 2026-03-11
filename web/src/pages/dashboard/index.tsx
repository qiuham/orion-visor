import { PageContainer } from '@ant-design/pro-components';
import { Card, Col, Row, Statistic } from 'antd';
import {
  DesktopOutlined,
  CloudServerOutlined,
  UserOutlined,
  AuditOutlined,
} from '@ant-design/icons';

const Dashboard = () => {
  return (
    <PageContainer>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="主机总数" value={0} prefix={<CloudServerOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="在线终端" value={0} prefix={<DesktopOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="用户数" value={0} prefix={<UserOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="今日操作" value={0} prefix={<AuditOutlined />} />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default Dashboard;
