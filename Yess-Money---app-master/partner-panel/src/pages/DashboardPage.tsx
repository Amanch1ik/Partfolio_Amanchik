import { Card, Row, Col, Statistic, Button, Space } from 'antd';
import {
  ShoppingCartOutlined,
  DollarOutlined,
  LineChartOutlined,
  PlusOutlined,
  UserAddOutlined,
  AreaChartOutlined,
} from '@ant-design/icons';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const salesData = [
  { date: '29 май', value: 220342.76 },
  { date: '30 май', value: 180234.12 },
  { date: '31 май', value: 250123.45 },
  { date: '1 июн', value: 210456.78 },
  { date: '2 июн', value: 190234.56 },
];

export const DashboardPage = () => {
  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 32 
      }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0, color: '#8B4513' }}>
          📊 Главная
        </h1>
        <Space>
          <Button type="default" size="large">Экспорт</Button>
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
        <Col xs={24} sm={8}>
          <Card
            hoverable
            style={{
              borderRadius: 16,
              background: 'linear-gradient(135deg, #ffffff 0%, #FFF4E6 100%)',
              border: '2px solid #F7B731',
              boxShadow: '0 4px 12px rgba(245, 166, 35, 0.15)',
              transition: 'all 0.3s',
            }}
          >
            <Statistic
              title={<span style={{ color: '#F5A623', fontWeight: 600 }}>💰 Продажи</span>}
              value={10325}
              suffix=" ₽"
              valueStyle={{ color: '#8B4513', fontWeight: 700, fontSize: 32 }}
            />
            <div style={{ fontSize: 12, color: '#F5A623', marginTop: 8 }}>↑ 12% vs прошлый месяц</div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card
            hoverable
            style={{
              borderRadius: 16,
              background: 'linear-gradient(135deg, #ffffff 0%, #FFF4E6 100%)',
              border: '2px solid #F7B731',
              boxShadow: '0 4px 12px rgba(245, 166, 35, 0.15)',
              transition: 'all 0.3s',
            }}
          >
            <Statistic
              title={<span style={{ color: '#F5A623', fontWeight: 600 }}>📈 Средний чек</span>}
              value={750}
              suffix=" ₽"
              valueStyle={{ color: '#8B4513', fontWeight: 700, fontSize: 32 }}
            />
            <div style={{ fontSize: 12, color: '#F5A623', marginTop: 8 }}>↑ 8% vs прошлый месяц</div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card
            hoverable
            style={{
              borderRadius: 16,
              background: 'linear-gradient(135deg, #ffffff 0%, #FFF4E6 100%)',
              border: '2px solid #F7B731',
              boxShadow: '0 4px 12px rgba(245, 166, 35, 0.15)',
              transition: 'all 0.3s',
            }}
          >
            <Statistic
              title={<span style={{ color: '#F5A623', fontWeight: 600 }}>⭐ Начислено Coin</span>}
              value={6.4}
              suffix=" млн"
              valueStyle={{ color: '#8B4513', fontWeight: 700, fontSize: 32 }}
            />
            <div style={{ fontSize: 12, color: '#F5A623', marginTop: 8 }}>↑ 24% vs прошлый месяц</div>
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            gap: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AreaChartOutlined style={{ color: '#F5A623', fontSize: 20 }} />
              <span style={{ fontWeight: 700, color: '#8B4513', fontSize: 18 }}>Продажи по дням</span>
            </div>
            <span style={{ fontSize: 24, fontWeight: 700, color: '#F5A623' }}>128,7K ₽</span>
          </div>
        }
        style={{
          borderRadius: 16,
          background: 'linear-gradient(135deg, #ffffff 0%, #FFF4E6 100%)',
          border: '1px solid #FFE6CC',
          marginBottom: 32,
          boxShadow: '0 2px 12px rgba(245, 166, 35, 0.08)',
        }}
      >
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={salesData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F5A623" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#F5A623" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#FFE6CC" />
            <XAxis dataKey="date" stroke="#8B4513" />
            <YAxis stroke="#8B4513" />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: '1px solid #FFE6CC',
                background: '#ffffff',
                boxShadow: '0 4px 12px rgba(245, 166, 35, 0.2)',
              }}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="#F5A623" 
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorValue)"
              dot={{ fill: '#F5A623', r: 5 }}
              activeDot={{ r: 7 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            style={{
              width: '100%',
              height: 60,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #F5A623 0%, #F7B731 100%)',
              border: 'none',
              fontSize: 16,
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(245, 166, 35, 0.3)',
            }}
          >
            ➕ Создать акцию
          </Button>
        </Col>
        <Col xs={24} sm={12}>
          <Button
            type="primary"
            size="large"
            icon={<UserAddOutlined />}
            style={{
              width: '100%',
              height: 60,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #F5A623 0%, #F7B731 100%)',
              border: 'none',
              fontSize: 16,
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(245, 166, 35, 0.3)',
            }}
          >
            👥 Добавить сотрудника
          </Button>
        </Col>
      </Row>
    </div>
  );
};

