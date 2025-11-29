import { useState } from 'react';
import { Card, Table, Tag, Button, Space, Select, Input, DatePicker, Spin, message, Dropdown } from 'antd';
import { ExportOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { transactionsApi } from '../services/api';
import { exportToCSV, exportToExcel, exportToJSON } from '../utils/exportUtils';
import dayjs from 'dayjs';
import { toArray } from '../utils/arrayUtils';
import 'dayjs/locale/ru';

const { RangePicker } = DatePicker;

export const TransactionsPage = () => {
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);


  // Загрузка транзакций из API
  const { data: transactionsResponse, isLoading, error } = useQuery({
    queryKey: ['transactions', dateRange],
    queryFn: async () => {
      const params: any = {};
      if (dateRange) {
        params.start_date = dateRange[0].format('YYYY-MM-DD');
        params.end_date = dateRange[1].format('YYYY-MM-DD');
      }
      const response = await transactionsApi.getTransactions(params);
      return response.data;
    },
    retry: 1,
  });

  // Мок данные для демонстрации (если API недоступен)
  const mockTransactions = [
    {
      id: 1,
      date: '2025-01-15',
      amount: 1500.00,
      type: 'income',
      description: 'Оплата за услуги',
      user: { name: 'Иван Петров', email: 'ivan@example.com' },
      status: 'completed'
    },
    {
      id: 2,
      date: '2025-01-14',
      amount: -500.00,
      type: 'expense',
      description: 'Комиссия сервиса',
      user: { name: 'Мария Сидорова', email: 'maria@example.com' },
      status: 'completed'
    },
    {
      id: 3,
      date: '2025-01-13',
      amount: 2200.00,
      type: 'income',
      description: 'Продажа товара',
      user: { name: 'Алексей Иванов', email: 'alex@example.com' },
      status: 'pending'
    },
  ];

  // Используем данные из API или мок данные
  const allTransactions = toArray(transactionsResponse, mockTransactions);

  const handleExport = (format: 'csv' | 'excel' | 'json' = 'csv') => {
    // Проверяем, что есть данные для экспорта
    if (!allTransactions || allTransactions.length === 0) {
      message.warning('Нет данных для экспорта');
      return;
    }

    const exportColumns = [
      { 
        key: 'date', 
        title: 'Дата',
        render: (val: string) => val || ''
      },
      { 
        key: 'user', 
        title: 'Пользователь',
        render: (_: any, record: any) => record.user?.name || ''
      },
      { 
        key: 'partner', 
        title: 'Партнер',
        render: (_: any, record: any) => record.partner?.name || ''
      },
      { 
        key: 'amount', 
        title: 'Сумма',
        render: (val: number) => `${val > 0 ? '+' : ''}${val.toLocaleString('ru-RU')} Yess!Coin`
      },
      { 
        key: 'type', 
        title: 'Тип',
        render: (val: string) => val || ''
      },
      { 
        key: 'status', 
        title: 'Статус',
        render: (val: string) => val || ''
      },
    ];

    try {
      if (format === 'csv') {
        exportToCSV(allTransactions, exportColumns, 'transactions');
        message.success('Файл успешно загружен');
      } else if (format === 'excel') {
        exportToExcel(allTransactions, exportColumns, 'transactions');
        message.success('Файл успешно загружен');
      } else {
        exportToJSON(allTransactions, 'transactions');
        message.success('Файл успешно загружен');
      }
    } catch (error) {
      console.error('Export error:', error);
      message.error('Ошибка при экспорте данных');
    }
  };

  const exportMenuItems = [
    { key: 'csv', label: 'Экспорт в CSV', onClick: () => handleExport('csv') },
    { key: 'excel', label: 'Экспорт в Excel', onClick: () => handleExport('excel') },
    { key: 'json', label: 'Экспорт в JSON', onClick: () => handleExport('json') },
  ];

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
        <Dropdown
          menu={{ items: exportMenuItems }}
          trigger={['click']}
        >
          <Button
            type="primary"
            icon={<ExportOutlined />}
            style={{
              background: 'linear-gradient(135deg, #689071 0%, #AEC380 100%)',
              border: 'none',
              borderRadius: 12,
              height: 40,
              fontWeight: 600,
            }}
          >
            Экспорт
          </Button>
        </Dropdown>
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

