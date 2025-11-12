import { useState, useRef } from 'react';
import { Layout, Menu, Avatar, Badge, Input, Dropdown, Space, Spin, Select, Modal, Form, Upload, message } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
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
import './MainLayout.css';

const { Header, Sider, Content } = Layout;

interface User {
  id?: string;
  email?: string;
  username?: string;
  avatar_url?: string;
  role?: string;
}

export const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'ru');
  const [profileForm] = Form.useForm();
  const [user, setUser] = useState<User>({
    id: '1',
    email: 'partner@example.com',
    username: 'СыргакТыннаев',
    avatar_url: '',
    role: 'partner',
  });
  
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

  const handleLogout = () => {
    debounceClick(() => {
      localStorage.removeItem('partner_token');
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
      setUser({ ...user, ...values });
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
          <span style={{ color: '#F5A623', fontWeight: 'bold', fontSize: 24 }}>Yess!Partner</span>
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
        <div className="partner-sidebar-bottom">
          <Menu
            mode="inline"
            items={[
              {
                key: 'profile',
                icon: <UserOutlined />,
                label: 'Профиль',
                onClick: handleProfileClick,
              },
              {
                key: 'logout',
                icon: <LogoutOutlined />,
                label: 'Выйти',
                onClick: handleLogout,
              },
            ]}
            style={{ borderRight: 0, background: '#ffffff' }}
            theme="light"
          />
        </div>
      </Sider>
      <Layout style={{ marginLeft: 0, transition: 'margin-left 0.3s ease' }}>
        <Header className="partner-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
            <Input
              className="partner-header-search"
              placeholder="Поиск..."
              prefix={<SearchOutlined style={{ color: '#8c8c8c' }} />}
              style={{ 
                width: 300,
                borderRadius: 20,
                background: '#f5f5f5',
                border: '1px solid #f0f0f0',
              }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onPressEnter={(e) => handleSearch((e.target as HTMLInputElement).value)}
              allowClear
            />
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
            <div className="partner-header-notification">
              <Badge 
                count={5} 
                size="small"
                style={{ backgroundColor: '#F5A623' }}
              >
                <BellOutlined style={{ fontSize: 18, color: '#262626' }} />
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
                      backgroundColor: '#F5A623',
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
          <Outlet />
        </Content>
      </Layout>

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

