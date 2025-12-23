import { Card, Row, Col, Statistic } from 'antd';
import { 
  UserOutlined, 
  ShopOutlined, 
  TransactionOutlined, 
  DollarOutlined,
  RiseOutlined,
} from '@ant-design/icons';

interface StatsOverviewProps {
  totalUsers?: number;
  activePartners?: number;
  totalTransactions?: number;
  totalYessCoin?: number;
  usersGrowth?: number;
  partnersGrowth?: number;
  transactionsGrowth?: number;
  coinsGrowth?: number;
}

export const StatsOverview = ({
  totalUsers = 0,
  activePartners = 0,
  totalTransactions = 0,
  totalYessCoin = 0,
  usersGrowth = 0,
  partnersGrowth = 0,
  transactionsGrowth = 0,
  coinsGrowth = 0,
}: StatsOverviewProps) => {
  return (
    <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
      <Col xs={24} sm={12} lg={6}>
        <Card
          className="hover-lift scale-in animate-delay-100"
          style={{
            borderRadius: 16,
            background: 'linear-gradient(135deg, #ffffff 0%, #F0FDF9 100%)',
            border: '1px solid #E8F8F3',
            boxShadow: '0 4px 12px rgba(3, 83, 58, 0.05)',
          }}
        >
          <Statistic
            title={<span style={{ color: '#07B981', fontWeight: 500 }}>👥 Пользователи</span>}
            value={totalUsers}
            valueStyle={{ color: '#03533A', fontWeight: 700, fontSize: 28 }}
            prefix={<UserOutlined style={{ color: '#07B981', fontSize: 20 }} />}
          />
          <div style={{ fontSize: 12, color: '#07B981', marginTop: 8, fontWeight: 500 }}>
            <RiseOutlined /> ↑ {usersGrowth}% vs прошлый месяц
          </div>
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card
          className="hover-lift scale-in animate-delay-200"
          style={{
            borderRadius: 16,
            background: 'linear-gradient(135deg, #ffffff 0%, #F0FDF9 100%)',
            border: '1px solid #E8F8F3',
            boxShadow: '0 4px 12px rgba(3, 83, 58, 0.05)',
          }}
        >
          <Statistic
            title={<span style={{ color: '#07B981', fontWeight: 500 }}>🏪 Партнеры</span>}
            value={activePartners}
            valueStyle={{ color: '#03533A', fontWeight: 700, fontSize: 28 }}
            prefix={<ShopOutlined style={{ color: '#07B981', fontSize: 20 }} />}
          />
          <div style={{ fontSize: 12, color: '#07B981', marginTop: 8, fontWeight: 500 }}>
            <RiseOutlined /> ↑ {partnersGrowth}% vs прошлый месяц
          </div>
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card
          className="hover-lift scale-in animate-delay-300"
          style={{
            borderRadius: 16,
            background: 'linear-gradient(135deg, #ffffff 0%, #F0FDF9 100%)',
            border: '1px solid #E8F8F3',
            boxShadow: '0 4px 12px rgba(3, 83, 58, 0.05)',
          }}
        >
          <Statistic
            title={<span style={{ color: '#07B981', fontWeight: 500 }}>⭐ Yess!Coin</span>}
            value={totalYessCoin}
            suffix=" млн"
            valueStyle={{ color: '#03533A', fontWeight: 700, fontSize: 28 }}
            prefix={<DollarOutlined style={{ color: '#07B981', fontSize: 20 }} />}
          />
          <div style={{ fontSize: 12, color: '#07B981', marginTop: 8, fontWeight: 500 }}>
            <RiseOutlined /> ↑ {coinsGrowth}% vs прошлый месяц
          </div>
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card
          className="hover-lift scale-in animate-delay-400"
          style={{
            borderRadius: 16,
            background: 'linear-gradient(135deg, #ffffff 0%, #F0FDF9 100%)',
            border: '1px solid #E8F8F3',
            boxShadow: '0 4px 12px rgba(3, 83, 58, 0.05)',
          }}
        >
          <Statistic
            title={<span style={{ color: '#07B981', fontWeight: 500 }}>💳 Транзакции</span>}
            value={totalTransactions}
            valueStyle={{ color: '#03533A', fontWeight: 700, fontSize: 28 }}
            prefix={<TransactionOutlined style={{ color: '#07B981', fontSize: 20 }} />}
          />
          <div style={{ fontSize: 12, color: '#07B981', marginTop: 8, fontWeight: 500 }}>
            <RiseOutlined /> ↑ {transactionsGrowth}% vs прошлый месяц
          </div>
        </Card>
      </Col>
    </Row>
  );
};
