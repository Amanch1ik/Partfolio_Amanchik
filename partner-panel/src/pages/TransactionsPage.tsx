import { useState } from 'react';
import { Card, Table, Tag, Button, Space, Select, Input, DatePicker, Spin, message } from 'antd';
import { PlusOutlined, DownloadOutlined } from '@ant-design/icons';
import { DeleteButton } from '../components/DeleteButton';
import { useQuery } from '@tanstack/react-query';
import { transactionsApi } from '../services/api';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';

const { RangePicker } = DatePicker;

const transactionsData = [
  {
    key: '1',
    date: '20.10.2025 14:29',
    user: { name: 'Peter Taylor', avatar: null },
    partner: { name: 'Глобус', logo: 'Fresh' },
    amount: 2000,
    type: 'Начисление',
    status: 'Успешно',
  },
  {
    key: '2',
    date: '20.10.2025 14:29',
    user: { name: 'Szekeres Dalma', avatar: null },
    partner: { name: 'Глобус', logo: 'Supermarket' },
    amount: -200,
    type: 'Начисление',
    status: 'Успешно',
  },
  {
    key: '3',
    date: '20.10.2025 14:29',
    user: { name: 'Peter Taylor', avatar: null },
    partner: { name: 'Глобус', logo: 'Dover' },
    amount: 15000,
    type: 'На проверке',
    status: 'Успешно',
  },
  {
    key: '4',
    date: '20.10.2025 14:29',
    user: { name: 'Szekeres Dalma', avatar: null },
    partner: { name: 'Глобус', logo: 'Fresh' },
    amount: 490,
    type: 'Начисление',
    status: 'Успешно',
  },
  {
    key: '5',
    date: '20.10.2025 14:29',
    user: { name: 'Peter Taylor', avatar: null },
    partner: { name: 'Глобус', logo: 'Supermarket' },
    amount: -2000,
    type: 'Начисление',
    status: 'Успешно',
  },
];

export const TransactionsPage = () => {
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  // Загрузка транзакций из API
  const { data: transactionsResponse, isLoading } = useQuery({
    queryKey: ['transactions', dateRange],
    queryFn: async () => {
      try {
        const params: any = {};
        if (dateRange) {
          params.start_date = dateRange[0].format('YYYY-MM-DD');
          params.end_date = dateRange[1].format('YYYY-MM-DD');
        }
        const response = await transactionsApi.getTransactions(params);
        return response.data;
      } catch (err: any) {
        console.warn('Transactions API недоступен, используем моковые данные:', err);
        return transactionsData;
      }
    },
    retry: 1,
  });

  // Используем данные из API или моковые
  const allTransactions = transactionsResponse || transactionsData;

  const handleExport = () => {
    message.info('Функция экспорта будет доступна в следующей версии');
  };

  const columns = [
    {
      title: 'Дата',
      dataIndex: 'date',
      key: 'date',
      sorter: true,
    },
    {
      title: 'Пользователь',
      key: 'user',
      sorter: true,
      render: (_: any, record: any) => (
        <Space>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: '#689071',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 600,
            }}
          >
            {record.user.name.charAt(0)}
          </div>
          <span>{record.user.name}</span>
        </Space>
      ),
    },
    {
      title: 'Партнер',
      key: 'partner',
      sorter: true,
      render: (_: any, record: any) => (
        <Space>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 4,
              background: '#F0F7EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#689071',
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            {record.partner.logo.charAt(0)}
          </div>
          <span>{record.partner.name}</span>
        </Space>
      ),
    },
    {
      title: 'Сумма',
      dataIndex: 'amount',
      key: 'amount',
      sorter: true,
      render: (amount: number) => (
        <span style={{ color: amount > 0 ? '#689071' : '#ff4d4f', fontWeight: 600 }}>
          {amount > 0 ? '+' : ''}{amount.toLocaleString()} Yess!Coin
        </span>
      ),
    },
    {
      title: 'Тип',
      dataIndex: 'type',
      key: 'type',
      sorter: true,
      render: (type: string) => (
        <Tag color={type === 'Начисление' ? 'green' : 'blue'}>{type}</Tag>
      ),
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      sorter: true,
      render: (status: string) => (
        <Tag color="green">{status}</Tag>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0, color: '#0F2A1D', background: 'linear-gradient(135deg, #0F2A1D 0%, #689071 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          💳 Транзакции
        </h1>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={handleExport}
          style={{
            background: 'linear-gradient(135deg, #689071 0%, #AEC380 100%)',
            border: 'none',
            borderRadius: 12,
            height: 40,
            fontWeight: 600,
          }}
        >
          Скачать отчет
        </Button>
      </div>

      <Card
        style={{
          borderRadius: 16,
          background: 'linear-gradient(135deg, #ffffff 0%, #F0F7EB 100%)',
          border: '1px solid #E3EED4',
          marginBottom: 16,
          boxShadow: '0 2px 12px rgba(15, 42, 29, 0.08)',
        }}
      >
        <Space wrap style={{ width: '100%' }}>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
            format="DD.MM.YYYY"
            style={{ borderRadius: 12 }}
          />
          <Select
            defaultValue="Начисление"
            style={{ width: 200, borderRadius: 12 }}
            options={[
              { label: 'Начисление', value: 'Начисление' },
              { label: 'Списание', value: 'Списание' },
            ]}
          />
          <Select
            defaultValue="Супермаркет №1"
            style={{ width: 200, borderRadius: 12 }}
            options={[
              { label: 'Супермаркет №1', value: 'Супермаркет №1' },
            ]}
          />
          <Input
            placeholder="Сотрудник"
            defaultValue="Актан Ж."
            style={{ width: 200, borderRadius: 12 }}
          />
        </Space>
      </Card>

      <Card
        style={{
          borderRadius: 16,
          background: 'linear-gradient(135deg, #ffffff 0%, #F0F7EB 100%)',
          border: '1px solid #E3EED4',
          boxShadow: '0 2px 12px rgba(15, 42, 29, 0.08)',
        }}
      >
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Spin size="large" />
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={allTransactions}
            pagination={{ pageSize: 10 }}
            rowClassName={() => 'partner-table-row'}
            loading={isLoading}
          />
        )}
      </Card>

      <style>{`
        .partner-table-row {
          transition: all 0.3s;
        }
        .partner-table-row:hover {
          background-color: #F0F7EB !important;
        }
      `}</style>
    </div>
  );
};

