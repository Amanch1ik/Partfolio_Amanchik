import React, { useState, useRef } from 'react';
import { Layout, Menu, Avatar, Badge, Input, Dropdown, Select, Modal, Form, Upload, App } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  UserOutlined,
  EnvironmentOutlined,
  ShoppingOutlined,
  UnorderedListOutlined,
  TeamOutlined,
  BellOutlined,
  SearchOutlined,
  LogoutOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/hooks/useAuth';
import { NotificationCenter } from './NotificationCenter';
import { SearchResults } from './SearchResults';
import { MobileMenu } from './MobileMenu';
import { t } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';
import { MenuOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/services/api';
import { toArray } from '@/utils/arrayUtils';
import './MainLayout.css';

const { Header, Sider, Content } = Layout;

interface User {
  id?: string;
  email?: string;
  username?: string;
  avatar_url?: string;
  role?: string;
}

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser, setUser: setAuthUser, logout } = useAuth();
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'ru');
  const [profileForm] = Form.useForm();
  const searchInputRef = React.useRef<any>(null);
  
  // Загружаем количество непрочитанных уведомлений из API
  const { data: notificationsData } = useQuery({
    queryKey: ['partner-notifications-count'],
    queryFn: async () => {
      try {
        const response = await notificationsApi.getNotifications({ page: 1, limit: 50 });
        const responseData = (response as any)?.data || response;
        const notifications = toArray(
          responseData?.notifications || 
          (Array.isArray(responseData) ? responseData : []) || 
          [],
          []
        );
        return notifications;
      } catch (error) {
        console.error('Error fetching notifications count:', error);
        return [];
      }
    },
    retry: 1,
    staleTime: 30 * 1000, // 30 секунд
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Используем данные из useAuth
  const user: User = authUser || {
    id: '',
    email: '',
    username: '',
    avatar_url: '',
    role: 'partner',
  };

  // Подсчитываем непрочитанные уведомления
  const unreadNotificationsCount = toArray(notificationsData, []).filter(
    (n: any) => !n.read && n.is_read !== true
  ).length;
  
  // Debounce для предотвращения double-click
  const lastClickRef = useRef<number>(0);
  const debounceClick = (callback: () => void, delay = 300) => {
    const now = Date.now();
    if (now - lastClickRef.current > delay) {
      lastClickRef.current = now;
      callback();
    }
  };

  const handleLanguageChange = (lang: string) => {
    if (lang === language) return;
    setLanguage(lang);
    try {
      localStorage.setItem('language', lang);
    } catch (error) {
      console.warn('Failed to save language to localStorage:', error);
    }
    message.success('Язык изменён');
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    if (value.trim()) {
      message.info(`Поиск: ${value}`);
    }
  };

  const handleSearchToggle = () => {
    setIsSearchActive(!isSearchActive);
    if (!isSearchActive) {
      // Фокус на поле ввода после анимации
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      // Очищаем поиск при закрытии
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    debounceClick(() => {
      logout();
      navigate('/login');
    });
  };

  // Ограниченное меню для партнеров - убраны биллинг и интеграции
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
    // Биллинг и интеграции удалены - партнеры не должны иметь к ним доступ
  ];

  const handleProfileClick = () => {
    profileForm.setFieldsValue({
      username: user?.username || '',
      email: user?.email || '',
    });
    setIsProfileModalOpen(true);
  };

  const handleSaveProfile = () => {
    profileForm.validateFields().then((values) => {
      const updatedUser = { ...user, ...values };
      setAuthUser(updatedUser);
      message.success('Профиль успешно обновлен');
      setIsProfileModalOpen(false);
      profileForm.resetFields();
    });
  };

  const userMenuItems = [
    {
      key: 'profile',
      label: t('nav.profile', 'Профиль'),
      icon: <UserOutlined />,
      onClick: handleProfileClick,
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      label: t('nav.logout', 'Выйти'),
      icon: <LogoutOutlined />,
      onClick: handleLogout,
    },
  ];

  return (
    <Layout className="partner-layout">
      <Sider
        className="partner-sidebar"
        collapsible={false}
        width={250}
        style={{
          background: 'linear-gradient(180deg, #689071 0%, #4a6b52 100%)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div className="partner-logo">
          <span style={{ color: 'var(--sidebar-text-active)', fontWeight: 'bold', fontSize: 24 }}>YESS!Partner</span>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          className="partner-menu"
          style={{ 
            borderRight: 0,
            background: 'transparent',
          }}
          theme="dark"
        />
      </Sider>
      <Layout style={{ marginLeft: 0, transition: 'margin-left 0.3s ease' }}>
        <Header className="partner-header">
          {/* Кнопка мобильного меню */}
          <button
            className="mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen(true)}
            type="button"
            aria-label="Открыть меню"
            style={{
              display: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              marginRight: '12px',
              border: 'none',
              background: 'transparent',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <MenuOutlined style={{ fontSize: 20, color: 'var(--color-text-primary)' }} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, position: 'relative' }}>
            <div className={`partner-search ${isSearchActive ? 'active' : ''}`}>
              <Input
                ref={searchInputRef}
                className="partner-search-input"
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onPressEnter={(e) => handleSearch((e.target as HTMLInputElement).value)}
                onFocus={() => {
                  if (searchQuery.trim().length >= 2) {
                    // Показываем результаты если есть запрос
                  }
                }}
                onBlur={() => {
                  // Не закрываем сразу, чтобы можно было кликнуть на результат
                  setTimeout(() => {
                    if (!searchQuery.trim()) {
                      setIsSearchActive(false);
                    }
                  }, 200);
                }}
                allowClear
              />
              <button
                className="partner-search-btn"
                onClick={handleSearchToggle}
                type="button"
              >
                <SearchOutlined />
              </button>
              {isSearchActive && (
                <SearchResults
                  query={searchQuery}
                  visible={isSearchActive && searchQuery.trim().length >= 2}
                  onClose={() => {
                    setSearchQuery('');
                    setIsSearchActive(false);
                  }}
                />
              )}
            </div>
          </div>
          <div className="partner-header-actions">
            <Select
              value={language}
              onChange={handleLanguageChange}
              style={{ width: 110 }}
              suffixIcon={<GlobalOutlined />}
              options={[
                { label: 'Русский', value: 'ru' },
                { label: 'English', value: 'en' },
                { label: 'Кыргызча', value: 'kg' },
              ]}
            />
            <div 
              className="partner-header-notification"
              onClick={() => setIsNotificationOpen(true)}
            >
              <Badge 
                count={unreadNotificationsCount > 0 ? unreadNotificationsCount : 0} 
                size="small"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <BellOutlined style={{ fontSize: 18, color: 'var(--color-text-primary)', cursor: 'pointer' }} />
              </Badge>
            </div>
            <Dropdown 
              menu={{ items: userMenuItems }} 
              placement="bottomRight" 
              trigger={['click']}
            >
              <div className="partner-header-user">
                <div className="partner-header-user-avatar">
                  <Avatar 
                    src={user?.avatar_url} 
                    icon={<UserOutlined />} 
                    style={{ 
                      backgroundColor: '#689071',
                      width: 36,
                      height: 36,
                    }} 
                  />
                  <span className="partner-header-user-online" />
                </div>
                <div className="partner-header-user-info">
                  <span className="partner-header-user-name">
                    {user?.username || user?.email || 'Партнер'}
                  </span>
                  <span className="partner-header-user-role">Партнер</span>
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className="partner-content fade-in">
          {children}
        </Content>
      </Layout>

      {/* Мобильное меню */}
      <MobileMenu
        open={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Центр уведомлений */}
      <NotificationCenter
        open={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />

      {/* Модальное окно редактирования профиля */}
      <Modal
        title="Редактировать профиль"
        open={isProfileModalOpen}
        onCancel={() => {
          setIsProfileModalOpen(false);
          profileForm.resetFields();
        }}
        onOk={handleSaveProfile}
        okText="Сохранить"
        cancelText="Отмена"
        width={500}
      >
        <Form form={profileForm} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item
            name="username"
            label="Имя пользователя"
            rules={[
              { required: true, message: 'Введите имя пользователя' },
              { min: 3, message: 'Минимум 3 символа' },
            ]}
          >
            <Input placeholder="Введите имя пользователя" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Введите email' },
              { type: 'email', message: 'Некорректный email' },
            ]}
          >
            <Input placeholder="Введите email" />
          </Form.Item>
          <Form.Item
            name="avatar"
            label="Фото профиля"
            valuePropName="fileList"
            getValueFromEvent={(e) => {
              if (Array.isArray(e)) return e;
              return e?.fileList;
            }}
          >
            <Upload
              name="avatar"
              listType="picture-card"
              maxCount={1}
              beforeUpload={() => false}
            >
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="avatar" style={{ width: '100%' }} />
              ) : (
                <div>
                  <UserOutlined />
                  <div style={{ marginTop: 8 }}>Загрузить</div>
                </div>
              )}
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

