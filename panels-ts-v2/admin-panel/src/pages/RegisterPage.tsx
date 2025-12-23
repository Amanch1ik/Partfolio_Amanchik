import { useState, useRef } from 'react';
import { Button, Input, Form, Space, Alert, App, Row, Col } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, ExclamationCircleOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '@/services/api';
import './LoginPage.css'; // Используем те же стили

export const RegisterPage = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const lastClickRef = useRef<number>(0);

  const debounceClick = (callback: () => void, delay = 500) => {
    const now = Date.now();
    if (now - lastClickRef.current > delay) {
      lastClickRef.current = now;
      callback();
    }
  };

  const onFinish = async (values: any) => {
    debounceClick(async () => {
      if (loading) return;
      setErrorMessage(null);
      setLoading(true);
      
      try {
        console.log('📝 RegisterPage: Отправка данных регистрации');
        await api.authApi.register({
          username: values.username,
          email: values.email,
          password: values.password,
          role: 'admin'
        });
        
        message.success('Регистрация успешна! Теперь вы можете войти.');
        navigate('/login');
      } catch (error: any) {
        console.error('Registration error:', error);
        console.error('Error response data:', error.response?.data);
        
        // Пытаемся извлечь детальное сообщение об ошибке
        const data = error.response?.data;
        let detail = 'Ошибка при регистрации';
        
        if (data) {
          if (typeof data === 'string') detail = data;
          else if (data.error) detail = data.error;
          else if (data.detail) detail = data.detail;
          else if (data.message) detail = data.message;
          else if (data.errors) {
            // Обработка ошибок валидации (например, от ASP.NET Core)
            detail = Object.values(data.errors).flat().join(', ');
          } else if (data.title) detail = data.title;
        } else {
          detail = error.message;
        }
        
        setErrorMessage(detail);
        message.error(detail);
      } finally {
        setLoading(false);
      }
    });
  };

  return (
    <div className="login-container">
      <div className="login-right">
        <div className="login-form-container">
          <div className="login-logo">
            <h1>YESS!Admin</h1>
          </div>

          <div className="login-header">
            <h2>Регистрация админа</h2>
            <p>Создайте новую учетную запись администратора</p>
          </div>

          {errorMessage && (
            <Alert
              message={errorMessage}
              type="error"
              icon={<ExclamationCircleOutlined />}
              showIcon
              closable
              style={{ marginBottom: 24 }}
            />
          )}

          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            className="login-form"
          >
            <Form.Item
              name="username"
              label="Имя пользователя"
              rules={[{ required: true, message: 'Введите имя пользователя' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="admin_new" size="large" />
            </Form.Item>

            <Form.Item
              name="email"
              label="Email"
              rules={[{ required: true, type: 'email', message: 'Введите корректный email' }]}
            >
              <Input prefix={<MailOutlined />} placeholder="admin@yessgo.org" size="large" />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="firstName" label="Имя">
                  <Input placeholder="Иван" size="large" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="lastName" label="Фамилия">
                  <Input placeholder="Иванов" size="large" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="password"
              label="Пароль"
              extra="Минимум 8 символов, рекомендуем добавить цифры и спецсимволы"
              rules={[
                { required: true, message: 'Введите пароль' },
                { min: 8, message: 'Минимум 8 символов' }
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="••••••••" size="large" />
            </Form.Item>

            <Form.Item
              name="confirm"
              label="Подтвердите пароль"
              dependencies={['password']}
              rules={[
                { required: true, message: 'Подтвердите пароль' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Пароли не совпадают'));
                  },
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="••••••••" size="large" />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={loading}
                block
              >
                Зарегистрироваться
              </Button>
            </Form.Item>

            <div style={{ textAlign: 'center' }}>
              <Link to="/login">
                <Button type="link" icon={<ArrowLeftOutlined />}>
                  Вернуться ко входу
                </Button>
              </Link>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
};

