import { useMemo } from 'react';
import { Card, Row, Col, Button } from 'antd';
import {
  UserAddOutlined,
  ShopOutlined,
  GiftOutlined,
  FileTextOutlined,
  SettingOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { t } from '@/i18n';
import { useI18nContext } from '@/i18nGatewayContext';

export const QuickActions = () => {
  const navigate = useNavigate();
  const { language } = useI18nContext(); // Подписка на изменения языка для перерисовки

  const actions = useMemo(() => [
    {
      key: 'user',
      icon: <UserAddOutlined />,
      label: t('quickActions.addUser', 'Добавить пользователя'),
      onClick: () => navigate('/users'),
      color: 'var(--color-primary)',
    },
    {
      key: 'partner',
      icon: <ShopOutlined />,
      label: t('quickActions.addPartner', 'Добавить партнера'),
      onClick: () => navigate('/partners'),
      color: 'var(--color-primary)',
    },
    {
      key: 'promotion',
      icon: <GiftOutlined />,
      label: t('quickActions.createPromotion', 'Создать акцию'),
      onClick: () => navigate('/promotions'),
      color: 'var(--color-primary)',
    },
    {
      key: 'report',
      icon: <FileTextOutlined />,
      label: t('quickActions.downloadReport', 'Скачать отчет'),
      onClick: () => navigate('/transactions'),
      color: 'var(--color-primary)',
    },
    {
      key: 'notification',
      icon: <BellOutlined />,
      label: t('quickActions.sendNotification', 'Отправить уведомление'),
      onClick: () => navigate('/notifications'),
      color: 'var(--color-primary)',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: t('quickActions.settings', 'Настройки'),
      onClick: () => navigate('/settings'),
      color: 'var(--color-primary)',
    },
  ], [language, navigate]); // Пересоздаем при изменении языка

  return (
    <Card
      title={<span style={{ color: 'var(--color-text-primary)', fontSize: 16, fontWeight: 700 }}>{t('dashboard.quickActions', '⚡ Быстрые действия')}</span>}
      style={{
        borderRadius: 16,
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        boxShadow: 'var(--card-shadow)',
      }}
      className="hover-lift-green"
    >
      <Row gutter={[12, 12]}>
        {actions.map((action) => (
          <Col xs={12} sm={8} md={6} key={action.key}>
            <Button
              type="default"
              onClick={action.onClick}
              block
              className="button-ripple card-hover"
              style={{
                height: 80,
                borderRadius: 12,
                borderColor: 'var(--color-border)',
                color: 'var(--color-primary)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                background: 'var(--card-bg)',
                boxShadow: 'var(--shadow-sm)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary)';
                e.currentTarget.style.background = 'var(--color-bg-hover)';
                e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
                e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.background = 'var(--card-bg)';
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
              }}
            >
              <span style={{ fontSize: 20 }}>{action.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 500 }}>{action.label}</span>
            </Button>
          </Col>
        ))}
      </Row>
    </Card>
  );
};
