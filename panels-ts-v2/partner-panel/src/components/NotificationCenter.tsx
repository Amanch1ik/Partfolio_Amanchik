import { Drawer, List, Badge, Empty, Button, Space, Spin, message } from 'antd';
import { BellOutlined, CheckOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../services/api';
import { formatRelativeTime } from '../utils/dateUtils';
import { toArray } from '../utils/arrayUtils';

interface Notification {
  id: string | number;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
}

interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
}

export const NotificationCenter = ({ open, onClose }: NotificationCenterProps) => {
  const queryClient = useQueryClient();

  // Загрузка уведомлений из API - ТОЛЬКО реальные данные
  const { data: notificationsResponse, isLoading } = useQuery({
    queryKey: ['partner-notifications'],
    queryFn: async () => {
      try {
        const response = await notificationsApi.getNotifications({ page: 1, limit: 50 });
        // Обрабатываем разные форматы ответа
        const responseData = (response as any)?.data || response;
        const notifications = toArray(
          responseData?.notifications || 
          (Array.isArray(responseData) ? responseData : []) || 
          [],
          []
        );
        return notifications;
      } catch (error: any) {
        console.error('Error fetching notifications:', error);
        return [];
      }
    },
    retry: 1,
    enabled: open, // Загружаем только когда панель открыта
    staleTime: 30 * 1000, // 30 секунд
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Мутация для отметки как прочитанное
  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await notificationsApi.markNotificationAsRead(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-notifications'] });
    },
    onError: (error: any) => {
      console.error('Error marking notification as read:', error);
      message.error('Не удалось отметить уведомление как прочитанное');
    },
  });

  // Мутация для удаления
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await notificationsApi.deleteNotification(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-notifications'] });
      message.success('Уведомление удалено');
    },
    onError: (error: any) => {
      console.error('Error deleting notification:', error);
      message.error('Не удалось удалить уведомление');
    },
  });

  // Преобразуем данные из API в формат Notification
  const notifications: Notification[] = toArray(notificationsResponse, []).map((item: any) => ({
    id: item.id || item.notification_id || Math.random().toString(),
    title: item.title || item.subject || 'Уведомление',
    message: item.message || item.content || item.body || '',
    type: item.type || item.notification_type || 'info',
    timestamp: item.timestamp || item.created_at || item.date || new Date().toISOString(),
    read: item.read !== undefined ? item.read : item.is_read !== undefined ? item.is_read : false,
  }));

  const handleMarkAsRead = (id: string | number) => {
    const numId = typeof id === 'string' ? parseInt(id, 10) : id;
    if (!isNaN(numId)) {
      markAsReadMutation.mutate(numId);
    }
  };

  const handleDelete = (id: string | number) => {
    const numId = typeof id === 'string' ? parseInt(id, 10) : id;
    if (!isNaN(numId)) {
      deleteMutation.mutate(numId);
    }
  };

  const handleMarkAllAsRead = () => {
    // Отмечаем все непрочитанные уведомления
    const unreadNotifications = notifications.filter(n => !n.read);
    unreadNotifications.forEach(notification => {
      const numId = typeof notification.id === 'string' ? parseInt(notification.id, 10) : notification.id;
      if (!isNaN(numId)) {
        markAsReadMutation.mutate(numId);
      }
    });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <BellOutlined style={{ color: '#689071' }} />
            <span style={{ fontWeight: 600, color: '#0F2A1D' }}>Уведомления</span>
            {unreadCount > 0 && (
              <Badge count={unreadCount} style={{ backgroundColor: '#689071' }} />
            )}
          </Space>
          {unreadCount > 0 && (
            <Button 
              type="link" 
              size="small" 
              onClick={handleMarkAllAsRead}
              loading={markAsReadMutation.isPending}
              style={{ color: '#689071' }}
            >
              Отметить все как прочитанные
            </Button>
          )}
        </div>
      }
      placement="right"
      onClose={onClose}
      open={open}
      width={400}
      style={{
        background: 'linear-gradient(135deg, #F0F7EB 0%, #E3EED4 100%)',
      }}
    >
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <Spin size="large" />
        </div>
      ) : notifications.length === 0 ? (
        <Empty
          description="Нет уведомлений"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ marginTop: 60 }}
        />
      ) : (
        <List
          dataSource={notifications}
          renderItem={(item) => (
            <List.Item
              style={{
                background: item.read ? '#ffffff' : '#F0F7EB',
                borderRadius: 12,
                marginBottom: 8,
                padding: '12px 16px',
                border: `1px solid ${item.read ? '#E3EED4' : '#AEC380'}`,
                transition: 'all 0.3s',
              }}
              actions={[
                !item.read && (
                  <Button
                    type="text"
                    icon={<CheckOutlined />}
                    onClick={() => handleMarkAsRead(item.id)}
                    loading={markAsReadMutation.isPending}
                    style={{ color: '#689071' }}
                  />
                ),
                <Button
                  type="text"
                  icon={<DeleteOutlined />}
                  onClick={() => handleDelete(item.id)}
                  loading={deleteMutation.isPending}
                  danger
                />,
              ]}
            >
              <List.Item.Meta
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: item.read ? 400 : 600, color: '#0F2A1D' }}>
                      {item.title}
                    </span>
                    {!item.read && (
                      <Badge dot style={{ backgroundColor: '#689071' }} />
                    )}
                  </div>
                }
                description={
                  <div>
                    <div style={{ color: '#689071', fontSize: 13 }}>{item.message}</div>
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
    </Drawer>
  );
};
