import { useState, useEffect } from 'react';
import { Card, Form, Input, Upload, Avatar, Row, Col, Spin, Divider, InputNumber } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined, GlobalOutlined, BankOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import partnerApi from '@/services/partnerApi';
import { useDocumentTitle } from '@shared/hooks/useDocumentTitle';

export const ProfilePage = () => {
  useDocumentTitle('Профиль', 'YESS!GO Partner');
  const [form] = Form.useForm();
  const [avatarList, setAvatarList] = useState<any[]>([]);

  // Используем данные из useAuth вместо отдельного запроса (дедупликация)
  // Это предотвращает дублирование запросов к /partner/me
  const { data: profileData, isLoading } = useQuery({
    queryKey: ['currentPartner'], // Используем тот же ключ, что и useAuth
    queryFn: async () => {
      try {
        const response = await partnerApi.getCurrentPartner();
        return response.data;
      } catch (err) {
        // Если API недоступен, пробуем получить из localStorage
        const savedUser = localStorage.getItem('partner_user');
        if (savedUser) {
          return JSON.parse(savedUser);
        }
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 минут - данные считаются свежими
    gcTime: 10 * 60 * 1000, // 10 минут в кэше
    retry: 1,
    refetchOnMount: false, // Не перезапрашивать если данные уже есть
    refetchOnWindowFocus: false,
    // React Query автоматически дедуплицирует запросы с одинаковым queryKey
    // Если useAuth уже загрузил данные, этот запрос не выполнится
  });

  // Заполняем форму при загрузке данных
  useEffect(() => {
    if (profileData) {
      form.setFieldsValue({
        company_name: profileData.name || profileData.company_name || '',
        email: profileData.email || '',
        phone: profileData.phone || '',
        description: profileData.description || '',
        address: profileData.address || '',
        website: profileData.website || '',
        city_name: profileData.city_name || '',
        bank_account: profileData.bank_account || '',
        max_discount_percent: profileData.max_discount_percent || 0,
        cashback_rate: profileData.cashback_rate || profileData.default_cashback_rate || 0,
        category: profileData.category || '',
        latitude: profileData.latitude,
        longitude: profileData.longitude,
        two_gis_link: profileData.two_gis_link || '',
      });

      // Устанавливаем аватар если есть
      if (profileData.avatar_url || profileData.logo_url) {
        setAvatarList([{
          uid: '-1',
          name: 'avatar',
          status: 'done',
          url: profileData.avatar_url || profileData.logo_url,
        }]);
      }
    }
  }, [profileData, form]);



  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16, color: '#666' }}>Загрузка профиля...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8, color: '#0F2A1D', background: 'linear-gradient(135deg, #0F2A1D 0%, #689071 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
        👤 Профиль партнера
      </h1>
      <p style={{ color: '#689071', marginBottom: 24, fontSize: 14, fontWeight: 500 }}>
        Управляйте информацией вашего профиля и компании
      </p>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card
            style={{
              borderRadius: 16,
              background: 'linear-gradient(135deg, #ffffff 0%, #F0F7EB 100%)',
              border: '2px solid #AEC380',
              boxShadow: '0 4px 12px rgba(104, 144, 113, 0.15)',
              textAlign: 'center',
            }}
          >
            <Upload
              listType="picture-circle"
              fileList={avatarList}
              disabled
              maxCount={1}
              showUploadList={{
                showPreviewIcon: true,
                showRemoveIcon: false,
              }}
            >
              {avatarList.length === 0 && (
                <Avatar
                  size={120}
                  icon={<UserOutlined />}
                  style={{
                    backgroundColor: '#689071',
                    cursor: 'pointer',
                  }}
                />
              )}
            </Upload>
            <h2 style={{ color: '#0F2A1D', marginTop: 16 }}>
              {profileData?.name || profileData?.company_name || 'Ваша компания'}
            </h2>
            <p style={{ color: '#689071', marginBottom: 16 }}>
              {profileData?.email || 'Загрузите фото профиля'}
            </p>
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Card
            title={<span style={{ color: '#0F2A1D', fontSize: 16, fontWeight: 700 }}>ℹ️ Основная информация</span>}
            style={{
              borderRadius: 16,
              background: 'linear-gradient(135deg, #ffffff 0%, #F0F7EB 100%)',
              border: '1px solid #E3EED4',
              boxShadow: '0 2px 12px rgba(15, 42, 29, 0.08)',
            }}
          >
            <Form form={form} layout="vertical">
              <Form.Item
                label="Название компании"
                name="company_name"
                rules={[{ required: true, message: 'Введите название компании' }]}
              >
                <Input
                  size="large"
                  placeholder="Введите название компании"
                  style={{ borderRadius: 12 }}
                  readOnly
                />
              </Form.Item>
              
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Email"
                    name="email"
                    rules={[
                      { required: true, message: 'Введите email' },
                      { type: 'email', message: 'Неверный формат email' }
                    ]}
                  >
                    <Input
                      size="large"
                      type="email"
                      prefix={<MailOutlined style={{ color: '#689071' }} />}
                      placeholder="your@email.com"
                      style={{ borderRadius: 12 }}
                      readOnly
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Телефон"
                    name="phone"
                    rules={[{ required: true, message: 'Введите телефон' }]}
                  >
                    <Input
                      size="large"
                      prefix={<PhoneOutlined style={{ color: '#689071' }} />}
                      placeholder="+996 ..."
                      style={{ borderRadius: 12 }}
                      readOnly
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="Адрес" name="address">
                <Input
                  size="large"
                  placeholder="Адрес"
                  style={{ borderRadius: 12 }}
                  readOnly
                />
              </Form.Item>

              <Form.Item label="Описание" name="description">
                <Input.TextArea
                  placeholder="Расскажите о вашей компании"
                  rows={4}
                  style={{ borderRadius: 12 }}
                  readOnly
                />
              </Form.Item>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item label="Категория" name="category">
                    <Input
                      size="large"
                      placeholder="Категория"
                      style={{ borderRadius: 12 }}
                      readOnly
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Город" name="city_name">
                    <Input 
                      size="large" 
                      placeholder="Город"
                      style={{ borderRadius: 12 }}
                      readOnly
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="Веб-сайт" name="website">
                <Input
                  size="large"
                  prefix={<GlobalOutlined style={{ color: '#689071' }} />}
                  placeholder="https://example.com"
                  style={{ borderRadius: 12 }}
                  readOnly
                />
              </Form.Item>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item label="Кэшбэк (%)" name="cashback_rate">
                    <InputNumber 
                      size="large"
                      min={0}
                      max={100}
                      placeholder="Например: 5"
                      style={{ width: '100%', borderRadius: 12 }}
                      readOnly
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Максимальная скидка (%)" name="max_discount_percent">
                    <InputNumber 
                      size="large"
                      min={0}
                      max={100}
                      placeholder="Например: 20"
                      style={{ width: '100%', borderRadius: 12 }}
                      readOnly
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="Банковский счет" name="bank_account">
                <Input 
                  size="large" 
                  prefix={<BankOutlined style={{ color: '#689071' }} />}
                  placeholder="Номер банковского счета"
                  style={{ borderRadius: 12 }}
                  readOnly
                />
              </Form.Item>

              <Divider />

              <div style={{
                backgroundColor: '#FFF3CD',
                border: '1px solid #FFECB5',
                borderRadius: 12,
                padding: '16px',
                marginTop: 16,
                color: '#856404'
              }}>
                <strong>ℹ️ Для внесения изменений в профиль:</strong><br/>
                Пожалуйста, обратитесь к администратору системы. Все изменения в данных партнера должны быть согласованы и внесены через администраторскую панель.
              </div>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
};
