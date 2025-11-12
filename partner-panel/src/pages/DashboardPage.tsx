import { Card, Row, Col, Statistic, Button, Space, Progress, Tag, Spin, message } from 'antd';
import {
  DollarOutlined,
  LineChartOutlined,
  PlusOutlined,
  UserAddOutlined,
  AreaChartOutlined,
  TrophyOutlined,
  TeamOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { QuickActions } from '../components/QuickActions';
import { RecentActivity } from '../components/RecentActivity';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../services/api';

const salesData = [
  { date: '29 май', value: 220342.76 },
  { date: '30 май', value: 180234.12 },
  { date: '31 май', value: 250123.45 },
  { date: '1 июн', value: 210456.78 },
  { date: '2 июн', value: 190234.56 },
  { date: '3 июн', value: 230567.89 },
  { date: '4 июн', value: 245890.12 },
];

const categoryData = [
  { name: 'Продукты', value: 35, color: '#689071' },
  { name: 'Кафе', value: 25, color: '#AEC380' },
  { name: 'Одежда', value: 20, color: '#375534' },
  { name: 'Другое', value: 20, color: '#E3EED4' },
];

export const DashboardPage = () => {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      try {
        const response = await dashboardApi.getStats();
        return response.data;
      } catch (err: any) {
        // Если API недоступен, используем моковые данные
        console.warn('Dashboard API недоступен, используем моковые данные:', err);
        return null;
      }
    },
    retry: 1,
    refetchInterval: 30000, // Обновляем каждые 30 секунд
  });

  // Используем реальные данные или моковые
  const sales = stats?.total_sales || 10325;
  const avgCheck = stats?.avg_check || 750;
  const coinsIssued = stats?.coins_issued || 6.4;
  const customers = stats?.total_customers || 1248;
  const salesGrowth = stats?.sales_growth || 12;
  const checkGrowth = stats?.check_growth || 8;
  const coinsGrowth = stats?.coins_growth || 24;
  const customersGrowth = stats?.customers_growth || 15;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 32 
      }}>
        <div>
          <h1 style={{ 
            fontSize: 32, 
            fontWeight: 700, 
            margin: 0, 
            color: '#0F2A1D', 
            background: 'linear-gradient(135deg, #0F2A1D 0%, #689071 100%)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent', 
            backgroundClip: 'text' 
          }}>
            📊 Главная
          </h1>
          <p style={{ color: '#689071', margin: '8px 0 0 0', fontSize: 14, fontWeight: 500 }}>
            Обзор вашей деятельности и статистика
          </p>
        </div>
        <Space>
          <Button 
            type="default" 
            size="large"
            style={{
              borderRadius: 12,
              borderColor: '#689071',
              color: '#689071',
            }}
          >
            📥 Экспорт
          </Button>
        </Space>
      </div>

      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card
            hoverable
            className="hover-lift-green scale-in animate-delay-100"
            style={{
              borderRadius: 16,
              background: 'linear-gradient(135deg, #ffffff 0%, #F0F7EB 100%)',
              border: '1px solid #E3EED4',
              boxShadow: '0 2px 12px rgba(15, 42, 29, 0.08)',
              transition: 'all 0.3s',
            }}
          >
            <Statistic
              title={<span style={{ color: '#689071', fontWeight: 500 }}>💰 Продажи</span>}
              value={sales}
              suffix=" сом"
              valueStyle={{ color: '#0F2A1D', fontWeight: 700, fontSize: 28 }}
              prefix={<DollarOutlined style={{ color: '#689071', fontSize: 20 }} />}
            />
            <div style={{ fontSize: 12, color: '#689071', marginTop: 8, fontWeight: 500 }}>
              <RiseOutlined /> ↑ {salesGrowth}% vs прошлый месяц
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            hoverable
            className="hover-lift-green scale-in animate-delay-200"
            style={{
              borderRadius: 16,
              background: 'linear-gradient(135deg, #ffffff 0%, #F0F7EB 100%)',
              border: '1px solid #E3EED4',
              boxShadow: '0 2px 12px rgba(15, 42, 29, 0.08)',
              transition: 'all 0.3s',
            }}
          >
            <Statistic
              title={<span style={{ color: '#689071', fontWeight: 500 }}>📈 Средний чек</span>}
              value={avgCheck}
              suffix=" сом"
              valueStyle={{ color: '#0F2A1D', fontWeight: 700, fontSize: 28 }}
              prefix={<LineChartOutlined style={{ color: '#689071', fontSize: 20 }} />}
            />
            <div style={{ fontSize: 12, color: '#689071', marginTop: 8, fontWeight: 500 }}>
              <RiseOutlined /> ↑ {checkGrowth}% vs прошлый месяц
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            hoverable
            className="hover-lift-green scale-in animate-delay-300"
            style={{
              borderRadius: 16,
              background: 'linear-gradient(135deg, #ffffff 0%, #F0F7EB 100%)',
              border: '1px solid #E3EED4',
              boxShadow: '0 2px 12px rgba(15, 42, 29, 0.08)',
              transition: 'all 0.3s',
            }}
          >
            <Statistic
              title={<span style={{ color: '#689071', fontWeight: 500 }}>⭐ Начислено Yess!Coin</span>}
              value={coinsIssued}
              suffix=" млн"
              valueStyle={{ color: '#0F2A1D', fontWeight: 700, fontSize: 28 }}
              prefix={<TrophyOutlined style={{ color: '#689071', fontSize: 20 }} />}
            />
            <div style={{ fontSize: 12, color: '#689071', marginTop: 8, fontWeight: 500 }}>
              <RiseOutlined /> ↑ {coinsGrowth}% vs прошлый месяц
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            hoverable
            className="hover-lift-green scale-in animate-delay-400"
            style={{
              borderRadius: 16,
              background: 'linear-gradient(135deg, #ffffff 0%, #F0F7EB 100%)',
              border: '1px solid #E3EED4',
              boxShadow: '0 2px 12px rgba(15, 42, 29, 0.08)',
              transition: 'all 0.3s',
            }}
          >
            <Statistic
              title={<span style={{ color: '#689071', fontWeight: 500 }}>👥 Клиенты</span>}
              value={customers}
              valueStyle={{ color: '#0F2A1D', fontWeight: 700, fontSize: 28 }}
              prefix={<TeamOutlined style={{ color: '#689071', fontSize: 20 }} />}
            />
            <div style={{ fontSize: 12, color: '#689071', marginTop: 8, fontWeight: 500 }}>
              <RiseOutlined /> ↑ {customersGrowth}% vs прошлый месяц
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
        <Col xs={24} lg={16}>
          <Card
            title={
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                gap: 16
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AreaChartOutlined style={{ color: '#689071', fontSize: 20 }} />
                  <span style={{ fontWeight: 700, color: '#0F2A1D', fontSize: 18 }}>Продажи по дням</span>
                </div>
                <Tag color="#689071" style={{ fontSize: 14, padding: '4px 12px' }}>
                  Последние 7 дней
                </Tag>
              </div>
            }
            style={{
              borderRadius: 16,
              background: 'linear-gradient(135deg, #ffffff 0%, #F0F7EB 100%)',
              border: '1px solid #E3EED4',
              marginBottom: 32,
              boxShadow: '0 2px 12px rgba(15, 42, 29, 0.08)',
            }}
            className="hover-lift-green"
          >
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={salesData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#689071" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#689071" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3EED4" />
                <XAxis dataKey="date" stroke="#0F2A1D" />
                <YAxis stroke="#0F2A1D" />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #E3EED4',
                    background: '#ffffff',
                    boxShadow: '0 4px 12px rgba(15, 42, 29, 0.15)',
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#689071" 
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorValue)"
                  dot={{ fill: '#689071', r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrophyOutlined style={{ color: '#689071', fontSize: 20 }} />
                <span style={{ fontWeight: 700, color: '#0F2A1D', fontSize: 18 }}>По категориям</span>
              </div>
            }
            style={{
              borderRadius: 16,
              background: 'linear-gradient(135deg, #ffffff 0%, #F0F7EB 100%)',
              border: '1px solid #E3EED4',
              boxShadow: '0 2px 12px rgba(15, 42, 29, 0.08)',
            }}
            className="hover-lift-green"
          >
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
        <Col xs={24} lg={16}>
          <QuickActions />
        </Col>
        <Col xs={24} lg={8}>
          <RecentActivity />
        </Col>
      </Row>
    </div>
  );
};
