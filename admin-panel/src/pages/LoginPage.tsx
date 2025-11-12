import { useState, useRef } from 'react';
import { Button, Input, Form, message, Space, Alert } from 'antd';
import { UserOutlined, LockOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import './LoginPage.css';

export const LoginPage = () => {
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
      
      setErrorMessage(null); // Очищаем предыдущие ошибки
    setLoading(true);
      
      try {
        const response = await api.authApi.login(values.username, values.password);
        
        if (response && response.access_token) {
          // Токен уже сохранен в adminApi.login()
          setUser(response.admin || { 
            id: '1',
            email: values.username,
            role: 'admin'
          });
          message.success('Успешный вход!');
          navigate('/');
        } else {
          setErrorMessage('Неверные учетные данные. Проверьте имя пользователя и пароль.');
          message.error('Неверные учетные данные');
        }
      } catch (error: any) {
        console.error('Login error:', error);
        
        // Обработка различных типов ошибок
        let errorText = 'Ошибка при входе. Попробуйте снова.';
        
        // Проверка на технические ошибки JavaScript
        if (error?.message && (
          error.message.includes('is not a function') ||
          error.message.includes('Cannot read') ||
          error.message.includes('undefined')
        )) {
          console.error('Technical error detected:', error);
          errorText = '⚠️ Произошла техническая ошибка. Пожалуйста, обновите страницу и попробуйте снова.';
        } 
        // Проверка на сетевые ошибки (когда нет response или status === 0)
        else if (!error?.response || error.response?.status === 0) {
          if (error?.message) {
            if (error.message.includes('timeout') || error.code === 'ECONNABORTED') {
              errorText = '⏱️ Превышено время ожидания. Интернет-соединение слишком медленное или нестабильное. Проверьте подключение и попробуйте снова.';
            } else if (error.message.includes('Network Error') || error.message.includes('Failed to fetch')) {
              errorText = '🌐 Нет соединения с сервером. Убедитесь, что сервер запущен на http://localhost:8000 и попробуйте снова.';
            } else {
              // Если есть detail от интерсептора, используем его
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
        // Обработка HTTP ошибок (когда есть response с статусом)
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
              // Используем detail если есть, иначе общее сообщение
              if (detail) {
                errorText = detail;
              } else {
                errorText = `Ошибка ${status}. Попробуйте снова.`;
              }
          }
        } 
        // Обработка других ошибок
        else if (error?.message) {
          if (error.message.includes('non ISO-8859-1') || error.message.includes('setRequestHeader')) {
            errorText = '🔤 Ошибка кодирования данных. Пожалуйста, очистите кеш браузера и войдите заново.';
          } else {
            errorText = '⚠️ Произошла ошибка при входе. Проверьте подключение к интернету и попробуйте снова.';
          }
        }
        
        setErrorMessage(errorText);
        // Убираем эмодзи из toast сообщения
        const toastMessage = errorText.replace(/[❌🚫👤⏱️🔧🌐🔤⚠️]/g, '').trim();
        message.error(toastMessage || 'Ошибка при входе');
    } finally {
      setLoading(false);
      }
    });
  };

  const onFinishFailed = (errorInfo: any) => {
    // Показываем ошибки валидации сразу
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
          {/* Название приложения */}
          <div className="login-logo">
            <h1>YESS!Partner</h1>
          </div>

          <div className="login-header">
            <h2>Вход в админ-панель</h2>
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
                placeholder="admin"
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
              <code>👤 Имя: admin</code>
              <code>🔒 Пароль: admin</code>
            </Space>
          </div>
        </div>

        {/* Нижний текст */}
        <p className="login-footer">
          © 2025 Yess Loyalty. Все права защищены.
        </p>
      </div>
    </div>
  );
};
