import { useState } from 'react';
import { Card, Table, Tag, Button, Space, Select, Input, DatePicker, Spin, message, Dropdown } from 'antd';
import { ExportOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { transactionsApi } from '../services/api';
import { exportToCSV, exportToExcel, exportToJSON } from '../utils/exportUtils';
import dayjs from 'dayjs';
import { toArray } from '../utils/arrayUtils';
import { useDocumentTitle } from '@shared/hooks/useDocumentTitle';
import 'dayjs/locale/ru';

const { RangePicker } = DatePicker;

export const TransactionsPage = () => {
  useDocumentTitle('Транзакции', 'YESS!GO Partner');
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

  // Используем данные из API
  const allTransactions = toArray(transactionsResponse, []);

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
      render: (date: string) => date ? dayjs(date).format('DD.MM.YYYY HH:mm') : '-',
    },
    {
      title: 'Пользователь',
      key: 'user',
      sorter: true,
      render: (_: any, record: any) => {
        const userName = record.user?.name || record.user_name || `Пользователь ${record.user_id || record.id}`;
        const firstLetter = userName.charAt(0).toUpperCase();
        return (
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
              {firstLetter}
            </div>
            <span>{userName}</span>
          </Space>
        );
      },
    },
    {
      title: 'Партнер',
      key: 'partner',
      sorter: true,
      render: (_: any, record: any) => {
        const partnerName = record.partner?.name || record.partner_name || 'Партнер';
        const firstLetter = partnerName.charAt(0).toUpperCase();
        return (
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
              {firstLetter}
            </div>
            <span>{partnerName}</span>
          </Space>
        );
      },
    },
    {
      title: 'Сумма',
      dataIndex: 'amount',
      key: 'amount',
      sorter: true,
      render: (amount: number) => {
        if (amount === null || amount === undefined) return '-';
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        if (isNaN(numAmount)) return '-';
        return (
          <span style={{ color: numAmount > 0 ? '#689071' : '#ff4d4f', fontWeight: 600 }}>
            {numAmount > 0 ? '+' : ''}{numAmount.toLocaleString('ru-RU')} Yess!Coin
          </span>
        );
      },
    },
    {
      title: 'Тип',
      dataIndex: 'type',
      key: 'type',
      sorter: true,
      render: (type: string) => {
        if (!type) return '-';
        const typeLower = type.toLowerCase();
        const isIncome = typeLower.includes('income') || typeLower.includes('начисл') || typeLower.includes('пополн');
        const isExpense = typeLower.includes('expense') || typeLower.includes('списан') || typeLower.includes('вывод');
        const displayType = isIncome ? 'Начисление' : isExpense ? 'Списание' : type;
        return (
          <Tag color={isIncome ? 'green' : isExpense ? 'blue' : 'default'}>{displayType}</Tag>
        );
      },
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      sorter: true,
      render: (status: string) => {
        if (!status) return '-';
        const statusLower = status.toLowerCase();
        const color = statusLower.includes('completed') || statusLower.includes('success') || statusLower.includes('успешно') || statusLower.includes('завершено')
          ? 'green'
          : statusLower.includes('pending') || statusLower.includes('в процессе') || statusLower.includes('ожидание')
          ? 'orange'
          : statusLower.includes('failed') || statusLower.includes('error') || statusLower.includes('ошибка') || statusLower.includes('отменено')
          ? 'red'
          : 'default';
        const displayStatus = statusLower.includes('completed') || statusLower.includes('success')
          ? 'Завершено'
          : statusLower.includes('pending')
          ? 'В процессе'
          : statusLower.includes('failed') || statusLower.includes('error')
          ? 'Ошибка'
          : status;
        return <Tag color={color}>{displayStatus}</Tag>;
      },
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
            placeholder="Тип транзакции"
            style={{ width: 200, borderRadius: 12 }}
            allowClear
            options={[
              { label: 'Начисление', value: 'income' },
              { label: 'Списание', value: 'expense' },
            ]}
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

