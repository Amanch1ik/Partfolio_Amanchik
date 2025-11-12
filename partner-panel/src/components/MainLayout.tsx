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
  ApiOutlined,
  CreditCardOutlined,
  BellOutlined,
  SearchOutlined,
  LogoutOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/hooks/useAuth';
import { NotificationCenter } from './NotificationCenter';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'ru');
  const [profileForm] = Form.useForm();
  const searchInputRef = React.useRef<any>(null);
  
  // Используем данные из useAuth или дефолтные значения
  const user: User = authUser || {
    id: '1',
    email: 'partner@example.com',
    username: 'Партнер',
    avatar_url: '',
    role: 'partner',
  };
  
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

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: 'Главная',
    },
    {
      key: '/profile',
      icon: <UserOutlined />,
      label: 'Профиль партнера',
    },
    {
      key: '/locations',
      icon: <EnvironmentOutlined />,
      label: 'Локации партнёра',
    },
    {
      key: '/promotions',
      icon: <ShoppingOutlined />,
      label: 'Акции и сторисы',
    },
    {
      key: '/transactions',
      icon: <UnorderedListOutlined />,
      label: 'Транзакции',
    },
    {
      key: '/employees',
      icon: <TeamOutlined />,
      label: 'Сотрудники',
    },
    {
      key: '/integrations',
      icon: <ApiOutlined />,
      label: 'Интеграции',
    },
    {
      key: '/billing',
      icon: <CreditCardOutlined />,
      label: 'Биллинг',
    },
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
      label: 'Профиль',
      icon: <UserOutlined />,
      onClick: handleProfileClick,
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      label: 'Выйти',
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
          background: '#ffffff',
          boxShadow: '2px 0 8px rgba(0,0,0,0.06)',
        }}
      >
        <div className="partner-logo">
          <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 24 }}>Yess!Partner</span>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          className="partner-menu"
          style={{ 
            borderRight: 0,
            background: '#ffffff',
          }}
          theme="light"
        />
      </Sider>
      <Layout style={{ marginLeft: 0, transition: 'margin-left 0.3s ease' }}>
        <Header className="partner-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
            <div className={`partner-search ${isSearchActive ? 'active' : ''}`}>
              <Input
                ref={searchInputRef}
                className="partner-search-input"
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onPressEnter={(e) => handleSearch((e.target as HTMLInputElement).value)}
                onBlur={() => {
                  // Закрываем поиск только если поле пустое
                  if (!searchQuery.trim()) {
                    setIsSearchActive(false);
                  }
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
                count={5} 
                size="small"
                style={{ backgroundColor: '#689071' }}
              >
                <BellOutlined style={{ fontSize: 18, color: '#0F2A1D', cursor: 'pointer' }} />
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

      {/* Центр уведомлений */}
      <NotificationCenter
        open={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        notifications={[
          {
            id: '1',
            title: 'Новая акция создана',
            message: 'Ваша акция "Скидка 20%" успешно опубликована',
            type: 'success',
            timestamp: '2 минуты назад',
            read: false,
          },
          {
            id: '2',
            title: 'Новый сотрудник добавлен',
            message: 'Peter Taylor был добавлен в систему',
            type: 'info',
            timestamp: '1 час назад',
            read: false,
          },
          {
            id: '3',
            title: 'Платеж получен',
            message: 'Платеж на сумму 10,000 сом успешно обработан',
            type: 'success',
            timestamp: '3 часа назад',
            read: true,
          },
        ]}
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

