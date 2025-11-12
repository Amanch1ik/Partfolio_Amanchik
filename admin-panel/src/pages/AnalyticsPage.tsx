import { useQuery } from '@tanstack/react-query';
import { Row, Col, Card, Statistic, Select, DatePicker } from 'antd';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { analyticsApi } from '@/services/api';
import { useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import type { RangePickerProps } from 'antd/es/date-picker';

const { RangePicker } = DatePicker;

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export const AnalyticsPage = () => {
  const [period, setPeriod] = useState('month');
  const [datePickerMode, setDatePickerMode] = useState<'date' | 'month' | 'year'>('date');

  const { data: stats } = useQuery({
    queryKey: ['analytics-stats'],
    queryFn: () => analyticsApi.getDashboardStats().then(res => res.data),
  });

  const mockUsersByCity = [
    { name: 'Бишкек', value: 4500 },
    { name: 'Ош', value: 1200 },
    { name: 'Джалал-Абад', value: 800 },
    { name: 'Каракол', value: 450 },
    { name: 'Токмок', value: 350 },
  ];

  const mockTransactionTypes = [
    { name: 'Пополнение', value: 5200 },
    { name: 'Покупки', value: 3800 },
    { name: 'Бонусы', value: 1200 },
    { name: 'Возвраты', value: 320 },
  ];

  const mockRevenueTrend = [
    { date: '01.11', revenue: 125000, transactions: 340 },
    { date: '08.11', revenue: 142000, transactions: 420 },
    { date: '15.11', revenue: 158000, transactions: 480 },
    { date: '22.11', revenue: 175000, transactions: 550 },
    { date: '29.11', revenue: 192000, transactions: 620 },
  ];

  const mockPartnerPerformance = [
    { name: 'Супермаркет А', orders: 245, revenue: 78000 },
    { name: 'Кафе Б', orders: 189, revenue: 52000 },
    { name: 'Магазин В', orders: 156, revenue: 45000 },
    { name: 'Ресторан Г', orders: 134, revenue: 41000 },
    { name: 'Салон Д', orders: 98, revenue: 28000 },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between' }}>
        <h2>Аналитика и отчеты</h2>
        <div style={{ display: 'flex', gap: 16 }}>
          <Select
            value={period}
            onChange={(value) => {
              setPeriod(value);
              if (value === 'year') {
                setDatePickerMode('year');
              } else if (value === 'quarter' || value === 'month') {
                setDatePickerMode('month');
              } else {
                setDatePickerMode('date');
              }
            }}
            style={{ width: 150 }}
            options={[
              { label: 'Неделя', value: 'week' },
              { label: 'Месяц', value: 'month' },
              { label: 'Квартал', value: 'quarter' },
              { label: 'Год', value: 'year' },
            ]}
          />
          <RangePicker
            defaultValue={[dayjs().subtract(30, 'days'), dayjs()]}
            format={datePickerMode === 'year' ? 'YYYY' : datePickerMode === 'month' ? 'MM.YYYY' : 'DD.MM.YYYY'}
            picker={datePickerMode}
            showTime={false}
          />
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Средний чек"
              value={stats?.average_order || 0}
              suffix="сом"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Конверсия"
              value={stats?.conversion_rate || 0}
              suffix="%"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Retention"
              value={stats?.retention_rate || 0}
              suffix="%"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="LTV"
              value={stats?.lifetime_value || 0}
              suffix="сом"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <Card title="Динамика оборота и транзакций">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={mockRevenueTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8884d8"
                  strokeWidth={2}
                  name="Оборот (сом)"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="transactions"
                  stroke="#82ca9d"
                  strokeWidth={2}
                  name="Транзакции"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Распределение пользователей">
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={mockUsersByCity}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => `${entry.name}: ${entry.value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {mockUsersByCity.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Топ партнеров">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mockPartnerPerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Legend />
                <Bar dataKey="orders" fill="#8884d8" name="Заказы" />
                <Bar dataKey="revenue" fill="#82ca9d" name="Оборот (сом)" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Типы транзакций">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={mockTransactionTypes}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {mockTransactionTypes.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </div>
  );
};
