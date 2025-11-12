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
  totalUsers = 10325,
  activePartners = 750,
  totalTransactions = 2764,
  totalYessCoin = 7.4,
  usersGrowth = 12,
  partnersGrowth = 8,
  transactionsGrowth = 15,
  coinsGrowth = 24,
}: StatsOverviewProps) => {
  return (
    <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
      <Col xs={24} sm={12} lg={6}>
        <Card
          className="hover-lift-green scale-in animate-delay-100"
          style={{
            borderRadius: 16,
            background: 'linear-gradient(135deg, #ffffff 0%, #F0F7EB 100%)',
            border: '1px solid #E3EED4',
            boxShadow: '0 2px 12px rgba(15, 42, 29, 0.08)',
          }}
        >
          <Statistic
            title={<span style={{ color: '#689071', fontWeight: 500 }}>👥 Пользователи</span>}
            value={totalUsers}
            valueStyle={{ color: '#0F2A1D', fontWeight: 700, fontSize: 28 }}
            prefix={<UserOutlined style={{ color: '#689071', fontSize: 20 }} />}
          />
          <div style={{ fontSize: 12, color: '#689071', marginTop: 8, fontWeight: 500 }}>
            <RiseOutlined /> ↑ {usersGrowth}% vs прошлый месяц
          </div>
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card
          className="hover-lift-green scale-in animate-delay-200"
          style={{
            borderRadius: 16,
            background: 'linear-gradient(135deg, #ffffff 0%, #F0F7EB 100%)',
            border: '1px solid #E3EED4',
            boxShadow: '0 2px 12px rgba(15, 42, 29, 0.08)',
          }}
        >
          <Statistic
            title={<span style={{ color: '#689071', fontWeight: 500 }}>🏪 Партнеры</span>}
            value={activePartners}
            valueStyle={{ color: '#0F2A1D', fontWeight: 700, fontSize: 28 }}
            prefix={<ShopOutlined style={{ color: '#689071', fontSize: 20 }} />}
          />
          <div style={{ fontSize: 12, color: '#689071', marginTop: 8, fontWeight: 500 }}>
            <RiseOutlined /> ↑ {partnersGrowth}% vs прошлый месяц
          </div>
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card
          className="hover-lift-green scale-in animate-delay-300"
          style={{
            borderRadius: 16,
            background: 'linear-gradient(135deg, #ffffff 0%, #F0F7EB 100%)',
            border: '1px solid #E3EED4',
            boxShadow: '0 2px 12px rgba(15, 42, 29, 0.08)',
          }}
        >
          <Statistic
            title={<span style={{ color: '#689071', fontWeight: 500 }}>⭐ Yess!Coin</span>}
            value={totalYessCoin}
            suffix=" млн"
            valueStyle={{ color: '#0F2A1D', fontWeight: 700, fontSize: 28 }}
            prefix={<DollarOutlined style={{ color: '#689071', fontSize: 20 }} />}
          />
          <div style={{ fontSize: 12, color: '#689071', marginTop: 8, fontWeight: 500 }}>
            <RiseOutlined /> ↑ {coinsGrowth}% vs прошлый месяц
          </div>
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card
          className="hover-lift-green scale-in animate-delay-400"
          style={{
            borderRadius: 16,
            background: 'linear-gradient(135deg, #ffffff 0%, #F0F7EB 100%)',
            border: '1px solid #E3EED4',
            boxShadow: '0 2px 12px rgba(15, 42, 29, 0.08)',
          }}
        >
          <Statistic
            title={<span style={{ color: '#689071', fontWeight: 500 }}>💳 Транзакции</span>}
            value={totalTransactions}
            valueStyle={{ color: '#0F2A1D', fontWeight: 700, fontSize: 28 }}
            prefix={<TransactionOutlined style={{ color: '#689071', fontSize: 20 }} />}
          />
          <div style={{ fontSize: 12, color: '#689071', marginTop: 8, fontWeight: 500 }}>
            <RiseOutlined /> ↑ {transactionsGrowth}% vs прошлый месяц
          </div>
        </Card>
      </Col>
    </Row>
  );
};

