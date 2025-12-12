import { Card, Row, Col, Statistic, Button, Space, Tag, Spin, Empty } from 'antd';
import {
  DollarOutlined,
  LineChartOutlined,
  AreaChartOutlined,
  TrophyOutlined,
  TeamOutlined,
  RiseOutlined,
  FallOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { QuickActions } from '../components/QuickActions';
import { RecentActivity } from '../components/RecentActivity';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardApi } from '../services/api';
import { connectWebSocket, wsService } from '../services/websocket';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { t } from '@/i18n';
import { useDocumentTitle } from '@shared/hooks/useDocumentTitle';

// Цвета для графиков
const CHART_COLORS = ['#689071', '#AEC380', '#375534', '#E3EED4', '#0F2A1D'];

export const DashboardPage = () => {
  useDocumentTitle('Главная', 'YESS!GO Partner');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [chartPeriod, setChartPeriod] = useState<'7' | '30' | '90'>('7');

  // WebSocket интеграция для реал-тайм обновлений
  useEffect(() => {
    const wsEnabled = import.meta.env.VITE_WS_ENABLED !== 'false';
    if (!wsEnabled) return;

    // В production используем относительный путь, в dev - из env или localhost
    const IS_PROD = import.meta.env.PROD;
    let wsUrl: string;
    if (IS_PROD) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}/ws`;
    } else {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      wsUrl = apiUrl.replace(/^http/, 'ws') + '/ws';
    }
    
    if (!wsService.hasConnectionFailed()) {
      connectWebSocket(wsUrl);
    }
    
    const unsubscribeTransactions = wsService.on('transaction', () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['chartData'] });
    });
    
    const unsubscribePromotions = wsService.on('promotion_update', () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    });
    
    return () => {
      unsubscribeTransactions();
      unsubscribePromotions();
    };
  }, [queryClient]);

  // Загрузка статистики с оптимизированными настройками
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const response = await dashboardApi.getStats();
      return response.data;
    },
    staleTime: 60 * 1000, // 1 минута - данные считаются свежими (увеличено)
    gcTime: 5 * 60 * 1000, // 5 минут в кэше
    retry: 1,
    refetchInterval: false, // Отключаем автоматическое обновление - используем WebSocket для real-time
    refetchIntervalInBackground: false,
    refetchOnMount: false, // Не перезапрашивать при монтировании если данные свежие
    refetchOnWindowFocus: false, // Не перезапрашивать при фокусе
  });

  // Хэлпер генерации данных для графиков на основе статистики
  const generateChartData = (stats: any, days: number) => {
    let generatedSalesData: any[] = [];
    const now = new Date();

    // Используем реальные данные из API, если они есть
    if (stats?.sales_data && Array.isArray(stats.sales_data)) {
      generatedSalesData = stats.sales_data.map((item: any) => ({
        date: item.date || item.day || '',
        value: item.value || item.amount || 0,
        transactions: item.transactions || item.count || 0,
      }));
    } else {
      // Если данных нет, создаем пустой массив на нужное количество дней
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        generatedSalesData.push({
          date: date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }),
          value: 0,
          transactions: 0,
        });
      }
    }

    // Используем реальные данные категорий из API, если есть
    const generatedCategoryData = stats?.categories || [];

    return { salesData: generatedSalesData, categoryData: generatedCategoryData };
  };

  // Загрузка данных для графиков
  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ['chartData', chartPeriod],
    queryFn: async () => {
      // Backend endpoint /partner/dashboard/charts пока не реализован,
      // поэтому всегда генерируем данные локально на основе stats.
      return generateChartData(stats, parseInt(chartPeriod));
    },
    retry: 1,
    enabled: !!stats,
  });

  // Данные для графиков
  const salesData = chartData?.salesData || [];
  const processedCategoryData = (chartData?.categoryData || []).map((item: any, index: number) => ({
    ...item,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }));

  // Статистика
  const sales = stats?.total_sales || 0;
  const avgCheck = stats?.avg_check || 0;
  const coinsIssued = stats?.coins_issued || 0;
  const customers = stats?.total_customers || 0;
  const salesGrowth = stats?.sales_growth || 0;
  const checkGrowth = stats?.check_growth || 0;
  const coinsGrowth = stats?.coins_growth || 0;
  const customersGrowth = stats?.customers_growth || 0;

  // Форматирование чисел
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString('ru-RU');
  };

  // Компонент роста/падения
  const GrowthIndicator = ({ value }: { value: number }) => (
    <div style={{ 
      fontSize: 12, 
      color: value >= 0 ? '#689071' : '#ff4d4f', 
      marginTop: 8, 
      fontWeight: 500,
      display: 'flex',
      alignItems: 'center',
      gap: 4,
    }}>
      {value >= 0 ? <RiseOutlined /> : <FallOutlined />}
      {value >= 0 ? '↑' : '↓'} {Math.abs(value)}% {t('dashboard.vsLastMonth', 'vs прошлый месяц')}
    </div>
  );

  if (statsLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16, color: '#666' }}>{t('common.loading', 'Загрузка...')}</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 32,
        flexWrap: 'wrap',
        gap: 16,
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
            📊 {t('dashboard.title', 'Главная')}
          </h1>
          <p style={{ color: '#689071', margin: '8px 0 0 0', fontSize: 14, fontWeight: 500 }}>
            {t('dashboard.subtitle', 'Обзор вашей деятельности и статистика')}
          </p>
        </div>
        <Space wrap>
          <Button 
            icon={<ReloadOutlined />}
            onClick={() => {
              refetchStats();
              queryClient.invalidateQueries({ queryKey: ['chartData'] });
            }}
            style={{ borderRadius: 12, borderColor: '#689071', color: '#689071' }}
          >
            {t('common.refresh', 'Обновить')}
          </Button>
          <Button 
            type="default" 
            size="large"
            onClick={() => navigate('/transactions')}
            style={{ borderRadius: 12, borderColor: '#689071', color: '#689071' }}
          >
            📥 {t('dashboard.export', 'Экспорт')}
          </Button>
        </Space>
      </div>

      {/* Stats Cards */}
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
            }}
          >
            <Statistic
              title={<span style={{ color: '#689071', fontWeight: 500 }}>💰 {t('dashboard.sales', 'Продажи')}</span>}
              value={formatNumber(sales)}
              suffix=" сом"
              valueStyle={{ color: '#0F2A1D', fontWeight: 700, fontSize: 24 }}
              prefix={<DollarOutlined style={{ color: '#689071', fontSize: 20 }} />}
            />
            <GrowthIndicator value={salesGrowth} />
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
            }}
          >
            <Statistic
              title={<span style={{ color: '#689071', fontWeight: 500 }}>📈 {t('dashboard.avgCheck', 'Средний чек')}</span>}
              value={formatNumber(avgCheck)}
              suffix=" сом"
              valueStyle={{ color: '#0F2A1D', fontWeight: 700, fontSize: 24 }}
              prefix={<LineChartOutlined style={{ color: '#689071', fontSize: 20 }} />}
            />
            <GrowthIndicator value={checkGrowth} />
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
            }}
          >
            <Statistic
              title={<span style={{ color: '#689071', fontWeight: 500 }}>⭐ {t('dashboard.coins', 'Yess!Coin')}</span>}
              value={formatNumber(coinsIssued)}
              valueStyle={{ color: '#0F2A1D', fontWeight: 700, fontSize: 24 }}
              prefix={<TrophyOutlined style={{ color: '#689071', fontSize: 20 }} />}
            />
            <GrowthIndicator value={coinsGrowth} />
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
            }}
          >
            <Statistic
              title={<span style={{ color: '#689071', fontWeight: 500 }}>👥 {t('dashboard.customers', 'Клиенты')}</span>}
              value={formatNumber(customers)}
              valueStyle={{ color: '#0F2A1D', fontWeight: 700, fontSize: 24 }}
              prefix={<TeamOutlined style={{ color: '#689071', fontSize: 20 }} />}
            />
            <GrowthIndicator value={customersGrowth} />
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
        <Col xs={24} lg={16}>
          <Card
            title={
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AreaChartOutlined style={{ color: '#689071', fontSize: 20 }} />
                  <span style={{ fontWeight: 700, color: '#0F2A1D', fontSize: 18 }}>
                    {t('dashboard.salesChart', 'Продажи по дням')}
                  </span>
                </div>
                <Space>
                  {(['7', '30', '90'] as const).map((period) => (
                    <Tag
                      key={period}
                      color={chartPeriod === period ? '#689071' : 'default'}
                      style={{ 
                        cursor: 'pointer', 
                        fontSize: 12, 
                        padding: '4px 12px',
                        borderRadius: 8,
                      }}
                      onClick={() => setChartPeriod(period)}
                    >
                      {period === '7' ? '7 дней' : period === '30' ? '30 дней' : '90 дней'}
                    </Tag>
                  ))}
                </Space>
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
            {chartLoading ? (
              <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Spin />
              </div>
            ) : salesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={salesData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#689071" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#689071" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E3EED4" />
                  <XAxis dataKey="date" stroke="#0F2A1D" fontSize={12} />
                  <YAxis stroke="#0F2A1D" fontSize={12} tickFormatter={(v) => formatNumber(v)} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #E3EED4',
                      background: '#ffffff',
                      boxShadow: '0 4px 12px rgba(15, 42, 29, 0.15)',
                    }}
                    formatter={(value: number) => [`${formatNumber(value)} сом`, 'Продажи']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#689071" 
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorValue)"
                    dot={{ fill: '#689071', r: 4 }}
                    activeDot={{ r: 6, strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Empty description={t('common.noData', 'Нет данных')} style={{ padding: 60 }} />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrophyOutlined style={{ color: '#689071', fontSize: 20 }} />
                <span style={{ fontWeight: 700, color: '#0F2A1D', fontSize: 18 }}>
                  {t('dashboard.categories', 'По категориям')}
                </span>
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
            {processedCategoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={processedCategoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    innerRadius={40}
                    fill="#8884d8"
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {processedCategoryData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string) => [`${value}%`, name]}
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #E3EED4',
                      background: '#ffffff',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Empty description={t('common.noData', 'Нет данных')} style={{ padding: 60 }} />
            )}
          </Card>
        </Col>
      </Row>

      {/* Quick Actions & Recent Activity */}
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
