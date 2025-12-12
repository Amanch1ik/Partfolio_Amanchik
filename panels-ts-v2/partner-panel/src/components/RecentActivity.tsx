import { Card, List, Avatar, Tag, Empty, Spin } from 'antd';
import { 
  ShoppingOutlined, 
  UserAddOutlined, 
  GiftOutlined, 
  DollarOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { transactionsApi } from '../services/api';
import { toArray } from '../utils/arrayUtils';
import { formatRelativeTime } from '../utils/dateUtils';

interface Activity {
  id: string;
  type: 'sale' | 'employee' | 'promotion' | 'payment';
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
    case 'sale':
      return <ShoppingOutlined style={{ color: '#689071' }} />;
    case 'employee':
      return <UserAddOutlined style={{ color: '#689071' }} />;
    case 'promotion':
      return <GiftOutlined style={{ color: '#689071' }} />;
    case 'payment':
      return <DollarOutlined style={{ color: '#689071' }} />;
    default:
      return <CheckCircleOutlined style={{ color: '#689071' }} />;
  }
};

const getStatusColor = (status?: Activity['status']) => {
  switch (status) {
    case 'success':
      return '#689071';
    case 'pending':
      return '#AEC380';
    case 'failed':
      return '#ff4d4f';
    default:
      return '#689071';
  }
};

export const RecentActivity = ({ activities: propActivities }: RecentActivityProps) => {
  // Загружаем ТОЛЬКО реальные транзакции из API
  const { data: transactionsResponse, isLoading } = useQuery({
    queryKey: ['recent-transactions'],
    queryFn: async () => {
      try {
        const response = await transactionsApi.getTransactions({ limit: 10 });
        // Проверяем, что ответ содержит реальные данные
        const data = response?.data;
        if (!data || (Array.isArray(data) && data.length === 0)) {
          return [];
        }
        return data;
      } catch (error) {
        console.error('Error fetching recent transactions:', error);
        return [];
      }
    },
    retry: 1,
    staleTime: 30 * 1000, // 30 секунд - данные считаются свежими
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Преобразуем транзакции в формат Activity ТОЛЬКО из реальных данных API
  const activities: Activity[] = (toArray(transactionsResponse, []) || [])
    .filter((transaction: any) => {
      // Пропускаем транзакции без валидных данных
      if (!transaction || (!transaction.id && !transaction.created_at && !transaction.date)) {
        return false;
      }
      return true;
    })
    .slice(0, 10)
    .map((transaction: any) => {
      const amount = transaction.amount || 0;
      const transactionType = String(transaction.type || 'payment').toLowerCase();
      const date = transaction.date || transaction.created_at || transaction.timestamp;
      
      if (!date) {
        return null; // Пропускаем транзакции без даты
      }
      
      let activityType: 'sale' | 'employee' | 'promotion' | 'payment' = 'payment';
      let title = 'Платеж обработан';
      let description = `Платеж на сумму ${amount > 0 ? amount.toLocaleString('ru-RU') : Math.abs(amount).toLocaleString('ru-RU')} сом`;
      
      if (transactionType.includes('sale') || transactionType.includes('продаж')) {
        activityType = 'sale';
        title = 'Новая продажа';
        description = `Продажа на сумму ${amount.toLocaleString('ru-RU')} сом`;
      } else if (transactionType.includes('promotion') || transactionType.includes('акци')) {
        activityType = 'promotion';
        title = 'Акция использована';
        description = `Акция применена, сумма ${amount.toLocaleString('ru-RU')} сом`;
      }
      
      const status: 'success' | 'pending' | 'failed' = 
        transaction.status === 'completed' || transaction.status === 'success' ? 'success' : 
        transaction.status === 'pending' ? 'pending' : 'success';
      
      return {
        id: `transaction-${transaction.id || date}`,
        type: activityType,
        title,
        description,
        timestamp: date,
        status,
      };
    })
    .filter((item) => item !== null) as Activity[]; // Удаляем null значения

  // Используем ТОЛЬКО реальные данные из API - propActivities игнорируются
  const displayActivities = activities;

  return (
    <Card
      title={<span style={{ color: '#0F2A1D', fontSize: 16, fontWeight: 700 }}>📋 Последняя активность</span>}
      style={{
        borderRadius: 16,
        background: 'linear-gradient(135deg, #ffffff 0%, #F0F7EB 100%)',
        border: '1px solid #E3EED4',
        boxShadow: '0 2px 12px rgba(15, 42, 29, 0.08)',
      }}
      className="hover-lift-green"
    >
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <Spin size="large" />
        </div>
      ) : displayActivities.length === 0 ? (
        <Empty description="Нет активности" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          dataSource={displayActivities}
          renderItem={(item) => (
            <List.Item
              style={{
                border: 'none',
                padding: '12px 0',
                borderBottom: '1px solid #E3EED4',
              }}
            >
              <List.Item.Meta
                avatar={
                  <Avatar
                    icon={getActivityIcon(item.type)}
                    style={{
                      backgroundColor: '#F0F7EB',
                      border: `2px solid ${getStatusColor(item.status)}`,
                    }}
                  />
                }
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600, color: '#0F2A1D' }}>{item.title}</span>
                    {item.status && (
                      <Tag color={getStatusColor(item.status)} style={{ margin: 0 }}>
                        {item.status === 'success' ? 'Успешно' : item.status === 'pending' ? 'В процессе' : 'Ошибка'}
                      </Tag>
                    )}
                  </div>
                }
                description={
                  <div>
                    <div style={{ color: '#689071', fontSize: 13 }}>{item.description}</div>
                    <div style={{ color: '#AEC380', fontSize: 11, marginTop: 4 }}>
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
