import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Row, Col, Card, Statistic, Table, Tag, Calendar, Select, Space, DatePicker } from 'antd';
import {
  UserOutlined,
  ShopOutlined,
  TransactionOutlined,
  DollarOutlined,
  MoreOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { analyticsApi, transactionsApi } from '@/services/api';
import type { CalendarProps, RangePickerProps } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/ru';
import { t } from '@/i18n';
import { QuickActions } from '@/components/QuickActions';
import { RecentActivity } from '@/components/RecentActivity';
import '../styles/animations.css';

const { RangePicker } = DatePicker;

export const DashboardPage = () => {
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>(() => {
    try {
      // По умолчанию - последние 7 дней
      const end = dayjs();
      const start = end.subtract(6, 'day');
      return [start, end];
    } catch (error) {
      console.error('Error initializing date range:', error);
      // Fallback на текущую дату
      const now = dayjs();
      return [now, now];
    }
  });

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      try {
        const res = await analyticsApi.getDashboardStats();
        return res?.data || { total_users: 10325, active_partners: 750, total_transactions: 2764 };
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return { total_users: 10325, active_partners: 750, total_transactions: 2764 };
      }
    },
    retry: 1,
  });

  const { data: recentTransactions } = useQuery({
    queryKey: ['recent-transactions'],
    queryFn: async () => {
      try {
        const res = await transactionsApi.getAll({ page_size: 5 });
        return res?.data || [];
      } catch (error) {
        console.error('Error fetching recent transactions:', error);
        return [];
      }
    },
    retry: 1,
  });

  // Загрузка транзакций за выбранный период
  const dateRangeString = dateRange?.[0] && dateRange?.[1]
    ? `${dateRange[0].format('YYYY-MM-DD')}_${dateRange[1].format('YYYY-MM-DD')}`
    : 'default';
  const { data: transactionsData } = useQuery({
    queryKey: ['transactions', dateRangeString],
    queryFn: async () => {
      try {
        const response = await transactionsApi.getAll({ page_size: 1000 });
        return response?.data?.items || response?.items || [];
      } catch (error) {
        console.error('Error fetching transactions:', error);
        return [];
      }
    },
    retry: 1,
    enabled: !!(dateRange?.[0] && dateRange?.[1]),
  });

  // Данные для круговой диаграммы пользователей
  const userData = [
    { name: 'Активные', value: 176000, color: '#689071' },
    { name: 'Не активные', value: 251000, color: '#ff4d4f' },
  ];

  // Обработка данных транзакций для графика
  const transactionData = useMemo(() => {
    if (!transactionsData || !Array.isArray(transactionsData)) {
      // Fallback данные если нет реальных данных
      const days = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
      return days.map((day, index) => ({
        day,
        value: 100 + Math.random() * 60,
        date: dayjs().subtract(6 - index, 'day').format('YYYY-MM-DD'),
      }));
    }

    if (!dateRange?.[0] || !dateRange?.[1]) {
      // Fallback данные если нет выбранного периода
      const days = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
      return days.map((day, index) => ({
        day,
        value: 100 + Math.random() * 60,
        date: dayjs().subtract(6 - index, 'day').format('YYYY-MM-DD'),
      }));
    }

    try {
      const [startDate, endDate] = dateRange;
      if (!startDate?.isValid() || !endDate?.isValid()) {
        throw new Error('Invalid date range');
      }

      const daysMap = new Map<string, number>();

      // Группируем транзакции по дням
      transactionsData.forEach((transaction: any) => {
        try {
          const transactionDate = dayjs(transaction.created_at || transaction.date);
          if (transactionDate.isValid() && transactionDate.isAfter(startDate.subtract(1, 'day')) && transactionDate.isBefore(endDate.add(1, 'day'))) {
            const dateKey = transactionDate.format('YYYY-MM-DD');
            daysMap.set(dateKey, (daysMap.get(dateKey) || 0) + 1);
          }
        } catch (e) {
          // Игнорируем невалидные даты
          console.warn('Invalid transaction date:', transaction);
        }
      });

      // Создаем массив данных для графика
      const result: Array<{ day: string; value: number; date: string }> = [];
      let currentDate = startDate;
      const dayNames = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];

      while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'day')) {
        const dateKey = currentDate.format('YYYY-MM-DD');
        const dayName = dayNames[currentDate.day()];
        result.push({
          day: dayName,
          value: daysMap.get(dateKey) || 0,
          date: dateKey,
        });
        currentDate = currentDate.add(1, 'day');
      }

      return result;
    } catch (e) {
      console.error('Error processing transaction data:', e);
      // Fallback данные при ошибке
      const days = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
      return days.map((day, index) => ({
        day,
        value: 100 + Math.random() * 60,
        date: dayjs().subtract(6 - index, 'day').format('YYYY-MM-DD'),
      }));
    }
  }, [transactionsData, dateRange]);

  // Данные для графика активных пользователей
  const activeUsersData = [
    { time: '00:00', value: 120 },
    { time: '02:00', value: 180 },
    { time: '04:00', value: 150 },
    { time: '06:00', value: 200 },
    { time: '08:00', value: 250 },
    { time: '10:00', value: 300 },
    { time: '12:00', value: 280 },
    { time: '14:00', value: 320 },
    { time: '16:00', value: 290 },
    { time: '18:00', value: 270 },
    { time: '20:00', value: 240 },
    { time: '22:00', value: 200 },
  ];

  const onPanelChange: CalendarProps<Dayjs>['onPanelChange'] = (value, mode) => {
    console.log(value.format('YYYY-MM-DD'), mode);
  };

  return (
    <div className="fade-in-up">
      {/* Карточки статистики */}
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
              title={<span style={{ color: '#689071', fontWeight: 500 }}>{t('dashboard.users', 'Пользователи')}</span>}
              value={stats?.total_users || 10325}
              prefix={<UserOutlined style={{ color: '#689071', fontSize: 20 }} />}
              valueStyle={{ color: '#0F2A1D', fontWeight: 700, fontSize: 28 }}
            />
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
              title={<span style={{ color: '#689071', fontWeight: 500 }}>{t('dashboard.partners', 'Партнеры')}</span>}
              value={stats?.active_partners || 750}
              prefix={<ShopOutlined style={{ color: '#689071', fontSize: 20 }} />}
              valueStyle={{ color: '#0F2A1D', fontWeight: 700, fontSize: 28 }}
            />
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
              title={<span style={{ color: '#689071', fontWeight: 500 }}>{t('dashboard.yessCoin', 'Yess!Coin')}</span>}
              value={7400000}
              prefix={<DollarOutlined style={{ color: '#689071', fontSize: 20 }} />}
              suffix=" Yess!Coin"
              formatter={(value) => `${(Number(value) / 1000000).toFixed(1)} млн`}
              valueStyle={{ color: '#0F2A1D', fontWeight: 700, fontSize: 28 }}
            />
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
              title={<span style={{ color: '#689071', fontWeight: 500 }}>{t('dashboard.transactions', 'Транзакции')}</span>}
              value={stats?.total_transactions || 2764}
              prefix={<TransactionOutlined style={{ color: '#689071', fontSize: 20 }} />}
              valueStyle={{ color: '#0F2A1D', fontWeight: 700, fontSize: 28 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Графики */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        <Col xs={24} lg={12}>
          <Card 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: '#0F2A1D' }}>{t('dashboard.users', 'Пользователи')} ({t('dashboard.week', 'Это неделя')})</span>
              </div>
            }
            className="hover-lift-green grow"
            style={{ 
              borderRadius: 16,
              background: 'linear-gradient(135deg, #ffffff 0%, #F0F7EB 100%)',
              border: '1px solid #E3EED4',
              boxShadow: '0 2px 12px rgba(15, 42, 29, 0.08)',
            }}
          >
            <ResponsiveContainer width="100%" height={300}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="fade-in-up">
                <PieChart width={300} height={300} className="grow">
                  <Pie
                    data={userData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={800}
                    animationEasing="ease-out"
                  >
                    {userData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </div>
            </ResponsiveContainer>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff4d4f', boxShadow: '0 0 4px rgba(255, 77, 79, 0.4)' }} />
                <span style={{ color: '#0F2A1D' }}>Не активные - 251K</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#689071', boxShadow: '0 0 4px rgba(104, 144, 113, 0.4)' }} />
                <span style={{ color: '#0F2A1D' }}>Активные - 176K</span>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <span style={{ fontWeight: 600, color: '#0F2A1D' }}>
                  {t('dashboard.transactions', 'Транзакции')}
                  {dateRange?.[0] && dateRange?.[1] && (
                    <span style={{ fontSize: 14, fontWeight: 400, color: '#689071', marginLeft: 8 }}>
                      ({dateRange[0].format('DD.MM')} - {dateRange[1].format('DD.MM.YYYY')})
                    </span>
                  )}
                </span>
                {dateRange?.[0] && dateRange?.[1] && (
                  <RangePicker
                    value={dateRange}
                    onChange={(dates) => {
                      if (dates?.[0] && dates?.[1]) {
                        setDateRange([dates[0], dates[1]]);
                      }
                    }}
                    format="DD.MM.YYYY"
                    size="small"
                    style={{ width: 280 }}
                    allowClear={false}
                    maxDate={dayjs()}
                  />
                )}
              </div>
            }
            className="hover-lift-green grow"
            style={{ 
              borderRadius: 16,
              background: 'linear-gradient(135deg, #ffffff 0%, #F0F7EB 100%)',
              border: '1px solid #E3EED4',
              boxShadow: '0 2px 12px rgba(15, 42, 29, 0.08)',
            }}
          >
            {transactionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={transactionData} className="fade-in-up">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E3EED4" />
                  <XAxis 
                    dataKey="day" 
                    stroke="#689071"
                    tick={{ fill: '#689071', fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="#689071"
                    tick={{ fill: '#689071', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: 12,
                      border: '1px solid #E3EED4',
                      background: '#ffffff',
                    }}
                    formatter={(value: any, name: any, props: any) => [
                      `${value} ${t('dashboard.transactions', 'транзакций')}`,
                      props.payload.date || ''
                    ]}
                    labelFormatter={(label) => `День: ${label}`}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="url(#colorGradientTransactions)" 
                    radius={[12, 12, 0, 0]}
                    animationBegin={0}
                    animationDuration={1000}
                    animationEasing="ease-out"
                  >
                    <defs>
                      <linearGradient id="colorGradientTransactions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#689071" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#AEC380" stopOpacity={1}/>
                      </linearGradient>
                    </defs>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#689071' }}>
                <div style={{ textAlign: 'center' }}>
                  <CalendarOutlined style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }} />
                  <p>{t('dashboard.noTransactions', 'Нет данных за выбранный период')}</p>
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Активные пользователи и календарь */}
      <Row gutter={[12, 12]}>
        <Col xs={24} lg={12}>
          <Card 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span style={{ fontWeight: 600, color: '#0F2A1D' }}>{t('dashboard.activeUsers', 'Активные пользователи')}</span>
                <span style={{ fontSize: 20, fontWeight: 'bold', color: '#689071' }}>2 часа 32 мин</span>
              </div>
            }
            extra={<MoreOutlined style={{ cursor: 'pointer', color: '#689071' }} />}
            className="hover-lift-green grow"
            style={{ 
              borderRadius: 16,
              background: 'linear-gradient(135deg, #ffffff 0%, #F0F7EB 100%)',
              border: '1px solid #E3EED4',
              boxShadow: '0 2px 12px rgba(15, 42, 29, 0.08)',
            }}
          >
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={activeUsersData} className="fade-in-up">
                <defs>
                  <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#689071" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#AEC380" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3EED4" />
                <XAxis dataKey="time" stroke="#689071" />
                <YAxis stroke="#689071" />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: 12,
                    border: '1px solid #E3EED4',
                    background: '#ffffff',
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#689071" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorActive)"
                  animationBegin={0}
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card 
            className="hover-lift-green grow"
            style={{ 
              borderRadius: 16,
              background: 'linear-gradient(135deg, #ffffff 0%, #F0F7EB 100%)',
              border: '1px solid #E3EED4',
              boxShadow: '0 2px 12px rgba(15, 42, 29, 0.08)',
            }}
          >
            <Calendar 
              fullscreen={false} 
              onPanelChange={onPanelChange}
              headerRender={({ value, onChange }) => {
                if (!value) return null;
                
                const year = value.year();
                const month = value.month();
                const months = [];
                
                for (let i = 0; i < 12; i++) {
                  const monthDate = dayjs().year(year).month(i);
                  months.push({
                    value: i,
                    label: monthDate.format('MMM'),
                  });
                }

                const yearOptions = [];
                for (let i = year - 10; i < year + 10; i += 1) {
                  yearOptions.push(i);
                }
                
                return (
                  <div style={{ padding: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Select
                      size="small"
                      style={{ width: 80 }}
                      value={year}
                      onChange={(newYear) => {
                        const newValue = value.clone().year(newYear);
                        onChange(newValue);
                      }}
                      showSearch
                      filterOption={(input, option) =>
                        String(option?.value ?? '').indexOf(input) >= 0
                      }
                    >
                      {yearOptions.map((y) => (
                        <Select.Option key={y} value={y}>
                          {y}
                        </Select.Option>
                      ))}
                    </Select>
                    <Select
                      size="small"
                      style={{ width: 100 }}
                      value={month}
                      onChange={(newMonth) => {
                        const newValue = value.clone().month(newMonth);
                        onChange(newValue);
                      }}
                    >
                      {months.map((m) => (
                        <Select.Option key={m.value} value={m.value}>
                          {m.label}
                        </Select.Option>
                      ))}
                    </Select>
                  </div>
                );
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Быстрые действия и последняя активность */}
      <Row gutter={[12, 12]} style={{ marginTop: 20 }}>
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
