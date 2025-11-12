import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, Card, Avatar, Tag, Space } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { t } from '@/i18n';
import '../styles/animations.css';

export const AuditPage = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Демо-данные для аудита
  const auditData = [
    {
      id: 1,
      date: '14.07.2025, 16:08',
      administrator: {
        name: 'Peter Taylor',
        avatar: null,
      },
      action: 'Создать новую роль',
      ip: '19.123.4x',
      address: '197.234.5.6',
    },
    {
      id: 2,
      date: '14.07.2025, 16:08',
      administrator: {
        name: 'Szekeres Dalma',
        avatar: null,
      },
      action: 'Удалить пользователя',
      ip: '19.123.4x',
      address: '197.234.5.6',
    },
    {
      id: 3,
      date: '14.07.2025, 16:08',
      administrator: {
        name: 'Peter Taylor',
        avatar: null,
      },
      action: 'Удалить пользователя',
      ip: '19.123.4x',
      address: '197.234.5.6',
    },
  ];

  // Демо-данные для сессий
  const sessionsData = [
    {
      id: 1,
      device: 'Google Chrome',
      ip: '183',
      location: 'Кыргызстан',
      active: '10 ч назад',
    },
    {
      id: 2,
      device: 'Google Chrome',
      ip: '183',
      location: 'Кыргызстан',
      active: '10 ч назад',
    },
    {
      id: 3,
      device: 'Google Chrome',
      ip: '3',
      location: 'Кыргызстан',
      active: '10 ч назад',
    },
  ];

  const auditColumns = [
    {
      title: t('audit.date', 'Дата'),
      dataIndex: 'date',
      key: 'date',
      width: 180,
    },
    {
      title: t('audit.administrator', 'Администратор'),
      key: 'administrator',
      width: 200,
      render: (_: any, record: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar
            src={record.administrator.avatar}
            icon={<UserOutlined />}
            size={32}
            style={{ backgroundColor: '#689071' }}
          />
          <span style={{ color: '#0F2A1D' }}>{record.administrator.name}</span>
        </div>
      ),
    },
    {
      title: t('audit.action', 'Действие'),
      dataIndex: 'action',
      key: 'action',
      width: 250,
      render: (action: string) => <span style={{ color: '#0F2A1D' }}>{action}</span>,
    },
    {
      title: 'IP',
      dataIndex: 'ip',
      key: 'ip',
      width: 120,
      render: (ip: string) => <span style={{ color: '#0F2A1D' }}>{ip}</span>,
    },
    {
      title: t('audit.address', 'Адрес'),
      dataIndex: 'address',
      key: 'address',
      width: 150,
      render: (address: string) => <span style={{ color: '#0F2A1D' }}>{address}</span>,
    },
  ];

  const sessionsColumns = [
    {
      title: t('audit.device', 'Устройство'),
      dataIndex: 'device',
      key: 'device',
      width: 200,
      render: (device: string) => <span style={{ color: '#0F2A1D' }}>{device}</span>,
    },
    {
      title: 'IP',
      dataIndex: 'ip',
      key: 'ip',
      width: 120,
      render: (ip: string) => <span style={{ color: '#0F2A1D' }}>{ip}</span>,
    },
    {
      title: t('audit.location', 'Местоположение'),
      dataIndex: 'location',
      key: 'location',
      width: 150,
      render: (location: string) => <span style={{ color: '#0F2A1D' }}>{location}</span>,
    },
    {
      title: t('audit.active', 'Активна'),
      dataIndex: 'active',
      key: 'active',
      width: 150,
      render: (active: string) => <span style={{ color: '#689071' }}>{active}</span>,
    },
  ];

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0F2A1D', margin: 0, marginBottom: 8 }}>
          {t('audit.title', 'Аудит')}
        </h1>
        <p style={{ color: '#689071', margin: 0 }}>
          {t('audit.description', 'Анализ действий администратора и защита аккаунтов')}
        </p>
      </div>

      {/* Таблица аудита */}
      <Card
        style={{
          borderRadius: 16,
          background: 'linear-gradient(135deg, #ffffff 0%, #F0F7EB 100%)',
          border: '1px solid #E3EED4',
          boxShadow: '0 2px 12px rgba(15, 42, 29, 0.08)',
          marginBottom: 20,
        }}
        className="hover-lift-green"
      >
        <Table
          columns={auditColumns}
          dataSource={auditData}
          rowKey="id"
          pagination={false}
          scroll={{ x: 800 }}
        />
      </Card>

      {/* Таблица сессий */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: '#0F2A1D', margin: 0 }}>
          {t('audit.sessions', 'Сессии')}
        </h2>
      </div>
      <Card
        style={{
          borderRadius: 16,
          background: 'linear-gradient(135deg, #ffffff 0%, #F0F7EB 100%)',
          border: '1px solid #E3EED4',
          boxShadow: '0 2px 12px rgba(15, 42, 29, 0.08)',
        }}
        className="hover-lift-green"
      >
        <Table
          columns={sessionsColumns}
          dataSource={sessionsData}
          rowKey="id"
          pagination={false}
          scroll={{ x: 600 }}
        />
      </Card>
    </div>
  );
};

