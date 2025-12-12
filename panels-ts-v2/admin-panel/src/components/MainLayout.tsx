import { useState, useEffect, useRef } from 'react';
import { Layout, Menu, Avatar, Dropdown, Badge, Input, Modal, Form, Upload, Select, Space, Button } from 'antd';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  LogoutOutlined,
  SearchOutlined,
  GlobalOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  EnvironmentOutlined,
  PlayCircleOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import i18n, { t } from '@/i18n';
import { NotificationCenter } from './NotificationCenter';
import { SearchResults } from './SearchResults';
import { useTheme } from '@/hooks/useTheme';
import { useMessage } from '@/hooks/useMessage';
import { MobileMenu } from './MobileMenu';
import { useI18nContext } from '@/i18nGatewayContext';
import './MainLayout.css';
import '../styles/animations.css';

const { Header, Sider, Content } = Layout;

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { language, setLanguage } = useI18nContext();
  const [profileForm] = Form.useForm();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, setUser } = useAuth();

  // Определение мобильного устройства
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const searchInputRef = useRef<any>(null);
  const message = useMessage();
  
  // Debounce для предотвращения double-click
  const lastClickRef = useRef<number>(0);
  const debounceClick = (callback: () => void, delay = 300) => {
    const now = Date.now();
    if (now - lastClickRef.current > delay) {
      lastClickRef.current = now;
      callback();
    }
  };

  // Получаем уведомления
  const { data: notificationsResponse } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      try {
        const response = await api.notificationsApi.getAll();
        const payload: any = (response as any)?.data ?? response;
        const items = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.items)
            ? payload.items
            : [];
        return items;
      } catch (error) {
        console.error('Failed to load notifications:', error);
        return [];
      }
    },
    refetchInterval: 30000,
    staleTime: 5000,
    gcTime: 60000,
  });

  const notifications = Array.isArray(notificationsResponse) ? notificationsResponse : [];
  const unreadNotifications = notifications.filter((n: any) => !n.is_read);
  const unreadCount = unreadNotifications.length;

  // Меняем язык
  const handleLanguageChange = (lang: string) => {
    if (lang === language) return;
    setLanguage(lang as any);
    const langName = lang === 'ru' ? t('language.russian', 'Русский') : lang === 'en' ? t('language.english', 'English') : t('language.kyrgyz', 'Кыргызча');
    // Функция t принимает только ключ и значение по умолчанию, поэтому плейсхолдер подставляем вручную
    const changedText = t('language.changed', 'Язык изменён на {lang}').replace('{lang}', langName);
    message.success(changedText);
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
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    debounceClick(() => {
      logout();
      navigate('/login');
    });
  };

  // Меню навигации с переводами
  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: <Link to="/">{t('nav.home')}</Link>,
    },
    {
      key: '/users',
      icon: <UserOutlined />,
      label: <Link to="/users">{t('nav.users')}</Link>,
    },
    {
      key: '/partners',
      icon: <ShopOutlined />,
      label: <Link to="/partners">{t('nav.partners')}</Link>,
    },
    {
      key: '/partners/map',
      icon: <EnvironmentOutlined />,
      label: <Link to="/partners/map">{t('nav.partnersMap', 'Карта партнеров')}</Link>,
    },
    {
      key: '/transactions',
      icon: <TransactionOutlined />,
      label: <Link to="/transactions">{t('nav.transactions')}</Link>,
    },
    {
      key: '/promotions',
      icon: <GiftOutlined />,
      label: <Link to="/promotions">{t('nav.promotions')}</Link>,
    },
    {
      key: '/stories',
      icon: <PlayCircleOutlined />,
      label: <Link to="/stories">{t('nav.stories', 'Сторисы')}</Link>,
    },
    {
      key: '/referrals',
      icon: <TeamOutlined />,
      label: <Link to="/referrals">{t('nav.referrals')}</Link>,
    },
    {
      key: '/notifications',
      icon: <BellOutlined />,
      label: (
        <Link to="/notifications" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{t('nav.notifications')}</span>
          <Badge count={unreadCount} size="small" style={{ backgroundColor: '#52c41a' }} />
        </Link>
      ),
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: <Link to="/settings">{t('nav.settings')}</Link>,
    },
    {
      key: '/audit',
      icon: <AuditOutlined />,
      label: <Link to="/audit">{t('nav.audit')}</Link>,
    },
    {
      key: '/monitoring',
      icon: <BarChartOutlined />,
      label: <Link to="/monitoring">{t('nav.monitoring', 'Мониторинг')}</Link>,
    },
  ];

  // Обновление профиля
  const updateProfileMutation = useMutation({
    mutationFn: async (values: any) => {
      let avatarUrl = user?.avatar_url;
      if (values.avatar && values.avatar[0]?.originFileObj) {
        // Пока backend-эндпоинт загрузки аватара не реализован,
        // сохраняем аватар только локально (base64) без сетевого запроса.
        const reader = new FileReader();
        avatarUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = (e) => {
            const base64 = e.target?.result as string;
            resolve(base64);
          };
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(values.avatar[0].originFileObj);
        });
      }
      
      const updateData = { ...values, avatar_url: avatarUrl };
      delete updateData.avatar;
      
      // Эмулируем успешное обновление профиля локально без запроса к backend.
      return { data: { ...(user || {}), ...updateData } };
    },
    onSuccess: (response) => {
      const updatedUser = (response as any)?.data || (response as any) || {};
      setUser({
        id: updatedUser.id?.toString() || user?.id || '1',
        email: updatedUser.email || updatedUser.username || user?.email || '',
        username: updatedUser.username || updatedUser.email || user?.email || '',
        avatar_url: updatedUser.avatar_url || user?.avatar_url,
        role: updatedUser.is_superadmin ? 'admin' : 'partner_admin',
      });
      message.success(t('profile.updated', 'Профиль успешно обновлен (локально)'));
      setIsProfileModalOpen(false);
      profileForm.resetFields();
    },
    onError: () => {
      message.error(t('profile.updateError', 'Ошибка при обновлении профиля'));
    },
  });

  const handleAdminClick = () => {
    // Заполняем форму данными пользователя
    if (user) {
      profileForm.setFieldsValue({
        username: user.username || user.email || '',
        email: user.email || '',
        avatar: user.avatar_url ? [{
          uid: '-1',
          name: 'avatar',
          status: 'done',
          url: user.avatar_url,
        }] : [],
      });
    }
    setIsProfileModalOpen(true);
  };

  const handleSaveProfile = () => {
    profileForm.validateFields().then((values) => {
      updateProfileMutation.mutate(values);
    });
  };

  const userMenuItems = [
    {
      key: 'profile',
      label: t('nav.admin', 'Админ'),
      icon: <UserOutlined />,
      onClick: handleAdminClick,
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

  // Определяем активный пункт меню (для карты партнеров тоже выбираем /partners)
  const selectedKeys = location.pathname === '/partners/map' ? ['/partners/map'] : [location.pathname];

  return (
    <Layout className="main-layout">
      <Sider
        className="sidebar"
        collapsible={false}
        width={250}
        style={{
          background: 'linear-gradient(180deg, #689071 0%, #4a6b52 100%)',
          boxShadow: 'var(--shadow-md)',
        }}
        role="navigation"
        aria-label={t('common.mainNavigation', 'Основная навигация')}
      >
        <div className="sidebar-logo">
          <span style={{ color: 'var(--color-text-inverse)', fontWeight: 'bold', fontSize: 24 }} aria-label="YESS! Admin Panel">
            YESS!Admin
          </span>
        </div>
        <Menu
          mode="inline"
          selectedKeys={selectedKeys}
          items={menuItems}
          className="sidebar-menu"
          aria-label={t('common.menu', 'Меню навигации')}
          style={{
            borderRight: 0,
            background: 'transparent',
          }}
          theme="dark"
        />
        <div className="sidebar-bottom-menu">
          <Menu
            mode="inline"
            items={[
              {
                key: 'admin',
                icon: <UserOutlined />,
                label: t('nav.admin', 'Админ'),
                onClick: handleAdminClick,
              },
              {
                key: 'logout',
                icon: <LogoutOutlined />,
                label: t('nav.logout', 'Выйти'),
                onClick: handleLogout,
              },
            ]}
            style={{ borderRight: 0, background: 'transparent' }}
            theme="light"
          />
        </div>
      </Sider>
      <Layout style={{ marginLeft: 0, transition: 'margin-left 0.3s ease' }}>
        <Header className="main-header" role="banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, position: 'relative' }}>
            <div className={`admin-search ${isSearchActive ? 'active' : ''}`} role="search">
              <Input
                ref={searchInputRef}
                className="admin-search-input"
                placeholder={t('common.search', 'Поиск...')}
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
                aria-label={t('common.search', 'Поиск')}
                aria-expanded={isSearchActive}
                aria-haspopup="listbox"
              />
              <button
                className="admin-search-btn"
                onClick={handleSearchToggle}
                type="button"
                aria-label={isSearchActive ? t('common.closeSearch', 'Закрыть поиск') : t('common.openSearch', 'Открыть поиск')}
                aria-expanded={isSearchActive}
              >
                <SearchOutlined aria-hidden="true" />
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
          <nav className="header-actions" aria-label={t('common.headerActions', 'Действия заголовка')}>
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
              aria-label={t('common.language', 'Выбор языка')}
            />
            <button
              className="header-notification"
              onClick={() => setIsNotificationOpen(true)}
              aria-label={`${t('common.notifications', 'Уведомления')}${unreadCount > 0 ? ` (${unreadCount} ${t('common.unread', 'непрочитанных')})` : ''}`}
                style={{
                  cursor: 'pointer',
                  border: 'none',
                  background: 'transparent',
                  padding: '8px',
                  borderRadius: '8px',
                }}
            >
              <Badge
                count={unreadCount}
                size="small"
                style={{ backgroundColor: unreadCount > 0 ? 'var(--color-primary)' : '#d9d9d9' }}
              >
                <BellOutlined style={{ fontSize: 18, color: 'var(--color-text-primary)' }} aria-hidden="true" />
              </Badge>
            </button>
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              trigger={['click']}
            >
              <button
                className="header-user"
                aria-label={`${t('common.userMenu', 'Меню пользователя')}: ${user?.username || user?.email || t('common.user', 'Пользователь')}`}
                aria-haspopup="menu"
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px',
                  borderRadius: '8px',
                }}
              >
                <div className="header-user-avatar">
                  <Avatar
                    src={user?.avatar_url}
                    icon={<UserOutlined />}
                    alt={t('common.avatar', 'Аватар пользователя')}
                    style={{
                      backgroundColor: 'var(--color-success)',
                      width: 36,
                      height: 36,
                    }}
                  />
                  <span className="header-user-online" aria-label={t('common.online', 'В сети')} />
                </div>
                <div className="header-user-info">
                  <span className="header-user-name">
                    {user?.username || user?.email || t('common.user', 'Пользователь')}
                  </span>
                  <span className="header-user-role">{t('common.manager', 'Менеджер')}</span>
                </div>
              </button>
              </Dropdown>
          </nav>
        </Header>
        <Content className="main-content fade-in">
          {children}
        </Content>
      </Layout>

      {/* Модальное окно редактирования профиля */}
      <Modal
        title={t('profile.edit', 'Редактировать профиль')}
        open={isProfileModalOpen}
        onCancel={() => {
          setIsProfileModalOpen(false);
          profileForm.resetFields();
        }}
        onOk={handleSaveProfile}
        okText={t('common.save', 'Сохранить')}
        cancelText={t('common.cancel', 'Отмена')}
        confirmLoading={updateProfileMutation.isPending}
        width={500}
      >
        <Form form={profileForm} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item
            name="username"
            label={t('profile.username', 'Имя пользователя')}
            rules={[
              { required: true, message: t('profile.usernameRequired', 'Введите имя пользователя') },
              { min: 3, message: t('profile.usernameMinLength', 'Минимум 3 символа') },
            ]}
          >
            <Input placeholder={t('profile.usernamePlaceholder', 'Введите имя пользователя')} />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: t('profile.emailRequired', 'Введите email') },
              { type: 'email', message: t('profile.emailInvalid', 'Некорректный email') },
            ]}
          >
            <Input placeholder={t('profile.emailPlaceholder', 'Введите email')} />
          </Form.Item>
          <Form.Item
            name="avatar"
            label={t('profile.photo', 'Фото профиля')}
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
                  <div style={{ marginTop: 8 }}>{t('profile.upload', 'Загрузить')}</div>
                </div>
              )}
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      {/* Центр уведомлений */}
      <NotificationCenter
        open={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        notifications={
          Array.isArray(notifications)
            ? (notifications as any[]).map((notif: any) => ({
                id: String(notif.id ?? notif.notification_id ?? Math.random()),
                title: notif.title || t('notifications.notification', 'Уведомление'),
                message: notif.message || '',
                type: 'info' as const,
                timestamp: notif.created_at
                  ? new Date(notif.created_at).toLocaleString(language === 'en' ? 'en-US' : 'ru-RU')
                  : t('notifications.justNow', 'Только что'),
                read: Boolean(notif.is_read),
              }))
            : []
        }
      />
    </Layout>
  );
};
