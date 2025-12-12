import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, Card, Avatar, Tag, Space } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { t } from '@/i18n';
import { api } from '@/services/api';
import '../styles/animations.css';

export const AuditPage = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Загрузка данных аудита из API
  const { data: auditDataResponse } = useQuery({
    queryKey: ['audit', 'logs', page, pageSize],
    queryFn: () => api.adminApi.getAuditLogs(page, pageSize),
  });

  const auditData = auditDataResponse?.data?.items || [];

  // Загрузка сессий из API
  const { data: sessionsResponse } = useQuery({
    queryKey: ['audit', 'sessions'],
    queryFn: () => api.adminApi.getAuditSessions(),
  });

  const sessionsData = sessionsResponse?.data || [];

  const auditColumns = [
    {
      title: t('audit.date', 'Дата'),
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => (
        <span style={{ color: '#0F2A1D' }}>
          {date ? new Date(date).toLocaleString('ru-RU') : '-'}
        </span>
      ),
    },
    {
      title: t('audit.administrator', 'Администратор'),
      key: 'administrator',
      width: 200,
      render: (_: any, record: any) => (
        <Space>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#689071' }} />
          <span style={{ color: '#0F2A1D' }}>
            {record.user?.name || record.user?.email || `User #${record.user_id}` || 'Admin'}
          </span>
        </Space>
      ),
    },
    {
      title: t('audit.action', 'Действие'),
      dataIndex: 'action',
      key: 'action',
      width: 250,
      render: (action: string) => <span style={{ color: '#0F2A1D' }}>{action || '-'}</span>,
    },
    {
      title: 'IP',
      dataIndex: 'ip_address',
      key: 'ip_address',
      width: 120,
      render: (ip: string) => <span style={{ color: '#0F2A1D' }}>{ip || '-'}</span>,
    },
    {
      title: t('audit.resource', 'Ресурс'),
      key: 'resource',
      width: 150,
      render: (_: any, record: any) => (
        <span style={{ color: '#0F2A1D' }}>
          {record.resource_type || '-'} {record.resource_id ? `#${record.resource_id}` : ''}
        </span>
      ),
    },
  ];

  const sessionsColumns = [
    {
      title: t('audit.device', 'Устройство'),
      dataIndex: 'user_agent',
      key: 'user_agent',
      width: 200,
      render: (userAgent: string) => (
        <span style={{ color: '#0F2A1D' }}>
          {userAgent ? userAgent.split(' ')[0] : '-'}
        </span>
      ),
    },
    {
      title: 'IP',
      dataIndex: 'ip_address',
      key: 'ip_address',
      width: 120,
      render: (ip: string) => <span style={{ color: '#0F2A1D' }}>{ip || '-'}</span>,
    },
    {
      title: t('audit.location', 'Местоположение'),
      dataIndex: 'location',
      key: 'location',
      width: 150,
      render: (location: string) => <span style={{ color: '#0F2A1D' }}>{location || '-'}</span>,
    },
    {
      title: t('audit.active', 'Активна'),
      dataIndex: 'last_activity',
      key: 'last_activity',
      width: 150,
      render: (lastActivity: string) => (
        <span style={{ color: '#689071' }}>
          {lastActivity ? new Date(lastActivity).toLocaleString('ru-RU') : '-'}
        </span>
      ),
    },
  ];

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0, marginBottom: 8 }}>
          {t('audit.title', 'Аудит')}
        </h1>
        <p style={{ color: 'var(--color-primary)', margin: 0 }}>
          {t('audit.description', 'Анализ действий администратора и защита аккаунтов')}
        </p>
      </div>

      {/* Таблица аудита */}
      <Card
        style={{
          borderRadius: 16,
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          boxShadow: 'var(--card-shadow)',
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
        <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
          {t('audit.sessions', 'Сессии')}
        </h2>
      </div>
      <Card
        style={{
          borderRadius: 16,
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          boxShadow: 'var(--card-shadow)',
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

