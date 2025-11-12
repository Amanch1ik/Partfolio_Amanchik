import { useState, useRef } from 'react';
import { Button, Input, Form, Space, Alert, App } from 'antd';
import { UserOutlined, LockOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/services/api';
import './LoginPage.css';

export const LoginPage = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const lastClickRef = useRef<number>(0);

  // Debounce для предотвращения double-click
  const debounceClick = (callback: () => void, delay = 500) => {
    const now = Date.now();
    if (now - lastClickRef.current > delay) {
      lastClickRef.current = now;
      callback();
    }
  };

  const onFinish = async (values: { username: string; password: string }) => {
    debounceClick(async () => {
      if (loading) return;
      
      setErrorMessage(null);
      setLoading(true);
      
      try {
        const response = await api.authApi.login(values.username, values.password);
        
        if (response && response.access_token) {
          // Проверяем, что токен действительно сохранен в partnerApi.login
          const savedToken = localStorage.getItem('partner_token');
          console.log('Login successful:', {
            hasAccessToken: !!response.access_token,
            hasSavedToken: !!savedToken,
            tokenLength: savedToken?.length || 0
          });
          
          // Устанавливаем пользователя с правильной структурой
          const userData = response.partner || response.user || {
            id: response.user_id?.toString() || '1',
            email: values.username,
            username: values.username,
            role: 'partner'
          };
          
          // Устанавливаем пользователя с правильной структурой
          const finalUserData = {
            id: userData.id?.toString() || response.user_id?.toString() || '1',
            email: userData.email || values.username,
            username: userData.username || userData.name || userData.first_name || values.username,
            role: userData.role || 'partner',
            avatar_url: userData.avatar_url,
          };
          
          // Сохраняем в localStorage ПЕРЕД установкой пользователя
          localStorage.setItem('partner_user', JSON.stringify(finalUserData));
          
          // Убеждаемся, что токен сохранен (на случай, если partnerApi.login не сохранил)
          if (!savedToken && response.access_token) {
            localStorage.setItem('partner_token', response.access_token);
            console.log('Token saved manually in LoginPage');
          }
          
          // Устанавливаем пользователя в store
          setUser(finalUserData);
          
          // Принудительно обновляем состояние загрузки
          useAuthStore.getState().setLoading(false);
          
          message.success('Успешный вход!');
          
          // Проверяем токен перед навигацией
          const tokenBeforeNav = localStorage.getItem('partner_token');
          console.log('Before navigation:', {
            hasToken: !!tokenBeforeNav,
            path: '/'
          });
          
          // Небольшая задержка для плавного перехода и обновления состояния
          setTimeout(() => {
            // Еще раз проверяем токен перед навигацией
            const tokenCheck = localStorage.getItem('partner_token');
            if (!tokenCheck) {
              console.error('Token lost before navigation!');
              message.error('Ошибка: токен не сохранен. Попробуйте войти снова.');
              return;
            }
            navigate('/', { replace: true });
          }, 100);
        } else {
          setErrorMessage('Неверные учетные данные. Проверьте имя пользователя и пароль.');
          message.error('Неверные учетные данные');
        }
      } catch (error: any) {
        console.error('Login error:', error);
        
        let errorText = 'Ошибка при входе. Попробуйте снова.';
        
        if (error?.message && (
          error.message.includes('is not a function') ||
          error.message.includes('Cannot read') ||
          error.message.includes('undefined')
        )) {
          console.error('Technical error detected:', error);
          errorText = '⚠️ Произошла техническая ошибка. Пожалуйста, обновите страницу и попробуйте снова.';
        } 
        else if (!error?.response || error.response?.status === 0) {
          if (error?.message) {
            if (error.message.includes('timeout') || error.code === 'ECONNABORTED') {
              errorText = '⏱️ Превышено время ожидания. Интернет-соединение слишком медленное или нестабильное. Проверьте подключение и попробуйте снова.';
            } else if (error.message.includes('Network Error') || error.message.includes('Failed to fetch')) {
              errorText = '🌐 Нет соединения с сервером. Убедитесь, что сервер запущен на http://localhost:8000 и попробуйте снова.';
            } else {
              const detail = error.response?.data?.detail;
              if (detail) {
                errorText = `🌐 ${detail}`;
              } else {
                errorText = '🌐 Не удалось подключиться к серверу. Проверьте, что сервер запущен и попробуйте снова.';
              }
            }
          } else {
            errorText = '🌐 Не удалось подключиться к серверу. Проверьте, что сервер запущен и попробуйте снова.';
          }
        } 
        else if (error?.response) {
          const status = error.response.status;
          const detail = error.response.data?.detail || '';
          
          switch (status) {
            case 401:
              errorText = '❌ Неверное имя пользователя или пароль. Проверьте правильность введенных данных и попробуйте снова.';
              break;
            case 403:
              errorText = '🚫 Доступ запрещен. Ваш аккаунт может быть деактивирован. Обратитесь к администратору.';
              break;
            case 404:
              errorText = '👤 Пользователь не найден. Проверьте правильность имени пользователя.';
              break;
            case 408:
              errorText = '⏱️ Превышено время ожидания ответа от сервера. Возможно, интернет-соединение слишком медленное. Проверьте подключение и попробуйте снова.';
              break;
            case 500:
            case 502:
            case 503:
              errorText = '🔧 Ошибка сервера. Сервер временно недоступен. Попробуйте позже или свяжитесь с поддержкой.';
              break;
            default:
              if (detail) {
                errorText = detail;
              } else {
                errorText = `Ошибка ${status}. Попробуйте снова.`;
              }
          }
        } 
        else if (error?.message) {
          if (error.message.includes('non ISO-8859-1') || error.message.includes('setRequestHeader')) {
            errorText = '🔤 Ошибка кодирования данных. Пожалуйста, очистите кеш браузера и войдите заново.';
          } else {
            errorText = '⚠️ Произошла ошибка при входе. Проверьте подключение к интернету и попробуйте снова.';
          }
        }
        
        setErrorMessage(errorText);
        const toastMessage = errorText.replace(/[❌🚫👤⏱️🔧🌐🔤⚠️]/g, '').trim();
        message.error(toastMessage || 'Ошибка при входе');
      } finally {
        setLoading(false);
      }
    });
  };

  const onFinishFailed = (errorInfo: any) => {
    const firstError = errorInfo.errorFields?.[0];
    if (firstError) {
      const fieldName = firstError.name[0];
      const errorMsg = firstError.errors[0];
      
      let errorText = '';
      if (fieldName === 'username') {
        errorText = `⚠️ Ошибка в поле "Имя пользователя": ${errorMsg}`;
      } else if (fieldName === 'password') {
        errorText = `⚠️ Ошибка в поле "Пароль": ${errorMsg}`;
      } else {
        errorText = `⚠️ ${errorMsg}`;
      }
      
      setErrorMessage(errorText);
      message.warning(errorText.replace(/[⚠️]/g, '').trim());
    }
  };

  return (
    <div className="login-container">
      <div className="login-right">
        <div className="login-form-container">
          <div className="login-logo">
            <h1>YESS!Partner</h1>
            <p className="login-logo-subtitle">Partner</p>
          </div>

          <div className="login-header">
            <h2>Вход в партнерскую панель</h2>
            <p>Введите учетные данные для доступа</p>
          </div>

          {errorMessage && (
            <Alert
              message={errorMessage}
              type={errorMessage.includes('⚠️') ? 'warning' : 'error'}
              icon={<ExclamationCircleOutlined />}
              showIcon
              closable
              onClose={() => setErrorMessage(null)}
              style={{ marginBottom: 24 }}
              className="login-error-alert"
              action={
                errorMessage.includes('кодирования') || errorMessage.includes('кеш') ? (
                  <Button
                    size="small"
                    onClick={() => {
                      localStorage.clear();
                      setErrorMessage(null);
                      message.success('Кеш очищен. Пожалуйста, войдите заново.');
                      form.resetFields();
                    }}
                  >
                    Очистить кеш
                  </Button>
                ) : null
              }
            />
          )}

          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            onFinishFailed={onFinishFailed}
            className="login-form"
            validateTrigger={['onChange', 'onBlur', 'onSubmit']}
          >
            <Form.Item
              name="username"
              label="Имя пользователя"
              rules={[
                { 
                  required: true, 
                  message: 'Введите имя пользователя',
                  whitespace: true
                },
                { 
                  min: 3, 
                  message: 'Имя пользователя должно содержать минимум 3 символа'
                },
                {
                  max: 50,
                  message: 'Имя пользователя не должно превышать 50 символов'
                },
                {
                  pattern: /^[a-zA-Z0-9_@.-]+$/,
                  message: 'Имя пользователя может содержать только буквы, цифры и символы: _ @ . -'
                }
              ]}
              hasFeedback
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="partner"
                size="large"
                className="login-input"
                disabled={loading}
                onFocus={() => setErrorMessage(null)}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Пароль"
              rules={[
                { 
                  required: true, 
                  message: 'Введите пароль'
                },
                { 
                  min: 6, 
                  message: 'Пароль должен содержать минимум 6 символов'
                },
                {
                  max: 128,
                  message: 'Пароль не должен превышать 128 символов'
                }
              ]}
              hasFeedback
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="••••••••"
                size="large"
                className="login-input"
                disabled={loading}
                onFocus={() => setErrorMessage(null)}
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={loading}
                className="login-button"
                block
                disabled={loading}
              >
                {loading ? 'Вход в систему...' : 'Войти'}
              </Button>
            </Form.Item>
          </Form>

          <div className="login-demo">
            <p>💡 Для демо используйте:</p>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <code>👤 Имя: partner</code>
              <code>🔒 Пароль: partner</code>
            </Space>
          </div>
        </div>

        <p className="login-footer">
          © 2025 Yess Loyalty. Все права защищены.
        </p>
      </div>
    </div>
  );
};

