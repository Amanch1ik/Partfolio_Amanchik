import { Card, Form, Input, Button, Upload, Avatar, Space, Divider, Row, Col } from 'antd';
import { UserOutlined, UploadOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';

export const ProfilePage = () => {
  const [form] = Form.useForm();

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
            <Avatar
              size={120}
              icon={<UserOutlined />}
              style={{
                backgroundColor: '#689071',
                marginBottom: 16,
              }}
            />
            <h2 style={{ color: '#0F2A1D', marginTop: 0 }}>Ваш профиль</h2>
            <p style={{ color: '#689071', marginBottom: 16 }}>Обновлено: 2 часа назад</p>
            <Upload>
              <Button
                type="primary"
                icon={<UploadOutlined />}
                style={{
                  background: 'linear-gradient(135deg, #689071 0%, #AEC380 100%)',
                  border: 'none',
                  borderRadius: 12,
                }}
              >
                Загрузить фото
              </Button>
            </Upload>
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
              <Form.Item label="Название компании" name="company_name" required>
                <Input 
                  size="large" 
                  placeholder="Введите название компании"
                  style={{ borderRadius: 12 }}
                />
              </Form.Item>
              <Form.Item label="Email" name="email" required>
                <Input 
                  size="large" 
                  type="email"
                  prefix={<MailOutlined style={{ color: '#689071' }} />}
                  placeholder="your@email.com"
                  style={{ borderRadius: 12 }}
                />
              </Form.Item>
              <Form.Item label="Телефон" name="phone" required>
                <Input 
                  size="large" 
                  prefix={<PhoneOutlined style={{ color: '#689071' }} />}
                  placeholder="+996 ..." 
                  style={{ borderRadius: 12 }}
                />
              </Form.Item>
              <Form.Item label="Описание" name="description">
                <Input.TextArea
                  placeholder="Расскажите о вашей компании"
                  rows={4}
                  style={{ borderRadius: 12 }}
                />
              </Form.Item>
              <Form.Item>
                <Space size="middle" style={{ width: '100%', justifyContent: 'flex-end' }}>
                  <Button
                    size="large"
                    style={{
                      borderRadius: 12,
                      border: '1px solid #E3EED4',
                    }}
                  >
                    Отмена
                  </Button>
                  <Button
                    type="primary"
                    size="large"
                    style={{
                      background: 'linear-gradient(135deg, #689071 0%, #AEC380 100%)',
                      border: 'none',
                      borderRadius: 12,
                    }}
                  >
                    💾 Сохранить изменения
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

