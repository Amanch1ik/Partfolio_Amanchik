import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, Card, Tag, Select, Space, Button, Dropdown, Avatar, message } from 'antd';
import { DownloadOutlined, UserOutlined, ShopOutlined } from '@ant-design/icons';
import { transactionsApi } from '@/services/api';
import { t } from '@/i18n';
import { exportToCSV, exportToJSON } from '@/utils/exportUtils';
import dayjs from 'dayjs';
import '../styles/animations.css';

export const TransactionsPage = () => {
  const [page, setPage] = useState(1);
  const [type, setType] = useState<string>();
  const [status, setStatus] = useState<string>();

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', page, type, status],
    queryFn: () => transactionsApi.getAll({ page, page_size: 20, type, status }).then(res => res.data),
  });

  const transactions = Array.isArray(data) ? data : [];

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      topup: t('transactions.type.topup', 'Начисление'),
      discount: t('transactions.type.discount', 'Списание'),
      bonus: t('transactions.type.bonus', 'Начисление'),
      refund: t('transactions.type.refund', 'Списание'),
      accrual: t('transactions.type.accrual', 'Начисление'),
      writeoff: t('transactions.type.writeoff', 'Списание'),
      pending: t('transactions.type.pending', 'На проверке'),
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    if (type === 'topup' || type === 'bonus' || type === 'accrual') return '#689071';
    if (type === 'discount' || type === 'refund' || type === 'writeoff') return '#ff4d4f';
    return '#0F2A1D';
  };

  const handleExport = (format: 'csv' | 'json' = 'csv') => {
    const exportColumns = [
      { key: 'id', title: t('transactions.export.id', 'ID') },
      { key: 'user_id', title: t('transactions.export.user', 'Пользователь') },
      { key: 'partner_id', title: t('transactions.export.partner', 'Партнер') },
      { key: 'amount', title: t('transactions.export.amount', 'Сумма'), render: (val: number) => `${val.toLocaleString('ru-RU')} Yess!Coin` },
      { key: 'type', title: t('transactions.export.type', 'Тип'), render: (val: string) => getTypeLabel(val) },
      { key: 'created_at', title: t('transactions.export.date', 'Дата'), render: (val: string) => dayjs(val).format('DD.MM.YYYY HH:mm:ss') },
    ];

    if (format === 'csv') {
      exportToCSV(transactions, exportColumns, 'transactions');
      message.success(t('common.exportSuccess', 'Файл успешно загружен'));
    } else {
      exportToJSON(transactions, 'transactions');
      message.success(t('common.exportSuccess', 'Файл успешно загружен'));
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: t('transactions.user', 'Пользователь'),
      key: 'user',
      width: 200,
      render: (_: any, record: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar
            icon={<UserOutlined />}
            size={32}
            style={{ backgroundColor: '#689071' }}
          />
          <span style={{ color: '#0F2A1D' }}>
            {record.user?.name || `${t('transactions.user', 'Пользователь')} ${record.user_id}`}
          </span>
        </div>
      ),
    },
    {
      title: t('transactions.partner', 'Партнер'),
      key: 'partner',
      width: 200,
      render: (_: any, record: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar
            icon={<ShopOutlined />}
            size={24}
            style={{ backgroundColor: '#689071' }}
          />
          <span style={{ color: '#0F2A1D' }}>
            {record.partner?.name || t('partners.defaultName', 'Глобус')}
          </span>
        </div>
      ),
    },
    {
      title: t('transactions.amount', 'Сумма'),
      dataIndex: 'amount',
      key: 'amount',
      width: 150,
      render: (amount: number, record: any) => {
        const color = getTypeColor(record.type);
        return (
          <span style={{ color, fontWeight: 600 }}>
            {amount.toLocaleString()} Yess!Coin
          </span>
        );
      },
    },
    {
      title: t('transactions.type', 'Тип'),
      dataIndex: 'type',
      key: 'type',
      width: 150,
      render: (type: string) => {
        const color = getTypeColor(type);
        const label = getTypeLabel(type);
        return (
          <Tag
            color={color === '#689071' ? 'success' : color === '#ff4d4f' ? 'error' : 'default'}
            style={{
              color: color === '#0F2A1D' ? '#0F2A1D' : '#ffffff',
              border: color === '#0F2A1D' ? '1px solid #d9d9d9' : 'none',
            }}
          >
            {label}
          </Tag>
        );
      },
    },
    {
      title: t('transactions.date', 'Дата'),
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => dayjs(date).format('DD.MM.YYYY HH:mm'),
    },
  ];

  const exportMenuItems = [
    { key: 'csv', label: t('common.exportCSV', 'Экспорт в CSV'), onClick: () => handleExport('csv') },
    { key: 'json', label: t('common.exportJSON', 'Экспорт в JSON'), onClick: () => handleExport('json') },
  ];

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0F2A1D', margin: 0 }}>
          {t('transactions.title', 'Транзакции')}
        </h1>
      </div>

      {/* Фильтры */}
      <Card
        style={{
          borderRadius: 16,
          background: 'linear-gradient(135deg, #ffffff 0%, #F0F7EB 100%)',
          border: '1px solid #E3EED4',
          boxShadow: '0 2px 12px rgba(15, 42, 29, 0.08)',
          marginBottom: 16,
        }}
        className="hover-lift-green"
      >
        <Space wrap>
          <Select
            placeholder={t('transactions.filter.allTypes', 'Все типы')}
            style={{ width: 150 }}
            allowClear
            value={type}
            onChange={setType}
            options={[
              { label: t('transactions.type.topup', 'Начисление'), value: 'topup' },
              { label: t('transactions.type.discount', 'Списание'), value: 'discount' },
              { label: t('transactions.type.bonus', 'Бонус'), value: 'bonus' },
              { label: t('transactions.type.refund', 'Возврат'), value: 'refund' },
            ]}
          />
          <Select
            placeholder={t('transactions.filter.allUsers', 'Все пользователи')}
            style={{ width: 150 }}
            allowClear
            options={[]}
          />
          <Select
            placeholder={t('transactions.filter.allPartners', 'Все партнеры')}
            style={{ width: 150 }}
            allowClear
            options={[]}
          />
          <Dropdown menu={{ items: exportMenuItems }} trigger={['click']}>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              style={{ backgroundColor: '#689071', borderColor: '#689071' }}
            >
              {t('common.export', 'Экспорт')}
            </Button>
          </Dropdown>
        </Space>
      </Card>

      {/* Таблица */}
      <Card
        loading={isLoading}
        style={{
          borderRadius: 16,
          background: 'linear-gradient(135deg, #ffffff 0%, #F0F7EB 100%)',
          border: '1px solid #E3EED4',
          boxShadow: '0 2px 12px rgba(15, 42, 29, 0.08)',
        }}
        className="hover-lift-green"
      >
        <Table
          columns={columns}
          dataSource={transactions}
          rowKey="id"
          pagination={{
            current: page,
            pageSize: 20,
            total: transactions.length,
            onChange: setPage,
            showSizeChanger: true,
            showQuickJumper: true,
          }}
          scroll={{ x: 1000 }}
        />
      </Card>
    </div>
  );
};
