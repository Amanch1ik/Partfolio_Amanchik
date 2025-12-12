import { Drawer, Menu } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  UserOutlined,
  ShopOutlined,
  TransactionOutlined,
  GiftOutlined,
  BellOutlined,
  TeamOutlined,
  SettingOutlined,
  AuditOutlined,
  EnvironmentOutlined,
  PlayCircleOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { t } from '@/i18n';

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

export const MobileMenu = ({ open, onClose }: MobileMenuProps) => {
  const location = useLocation();

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: <Link to="/" onClick={onClose}>{t('nav.home')}</Link>,
    },
    {
      key: '/users',
      icon: <UserOutlined />,
      label: <Link to="/users" onClick={onClose}>{t('nav.users')}</Link>,
    },
    {
      key: '/partners',
      icon: <ShopOutlined />,
      label: <Link to="/partners" onClick={onClose}>{t('nav.partners')}</Link>,
    },
    {
      key: '/partners/map',
      icon: <EnvironmentOutlined />,
      label: <Link to="/partners/map" onClick={onClose}>{t('nav.partnersMap', 'Карта партнеров')}</Link>,
    },
    {
      key: '/transactions',
      icon: <TransactionOutlined />,
      label: <Link to="/transactions" onClick={onClose}>{t('nav.transactions')}</Link>,
    },
    {
      key: '/promotions',
      icon: <GiftOutlined />,
      label: <Link to="/promotions" onClick={onClose}>{t('nav.promotions')}</Link>,
    },
    {
      key: '/stories',
      icon: <PlayCircleOutlined />,
      label: <Link to="/stories" onClick={onClose}>{t('nav.stories', 'Сторисы')}</Link>,
    },
    {
      key: '/referrals',
      icon: <TeamOutlined />,
      label: <Link to="/referrals" onClick={onClose}>{t('nav.referrals')}</Link>,
    },
    {
      key: '/notifications',
      icon: <BellOutlined />,
      label: <Link to="/notifications" onClick={onClose}>{t('nav.notifications')}</Link>,
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: <Link to="/settings" onClick={onClose}>{t('nav.settings')}</Link>,
    },
    {
      key: '/audit',
      icon: <AuditOutlined />,
      label: <Link to="/audit" onClick={onClose}>{t('nav.audit')}</Link>,
    },
    {
      key: '/monitoring',
      icon: <BarChartOutlined />,
      label: <Link to="/monitoring" onClick={onClose}>{t('nav.monitoring', 'Мониторинг')}</Link>,
    },
  ];

  return (
    <Drawer
      title="Меню"
      placement="left"
      onClose={onClose}
      open={open}
      styles={{ body: { padding: 0 } }}
      width={280}
    >
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        style={{ border: 'none' }}
      />
    </Drawer>
  );
};

