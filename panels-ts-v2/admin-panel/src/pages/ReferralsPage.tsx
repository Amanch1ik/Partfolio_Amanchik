import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, Card, Button, Space, Avatar, Tag, Dropdown, message } from 'antd';
import { DownloadOutlined, MoreOutlined, UserOutlined } from '@ant-design/icons';
import { usersApi } from '@/services/api';
import { toArray } from '../utils/arrayUtils';
import { t } from '@/i18n';
import { exportToCSV, exportToJSON } from '@/utils/exportUtils';
import '../styles/animations.css';
import { useDocumentTitle } from '@shared/hooks/useDocumentTitle';

export const ReferralsPage = () => {
  useDocumentTitle('Реферальная программа', 'YESS!GO Admin');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users', page, pageSize],
    queryFn: () => usersApi.getAll(page, pageSize),
    retry: 1,
  });

  const users = toArray<any>(usersData?.data, []);
  const total = usersData?.data?.total || 0;

  // Используем реальные данные из API
  const referralsData = users.map((user: any) => ({
    id: user.id,
    agent: {
      name: user.name || `${t('referrals.user', 'Пользователь')} ${user.id}`,
      avatar: user.avatar_url,
    },
    invited: user.referrals_invited || 0,
    active: user.referrals_active || 0,
    bonuses: user.referrals_bonuses || 0,
  }));

  const handleExport = (format: 'csv' | 'json' = 'csv') => {
    const exportColumns = [
      { key: 'id', title: t('referrals.export.id', 'ID') },
      { key: 'agent', title: t('referrals.export.agent', 'Агент'), render: (_: any, record: any) => record.agent.name },
      { key: 'invited', title: t('referrals.export.invited', 'Приглашены') },
      { key: 'active', title: t('referrals.export.active', 'Активы') },
      { key: 'bonuses', title: t('referrals.export.bonuses', 'Бонусы'), render: (val: number) => `${val.toLocaleString('ru-RU')} Y` },
    ];

    if (format === 'csv') {
      exportToCSV(referralsData, exportColumns, 'referrals');
      message.success(t('common.exportSuccess', 'Файл успешно загружен'));
    } else {
      exportToJSON(referralsData, 'referrals');
      message.success(t('common.exportSuccess', 'Файл успешно загружен'));
    }
  };

  const columns = [
    {
      title: t('referrals.agent', 'Агент'),
      key: 'agent',
      width: 250,
      render: (_: any, record: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar
            src={record.agent.avatar}
            icon={<UserOutlined />}
            size={40}
            style={{ backgroundColor: 'var(--color-primary)' }}
          />
          <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>
            {record.agent.name}
          </span>
        </div>
      ),
    },
    {
      title: t('referrals.invited', 'Приглашены'),
      dataIndex: 'invited',
      key: 'invited',
      width: 150,
      render: (value: number) => (
        <span style={{ color: '#0F2A1D', fontWeight: 500 }}>
          {value.toLocaleString()}
        </span>
      ),
    },
    {
      title: t('referrals.active', 'Активы'),
      dataIndex: 'active',
      key: 'active',
      width: 150,
      render: (value: number) => (
        <span style={{ color: '#0F2A1D', fontWeight: 500 }}>
          {value.toLocaleString()}
        </span>
      ),
    },
    {
      title: t('referrals.bonuses', 'Бонусы'),
      dataIndex: 'bonuses',
      key: 'bonuses',
      width: 150,
      render: (value: number) => (
        <span style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: 15 }}>
          {value.toLocaleString()} Y
        </span>
      ),
    },
  ];

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0F2A1D', margin: 0 }}>
          {t('referrals.title', 'Рефералы')}
        </h1>
        <Space>
          <Dropdown
            menu={{
              items: [
                { key: 'csv', label: t('common.exportCSV', 'Экспорт в CSV'), onClick: () => handleExport('csv') },
                { key: 'json', label: t('common.exportJSON', 'Экспорт в JSON'), onClick: () => handleExport('json') },
              ],
            }}
            trigger={['click']}
          >
            <Button 
              type="primary"
              icon={<DownloadOutlined />}
              style={{ backgroundColor: '#689071', borderColor: '#689071' }}
            >
              {t('common.export', 'Экспорт')}
            </Button>
          </Dropdown>
          <Button icon={<MoreOutlined />} />
        </Space>
      </div>

      <Card
        loading={isLoading}
        style={{
          borderRadius: 16,
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          boxShadow: 'var(--card-shadow)',
        }}
        className="hover-lift-green"
      >
        <Table
          columns={columns}
          dataSource={referralsData}
          rowKey="id"
          pagination={{
            current: page,
            total: total,
            pageSize: pageSize,
            onChange: setPage,
            onShowSizeChange: (_, size) => setPageSize(size),
            showSizeChanger: true,
            showQuickJumper: true,
          }}
          scroll={{ x: 800 }}
        />
      </Card>
    </div>
  );
};

