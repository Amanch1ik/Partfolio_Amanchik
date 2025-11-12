import { useState, useEffect, useRef } from 'react';
import { Layout, Menu, Avatar, Dropdown, Badge, Input, message, Modal, Form, Upload, Select, Space } from 'antd';
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
} from '@ant-design/icons';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import i18n, { t } from '@/i18n';
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
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'ru');
  const [profileForm] = Form.useForm();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, setUser } = useAuth();
  const queryClient = useQueryClient();
  const searchInputRef = useRef<any>(null);
  
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
        const data = Array.isArray(response?.data) ? response.data : (response?.items || []);
        return data;
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
  const unreadCount = unreadNotifications.length || 24; // Fallback для демо

  // Меняем язык
  const handleLanguageChange = (lang: string) => {
    if (lang === language) return;
    setLanguage(lang);
    i18n.setLanguage(lang as 'ru' | 'en' | 'kg');
    const langName = lang === 'ru' ? t('language.russian', 'Русский') : lang === 'en' ? t('language.english', 'English') : t('language.kyrgyz', 'Кыргызча');
    message.success(t('language.changed', 'Язык изменён на {lang}', { lang: langName }).replace('{lang}', langName));
    // Перезагружаем страницу для применения переводов
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
      label: (
        <Link to="/partners" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{t('nav.partners')}</span>
          <Badge count={2} size="small" style={{ backgroundColor: '#ff4d4f' }} />
        </Link>
      ),
    },
    {
      key: '/partners/map',
      icon: <EnvironmentOutlined />,
      label: <Link to="/partners/map">{t('nav.partnersMap', 'Карта партнеров')}</Link>,
    },
    {
      key: '/transactions',
      icon: <TransactionOutlined />,
      label: (
        <Link to="/transactions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{t('nav.transactions')}</span>
          <Badge count={2} size="small" style={{ backgroundColor: '#ff4d4f' }} />
        </Link>
      ),
    },
    {
      key: '/promotions',
      icon: <GiftOutlined />,
      label: (
        <Link to="/promotions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{t('nav.promotions')}</span>
          <Badge count={2} size="small" style={{ backgroundColor: '#ff4d4f' }} />
        </Link>
      ),
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
  ];

  // Обновление профиля
  const updateProfileMutation = useMutation({
    mutationFn: async (values: any) => {
      let avatarUrl = user?.avatar_url;
      if (values.avatar && values.avatar[0]?.originFileObj) {
        try {
          const formData = new FormData();
          formData.append('file', values.avatar[0].originFileObj);
          const uploadResponse = await api.post('/api/v1/admin/upload/avatar', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          avatarUrl = uploadResponse.data.url || uploadResponse.data.avatar_url;
        } catch (error) {
          const reader = new FileReader();
          avatarUrl = await new Promise<string>((resolve) => {
            reader.onload = (e) => {
              const base64 = e.target?.result as string;
              localStorage.setItem('admin_avatar', base64);
              resolve(base64);
            };
            reader.onerror = () => resolve(user?.avatar_url || '');
            reader.readAsDataURL(values.avatar[0].originFileObj);
          });
        }
      }
      
      const updateData = { ...values, avatar_url: avatarUrl };
      delete updateData.avatar;
      
      const currentUser = { ...user, ...updateData };
      localStorage.setItem('admin_profile', JSON.stringify(currentUser));
      
      return api.put(`/api/v1/admin/admins/${user?.id || 1}`, updateData);
    },
    onSuccess: (response) => {
      if (response?.data?.admin || response?.data) {
        const updatedUser = response.data.admin || response.data;
        setUser({
          id: updatedUser.id?.toString() || user?.id || '1',
          email: updatedUser.email || updatedUser.username || user?.email || '',
          username: updatedUser.username || updatedUser.email || user?.email || '',
          avatar_url: updatedUser.avatar_url || user?.avatar_url,
          role: updatedUser.is_superadmin ? 'admin' : 'partner_admin',
        });
      }
      message.success(t('profile.updated', 'Профиль успешно обновлен'));
      setIsProfileModalOpen(false);
      profileForm.resetFields();
    },
    onError: (error: any) => {
      const formValues = profileForm.getFieldsValue();
      const savedAvatar = localStorage.getItem('admin_avatar');
      const updatedUser = { ...user, ...formValues, avatar_url: savedAvatar || user?.avatar_url };
      setUser(updatedUser as any);
      localStorage.setItem('admin_profile', JSON.stringify(updatedUser));
      message.success(t('profile.savedLocally', 'Профиль сохранен локально'));
      setIsProfileModalOpen(false);
      profileForm.resetFields();
    },
  });

  const handleAdminClick = () => {
    const savedProfile = localStorage.getItem('admin_profile');
    const savedAvatar = localStorage.getItem('admin_avatar');
    
    if (savedProfile) {
      try {
        const profile = JSON.parse(savedProfile);
        profileForm.setFieldsValue({
          username: profile.username || user?.email || '',
          email: profile.email || user?.email || '',
          full_name: profile.full_name || '',
          avatar: savedAvatar ? [{ url: savedAvatar, status: 'done' }] : undefined,
        });
      } catch {
        profileForm.setFieldsValue({
          username: user?.email || '',
          email: user?.email || '',
        });
      }
    } else {
      profileForm.setFieldsValue({
        username: user?.email || '',
        email: user?.email || '',
        avatar: savedAvatar ? [{ url: savedAvatar, status: 'done' }] : undefined,
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
          background: '#ffffff',
          boxShadow: '2px 0 8px rgba(0,0,0,0.06)',
        }}
      >
        <div className="sidebar-logo">
          <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 24 }}>YESS!Partner</span>
        </div>
        <Menu
          mode="inline"
          selectedKeys={selectedKeys}
          items={menuItems}
          className="sidebar-menu"
          style={{ 
            borderRight: 0,
            background: '#ffffff',
          }}
          theme="light"
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
            style={{ borderRight: 0, background: '#ffffff' }}
            theme="light"
          />
        </div>
      </Sider>
      <Layout style={{ marginLeft: 0, transition: 'margin-left 0.3s ease' }}>
        <Header className="main-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
            <div className={`admin-search ${isSearchActive ? 'active' : ''}`}>
              <Input
                ref={searchInputRef}
                className="admin-search-input"
                placeholder={t('common.search', 'Поиск...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onPressEnter={(e) => handleSearch((e.target as HTMLInputElement).value)}
                onBlur={() => {
                  if (!searchQuery.trim()) {
                    setIsSearchActive(false);
                  }
                }}
                allowClear
              />
              <button
                className="admin-search-btn"
                onClick={handleSearchToggle}
                type="button"
              >
                <SearchOutlined />
              </button>
            </div>
          </div>
          <div className="header-actions">
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
            <Dropdown
              menu={{
                items: (unreadNotifications as any[])?.slice(0, 5).map((notif: any) => ({
                  key: notif.id,
                  label: (
                    <div style={{ maxWidth: 300, padding: '8px 0' }}>
                      <p style={{ margin: 0, fontWeight: 500 }}>{notif.title || t('notifications.notification', 'Уведомление')}</p>
                      <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: 12 }}>
                        {notif.message}
                      </p>
                    </div>
                  ),
                })) || [],
              }}
              placement="bottomRight"
              trigger={['click']}
            >
              <div className="header-notification">
                <Badge 
                  count={unreadCount} 
                  size="small"
                  style={{ backgroundColor: unreadCount > 0 ? '#52c41a' : '#d9d9d9' }}
                >
                  <BellOutlined style={{ fontSize: 18, color: '#262626' }} />
                </Badge>
              </div>
            </Dropdown>
            <Dropdown 
              menu={{ items: userMenuItems }} 
              placement="bottomRight" 
              trigger={['click']}
            >
              <div className="header-user">
                <div className="header-user-avatar">
                  <Avatar 
                    src={user?.avatar_url} 
                    icon={<UserOutlined />} 
                    style={{ 
                      backgroundColor: '#52c41a',
                      width: 36,
                      height: 36,
                    }} 
                  />
                  <span className="header-user-online" />
                </div>
                <div className="header-user-info">
                  <span className="header-user-name">
                    {user?.username || user?.email || t('common.user', 'Пользователь')}
                  </span>
                  <span className="header-user-role">{t('common.manager', 'Менеджер')}</span>
                </div>
              </div>
            </Dropdown>
          </div>
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
    </Layout>
  );
};
