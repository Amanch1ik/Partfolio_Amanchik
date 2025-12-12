import { Card, Table, Tag, Button, Space, Select, Input, DatePicker } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { DeleteButton } from '../components/DeleteButton';
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
              background: '#E3EED4',
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
          {amount > 0 ? '+' : ''}{amount.toLocaleString()} Y
        </span>
      ),
    },
    {
      title: 'Тип',
      dataIndex: 'type',
      key: 'type',
      sorter: true,
      render: (type: string) => (
        <Tag color={type === 'Начисление' ? 'green' : 'orange'}>{type}</Tag>
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
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0, color: '#8B4513' }}>
          💳 Транзакции
        </h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          style={{
            background: 'linear-gradient(135deg, #F5A623 0%, #F7B731 100%)',
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
          background: 'linear-gradient(135deg, #ffffff 0%, #FFF4E6 100%)',
          border: '1px solid #FFE6CC',
          marginBottom: 16,
          boxShadow: '0 2px 12px rgba(245, 166, 35, 0.08)',
        }}
      >
        <Space wrap style={{ width: '100%' }}>
          <RangePicker
            defaultValue={[dayjs('2025-11-01'), dayjs('2026-11-01')]}
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
          background: 'linear-gradient(135deg, #ffffff 0%, #FFF4E6 100%)',
          border: '1px solid #FFE6CC',
          boxShadow: '0 2px 12px rgba(245, 166, 35, 0.08)',
        }}
      >
        <Table
          columns={columns}
          dataSource={transactionsData}
          pagination={{ pageSize: 10 }}
          rowClassName={() => 'partner-table-row'}
        />
      </Card>

      <style>{`
        .partner-table-row {
          transition: all 0.3s;
        }
        .partner-table-row:hover {
          background-color: #FFF4E6 !important;
        }
      `}</style>
    </div>
  );
};

