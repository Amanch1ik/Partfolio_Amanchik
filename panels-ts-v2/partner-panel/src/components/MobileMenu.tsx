import { Drawer, Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  UserOutlined,
  EnvironmentOutlined,
  ShoppingOutlined,
  UnorderedListOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { t } from '@/i18n';

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

export const MobileMenu = ({ open, onClose }: MobileMenuProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: t('nav.home', 'Главная'),
    },
    {
      key: '/profile',
      icon: <UserOutlined />,
      label: t('nav.profile', 'Профиль партнера'),
    },
    {
      key: '/locations',
      icon: <EnvironmentOutlined />,
      label: t('nav.locations', 'Локации'),
    },
    {
      key: '/promotions',
      icon: <ShoppingOutlined />,
      label: t('nav.promotions', 'Акции и сторис'),
    },
    {
      key: '/transactions',
      icon: <UnorderedListOutlined />,
      label: t('nav.transactions', 'Транзакции'),
    },
    {
      key: '/employees',
      icon: <TeamOutlined />,
      label: t('nav.employees', 'Сотрудники'),
    },
  ];

  return (
    <Drawer
      title="YESS!Partner"
      placement="left"
      onClose={onClose}
      open={open}
      styles={{
        body: { padding: 0, background: 'linear-gradient(180deg, #689071 0%, #4a6b52 100%)' },
        header: { background: 'linear-gradient(180deg, #689071 0%, #4a6b52 100%)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }
      }}
      width={280}
    >
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={({ key }) => {
          navigate(key);
          onClose();
        }}
        style={{
          borderRight: 0,
          background: 'transparent',
          color: 'var(--sidebar-text)',
        }}
        theme="light"
      />
    </Drawer>
  );
};

