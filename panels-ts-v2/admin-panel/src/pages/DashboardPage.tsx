import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Row, Col, Card, Statistic, Table, Tag, Calendar, Select, Space, DatePicker, Button, Dropdown } from 'antd';
import {
  UserOutlined,
  ShopOutlined,
  TransactionOutlined,
  DollarOutlined,
  MoreOutlined,
  CalendarOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
} from '@ant-design/icons';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts';
import { toArray } from '../utils/arrayUtils';
import { analyticsApi, transactionsApi } from '@/services/api';
import type { CalendarProps } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { t } from '@/i18n';
import { formatDate } from '@/utils/dateUtils';
import { QuickActions } from '@/components/QuickActions';
import { RecentActivity } from '@/components/RecentActivity';
import { connectWebSocket, wsService } from '@/services/websocket';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/hooks/useToast';
import { useDocumentTitle } from '@shared/hooks/useDocumentTitle';
import '../styles/animations.css';

const { RangePicker } = DatePicker;

export const DashboardPage = () => {
  useDocumentTitle('Главная', 'YESS!GO Admin');
  const queryClient = useQueryClient();
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

  // WebSocket интеграция для реал-тайм обновлений
  useEffect(() => {
    // Проверяем, включен ли WebSocket
    const wsEnabled = import.meta.env.VITE_WS_ENABLED !== 'false';
    if (!wsEnabled) {
      return;
    }

    // Подключаемся к WebSocket только один раз при монтировании компонента
    connectWebSocket();

    // Подписка на обновления транзакций
    const unsubscribeTransactions = wsService.on('transaction', (data) => {
      // Обновляем кэш транзакций при получении новых данных
      queryClient.invalidateQueries({ queryKey: ['recent-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    });

    // Подписка на обновления пользователей
    const unsubscribeUsers = wsService.on('user_update', (data) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    });

    // Подписка на обновления партнеров
    const unsubscribePartners = wsService.on('partner_update', (data) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    });

    // Подписка на уведомления
    const unsubscribeNotifications = wsService.on('notification', (data) => {
      // Можно показать уведомление пользователю
      console.log('New notification:', data);
    });

    // Функция очистки при размонтировании компонента
    return () => {
      unsubscribeTransactions();
      unsubscribeUsers();
      unsubscribePartners();
      unsubscribeNotifications();
      // Не отключаем WebSocket полностью, так как он может использоваться другими компонентами
    };
  }, [queryClient]); // Зависимость от queryClient

  const toast = useToast();
  
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['dashboard-stats', dateRange],
    queryFn: async () => {
      try {
        const res = await analyticsApi.getDashboardStats();
        return res?.data || null;
      } catch (error: any) {
        // Логируем детали ошибки для отладки
        console.error('Dashboard stats error:', error);
        if (error?.response?.status === 500) {
          toast.error('Ошибка сервера при загрузке статистики. Проверьте логи бэкенда.', {
            duration: 5,
            description: 'Возможно, требуется перезапуск бэкенда после обновления кода.',
          });
        }
        throw error;
      }
    },
    retry: 2,
    retryDelay: 2000,
    refetchInterval: 30000, // Обновление каждые 30 секунд
  });

  const { data: recentTransactions } = useQuery({
    queryKey: ['recent-transactions'],
    queryFn: async () => {
      try {
        const res = await transactionsApi.getAll(1, 5);
        const payload: any = (res as any)?.data ?? res;
        return payload?.items ?? payload ?? [];
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
        const response = await transactionsApi.getAll(1, 1000);
        const payload: any = (response as any)?.data ?? response;
        const rawArray = payload?.items ?? payload ?? [];
        return toArray<any>(rawArray, []);
      } catch (error) {
        console.error('Error fetching transactions:', error);
        return [];
      }
    },
    retry: 1,
    enabled: !!(dateRange?.[0] && dateRange?.[1]),
  });

  // Данные для круговой диаграммы пользователей из API
  const userData = useMemo(() => {
    if (!stats) return [];
    const active = stats.active_users || 0;
    const inactive = (stats.total_users || 0) - active;
    if (active === 0 && inactive === 0) return [];
    return [
      { name: t('users.active', 'Активные'), value: active, color: 'var(--color-primary)' },
      { name: t('users.inactive', 'Не активные'), value: inactive, color: 'var(--color-error)' },
    ];
  }, [stats]);

  // Обработка данных транзакций для графика
  const transactionData = useMemo(() => {
    if (!transactionsData || !Array.isArray(transactionsData) || !dateRange?.[0] || !dateRange?.[1]) {
      return [];
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
      const result: Array<{ day: string; value: number; date: string; dateLabel: string }> = [];
      let currentDate = startDate;

      while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'day')) {
        const dateKey = currentDate.format('YYYY-MM-DD');
        const dayName = currentDate.format('dd');
        result.push({
          day: dayName,
          value: daysMap.get(dateKey) || 0,
          date: dateKey,
          dateLabel: formatDate(currentDate.toDate()),
        });
        currentDate = currentDate.add(1, 'day');
      }

      return result;
    } catch (e) {
      console.error('Error processing transaction data:', e);
      return [];
    }
  }, [transactionsData, dateRange]);

  // Данные для графика активных пользователей из API
  const activeUsersData = useMemo(() => {
    if (!stats?.active_users_by_hour || !Array.isArray(stats.active_users_by_hour)) {
      return [];
    }
    return stats.active_users_by_hour.map((item: any) => ({
      time: item.hour || item.time || '00:00',
      value: item.count || item.value || 0,
    }));
  }, [stats]);

  const onPanelChange: CalendarProps<Dayjs>['onPanelChange'] = (value, mode) => {
    console.log(value.format('YYYY-MM-DD'), mode);
  };

  // Функция экспорта данных
  const handleExport = (format: 'csv' | 'pdf') => {
    if (!stats) {
      toast.warning('Нет данных для экспорта');
      return;
    }

    if (format === 'csv') {
      const csvContent = [
        ['Показатель', 'Значение'],
        ['Пользователи', stats.total_users || 0],
        ['Партнеры', stats.active_partners || 0],
        ['Транзакции', stats.total_transactions || 0],
        ['Выручка', stats.total_revenue || 0],
        ['Yess!Coin', stats.total_yess_coin || 0],
      ]
        .map(row => row.join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `dashboard-stats-${dayjs().format('YYYY-MM-DD')}.csv`;
      link.click();
      toast.success('Данные экспортированы в CSV');
    } else {
      toast.info('Экспорт в PDF будет доступен в следующей версии');
    }
  };

  // Обработка ошибок
  if (statsError) {
    const errorMessage = statsError instanceof Error 
      ? statsError.message 
      : String(statsError);
    
    // Проверяем, не связана ли ошибка с DateTime
    const isDateTimeError = errorMessage.includes('DateTime') || 
                           errorMessage.includes('timestamp') ||
                           (statsError as any)?.response?.status === 500;
    
    return (
      <ErrorDisplay
        error={errorMessage}
        title={isDateTimeError 
          ? "Ошибка сервера (проблема с датами)" 
          : "Ошибка загрузки данных дашборда"}
        subTitle={isDateTimeError 
          ? "Бэкенд возвращает ошибку 500. Убедитесь, что исправления DateTime применены и бэкенд перезапущен." 
          : undefined}
        onRetry={() => {
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          toast.info('Повторная попытка загрузки данных...');
        }}
      />
    );
  }

  // Состояние загрузки
  if (statsLoading && !stats) {
    return <SkeletonLoader type="dashboard" />;
  }

  // Пустое состояние
  if (!stats) {
    return <EmptyState type="no-data" title="Нет данных" description="Данные дашборда пока недоступны" />;
  }

  return (
    <div className="fade-in-up">
      {/* Заголовок с фильтрами и экспортом */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20, alignItems: 'center' }}>
        <Col xs={24} sm={12} md={8}>
          <RangePicker
            value={dateRange}
            onChange={(dates) => {
              if (dates) {
                setDateRange([dates[0]!, dates[1]!]);
              }
            }}
            style={{ width: '100%' }}
            format="DD.MM.YYYY"
          />
        </Col>
        <Col xs={24} sm={12} md={16} style={{ textAlign: 'right' }}>
          <Space>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'csv',
                    label: 'Экспорт в CSV',
                    icon: <FileExcelOutlined />,
                    onClick: () => handleExport('csv'),
                  },
                  {
                    key: 'pdf',
                    label: 'Экспорт в PDF',
                    icon: <FilePdfOutlined />,
                    onClick: () => handleExport('pdf'),
                  },
                ],
              }}
            >
              <Button icon={<DownloadOutlined />} size="large">
                Экспорт данных
              </Button>
            </Dropdown>
          </Space>
        </Col>
      </Row>

      {/* Карточки статистики */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card 
            className="hover-lift-green scale-in animate-delay-100"
            style={{ 
              borderRadius: 16,
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <Statistic
              title={<span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>{t('dashboard.users', 'Пользователи')}</span>}
              value={stats?.total_users || 0}
              prefix={<UserOutlined style={{ color: 'var(--color-primary)', fontSize: 20 }} />}
              valueStyle={{ color: 'var(--color-text-primary)', fontWeight: 700, fontSize: 28 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card 
            className="hover-lift-green scale-in animate-delay-200"
            style={{ 
              borderRadius: 16,
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <Statistic
              title={<span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>{t('dashboard.partners', 'Партнеры')}</span>}
              value={stats?.active_partners || stats?.total_partners || 0}
              prefix={<ShopOutlined style={{ color: 'var(--color-primary)', fontSize: 20 }} />}
              valueStyle={{ color: 'var(--color-text-primary)', fontWeight: 700, fontSize: 28 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card 
            className="hover-lift-green scale-in animate-delay-300"
            style={{ 
              borderRadius: 16,
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <Statistic
              title={<span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>{t('dashboard.yessCoin', 'Yess!Coin')}</span>}
              value={stats?.total_yess_coin || 0}
              prefix={<DollarOutlined style={{ color: 'var(--color-primary)', fontSize: 20 }} />}
              suffix=" Yess!Coin"
              formatter={(value) => {
                const num = Number(value);
                if (num >= 1000000) {
                  return `${(num / 1000000).toFixed(1)} млн`;
                }
                return num.toLocaleString();
              }}
              valueStyle={{ color: 'var(--color-text-primary)', fontWeight: 700, fontSize: 28 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card 
            className="hover-lift-green scale-in animate-delay-400"
            style={{ 
              borderRadius: 16,
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <Statistic
              title={<span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>{t('dashboard.transactions', 'Транзакции')}</span>}
              value={stats?.total_transactions || 0}
              prefix={<TransactionOutlined style={{ color: 'var(--color-primary)', fontSize: 20 }} />}
              valueStyle={{ color: 'var(--color-text-primary)', fontWeight: 700, fontSize: 28 }}
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
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{t('dashboard.users', 'Пользователи')} ({t('dashboard.week', 'Это неделя')})</span>
              </div>
            }
            className="hover-lift-green grow"
            style={{ 
              borderRadius: 16,
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            {userData.length > 0 ? (
              <>
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
                  {userData.map((entry) => (
                    <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: entry.color, boxShadow: `0 0 4px ${entry.color}40` }} />
                      <span style={{ color: 'var(--color-text-primary)' }}>
                        {entry.name} - {entry.value >= 1000 ? `${(entry.value / 1000).toFixed(0)}K` : entry.value}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}>
                <div style={{ textAlign: 'center' }}>
                  <UserOutlined style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }} />
                  <p>{t('dashboard.noUsers', 'Нет данных о пользователях')}</p>
                </div>
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {t('dashboard.transactions', 'Транзакции')}
                  {dateRange?.[0] && dateRange?.[1] && (
                    <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--color-text-secondary)', marginLeft: 8 }}>
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
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            {transactionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={transactionData} className="fade-in-up">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis 
                    dataKey="day" 
                    stroke="var(--color-primary)"
                    tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="var(--color-primary)"
                    tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: 12,
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-bg-primary)',
                    }}
                    formatter={(value: any, name: any, props: any) => [
                      `${value} ${t('dashboard.transactions', 'транзакций')}`,
                      props.payload.dateLabel || props.payload.date || ''
                    ]}
                    labelFormatter={(label) => `${t('dashboard.day', 'День')}: ${label}`}
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
                        <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={1}/>
                        <stop offset="100%" stopColor="var(--color-primary-light)" stopOpacity={1}/>
                      </linearGradient>
                    </defs>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}>
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
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{t('dashboard.activeUsers', 'Активные пользователи')}</span>
                {stats?.active_users && (
                  <span style={{ fontSize: 20, fontWeight: 'bold', color: 'var(--color-text-secondary)' }}>
                    {stats.active_users.toLocaleString()}
                  </span>
                )}
              </div>
            }
            extra={<MoreOutlined style={{ cursor: 'pointer', color: 'var(--color-primary)' }} />}
            className="hover-lift-green grow"
            style={{ 
              borderRadius: 16,
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            {activeUsersData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={activeUsersData} className="fade-in-up">
                    <defs>
                    <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--color-primary-light)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="time" stroke="var(--color-primary)" tick={{ fill: 'var(--color-text-secondary)' }} />
                  <YAxis stroke="var(--color-primary)" tick={{ fill: 'var(--color-text-secondary)' }} />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: 12,
                      border: '1px solid var(--color-border)',
                      background: 'var(--chart-tooltip-bg)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="var(--color-primary)" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorActive)"
                    animationBegin={0}
                    animationDuration={1200}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}>
                <div style={{ textAlign: 'center' }}>
                  <UserOutlined style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }} />
                  <p>{t('dashboard.noActiveUsers', 'Нет данных об активных пользователях')}</p>
                </div>
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card 
            className="hover-lift-green grow"
            style={{ 
              borderRadius: 16,
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              boxShadow: 'var(--card-shadow)',
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
