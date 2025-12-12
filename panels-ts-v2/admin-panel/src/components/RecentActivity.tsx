import { useMemo } from 'react';
import { Card, List, Avatar, Tag, Empty } from 'antd';
import {
  UserAddOutlined,
  ShopOutlined,
  GiftOutlined,
  TransactionOutlined,
  CheckCircleOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { transactionsApi } from '@/services/api';
import { t } from '@/i18n';
import { formatRelativeTime } from '@/utils/dateUtils';
import { useI18nContext } from '@/i18nGatewayContext';
import dayjs from 'dayjs';

interface Activity {
  id: string;
  type: 'user' | 'partner' | 'promotion' | 'transaction' | 'notification';
  title: string;
  description: string;
  timestamp: string;
  status?: 'success' | 'pending' | 'failed';
}

interface RecentActivityProps {
  activities?: Activity[];
}

const getActivityIcon = (type: Activity['type']) => {
  switch (type) {
    case 'user':
      return <UserAddOutlined style={{ color: 'var(--color-primary)' }} />;
    case 'partner':
      return <ShopOutlined style={{ color: 'var(--color-primary)' }} />;
    case 'promotion':
      return <GiftOutlined style={{ color: 'var(--color-primary)' }} />;
    case 'transaction':
      return <TransactionOutlined style={{ color: 'var(--color-primary)' }} />;
    case 'notification':
      return <BellOutlined style={{ color: 'var(--color-primary)' }} />;
    default:
      return <CheckCircleOutlined style={{ color: 'var(--color-primary)' }} />;
  }
};

const getStatusColor = (status?: Activity['status']) => {
  switch (status) {
    case 'success':
      return 'var(--color-success)';
    case 'pending':
      return 'var(--color-warning)';
    case 'failed':
      return 'var(--color-error)';
    default:
      return 'var(--color-primary)';
  }
};

export const RecentActivity = ({ activities: propActivities }: RecentActivityProps) => {
  const { language } = useI18nContext(); // Подписка на изменения языка для перерисовки
  
  // Загружаем реальные транзакции из API
  const { data: recentTransactionsData } = useQuery({
    queryKey: ['recent-transactions'],
    queryFn: async () => {
      try {
        const res = await transactionsApi.getAll(1, 10);
        const payload: any = (res as any)?.data ?? res;
        return payload?.items ?? payload ?? [];
      } catch (error) {
        console.error('Error fetching recent transactions:', error);
        return [];
      }
    },
    retry: 1,
  });

  // Преобразуем транзакции в формат Activity
  const activities: Activity[] = useMemo(() => {
    return (recentTransactionsData || []).map((transaction: any) => {
    const amount = transaction.amount || 0;
    const currency = transaction.currency || 'сом';
    return {
      id: `transaction-${transaction.id}`,
      type: 'transaction' as const,
      title: t('activity.transactionProcessed', 'Транзакция обработана'),
      description: t('activity.transactionAmount', 'Транзакция на сумму {amount}', { 
        amount: `${amount.toLocaleString()} ${currency}` 
      }),
      timestamp: transaction.created_at || transaction.date || new Date().toISOString(),
      status: 'success' as const,
    };
  });
  }, [recentTransactionsData, language]); // Пересоздаем при изменении языка

  const displayActivities = propActivities || activities;

  return (
    <Card
      title={<span style={{ color: 'var(--color-text-primary)', fontSize: 16, fontWeight: 700 }}>{t('dashboard.recentActivity', '📋 Последняя активность')}</span>}
      style={{
        borderRadius: 16,
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        boxShadow: 'var(--card-shadow)',
      }}
      className="hover-lift-green"
    >
      {displayActivities.length === 0 ? (
        <Empty description={t('dashboard.noActivity', 'Нет активности')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          dataSource={displayActivities}
          renderItem={(item) => (
            <List.Item
              style={{
                border: 'none',
                padding: '12px 0',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <List.Item.Meta
                avatar={
                  <Avatar
                    icon={getActivityIcon(item.type)}
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      border: `2px solid ${getStatusColor(item.status)}`,
                    }}
                  />
                }
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.title}</span>
                    {item.status && (
                      <Tag color={getStatusColor(item.status)} style={{ margin: 0 }}>
                        {item.status === 'success' 
                          ? t('activity.status.success', 'Успешно')
                          : item.status === 'pending'
                          ? t('activity.status.pending', 'В процессе')
                          : t('activity.status.failed', 'Ошибка')}
                      </Tag>
                    )}
                  </div>
                }
                description={
                  <div>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>{item.description}</div>
                    <div style={{ color: 'var(--color-text-tertiary)', fontSize: 11, marginTop: 4 }}>
                      {formatRelativeTime(item.timestamp)}
                    </div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );
};
