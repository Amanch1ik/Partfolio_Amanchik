import { Drawer, List, Badge, Empty, Button, Space } from 'antd';
import { BellOutlined, CheckOutlined, DeleteOutlined } from '@ant-design/icons';
import { useState } from 'react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
}

interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
  notifications?: Notification[];
}

export const NotificationCenter = ({ open, onClose, notifications = [] }: NotificationCenterProps) => {
  const [localNotifications, setLocalNotifications] = useState<Notification[]>(notifications);

  const markAsRead = (id: string) => {
    setLocalNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const deleteNotification = (id: string) => {
    setLocalNotifications(prev => prev.filter(n => n.id !== id));
  };

  const markAllAsRead = () => {
    setLocalNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = localNotifications.filter(n => !n.read).length;

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
            <Button type="link" size="small" onClick={markAllAsRead} style={{ color: '#689071' }}>
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
      {localNotifications.length === 0 ? (
        <Empty
          description="Нет уведомлений"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ marginTop: 60 }}
        />
      ) : (
        <List
          dataSource={localNotifications}
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
                    onClick={() => markAsRead(item.id)}
                    style={{ color: '#689071' }}
                  />
                ),
                <Button
                  type="text"
                  icon={<DeleteOutlined />}
                  onClick={() => deleteNotification(item.id)}
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
                      {item.timestamp}
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

