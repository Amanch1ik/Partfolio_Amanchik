import { Card, Table, Tag, Button, Form, Input, Switch, Space, Tooltip } from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import { DeleteButton } from '../components/DeleteButton';

const locationsData = [
  {
    key: '1',
    id: 1,
    name: 'Yess!Go',
    address: 'г.Бишкек Чуйкова 169',
    status: 'open',
  },
  {
    key: '2',
    id: 2,
    name: 'Yess!Market',
    address: 'г.Бишкек Чуйкова 169',
    status: 'open',
  },
  {
    key: '3',
    id: 3,
    name: 'Yess!Food',
    address: 'г.Бишкек Чуйкова 169',
    status: 'closed',
  },
];

export const LocationsPage = () => {
  const [form] = Form.useForm();

  const columns = [
    {
      title: '№',
      key: 'id',
      width: 60,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: 'Название точки',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <span style={{ fontWeight: 600, color: '#8B4513' }}>{name}</span>,
    },
    {
      title: 'Адрес',
      dataIndex: 'address',
      key: 'address',
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag 
          color={status === 'open' ? '#F5A623' : '#ccc'}
          style={{ borderRadius: 12, padding: '4px 12px' }}
        >
          {status === 'open' ? '🟢 Открыто' : '🔴 Закрыто'}
        </Tag>
      ),
    },
    {
      title: 'Действие',
      key: 'actions',
      width: 120,
      render: (_: any, record: any) => (
        <Space size="small">
          <Tooltip title="Редактировать">
            <Button 
              type="text" 
              icon={<EditOutlined />}
              style={{ color: '#F5A623' }}
            />
          </Tooltip>
          <DeleteButton
            onDelete={() => console.log('Delete location', record.id)}
            text=""
            className="danger compact icon-only"
            confirmTitle="Удалить локацию?"
            confirmContent="Это действие нельзя отменить"
            confirmOkText="Удалить"
            confirmCancelText="Отменить"
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8, color: '#8B4513' }}>
        🏪 Локации партнёра
      </h1>
      <p style={{ color: '#F5A623', marginBottom: 24 }}>
        Управляйте информацией о вашем бизнесе и локациях
      </p>

      <Card
        title={<span style={{ color: '#8B4513', fontSize: 16, fontWeight: 700 }}>📍 Мои локации</span>}
        extra={
          <Button 
            type="primary"
            icon={<PlusOutlined />}
            style={{
              background: 'linear-gradient(135deg, #F5A623 0%, #F7B731 100%)',
              border: 'none',
              borderRadius: 12,
            }}
          >
            Добавить локацию
          </Button>
        }
        style={{
          borderRadius: 16,
          background: 'linear-gradient(135deg, #ffffff 0%, #FFF4E6 100%)',
          border: '1px solid #FFE6CC',
          marginBottom: 32,
          boxShadow: '0 2px 12px rgba(245, 166, 35, 0.08)',
        }}
      >
        <Table
          columns={columns}
          dataSource={locationsData}
          pagination={{ pageSize: 10 }}
          rowClassName={() => 'partner-table-row'}
        />
      </Card>

      <Card
        title={<span style={{ color: '#8B4513', fontSize: 16, fontWeight: 700 }}>➕ Добавить новую локацию</span>}
        style={{
          borderRadius: 16,
          background: 'linear-gradient(135deg, #ffffff 0%, #FFF4E6 100%)',
          border: '1px solid #FFE6CC',
          boxShadow: '0 2px 12px rgba(245, 166, 35, 0.08)',
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Название точки" name="name" required>
            <Input 
              placeholder="Название точки" 
              size="large"
              style={{ borderRadius: 12 }}
            />
          </Form.Item>
          <Form.Item label="Город" name="city" required>
            <Input 
              placeholder="Город" 
              size="large"
              style={{ borderRadius: 12 }}
            />
          </Form.Item>
          <Form.Item label="Адрес (улица, дом)" name="address" required>
            <Input 
              placeholder="Адрес (улица, дом)" 
              size="large"
              style={{ borderRadius: 12 }}
            />
          </Form.Item>
          <Form.Item label="Телефон" name="phone" required>
            <Input 
              placeholder="Телефон" 
              size="large"
              style={{ borderRadius: 12 }}
            />
          </Form.Item>
          <Form.Item label="Статус" name="status" valuePropName="checked">
            <Switch 
              checkedChildren="🟢 Открыто" 
              unCheckedChildren="🔴 Закрыто"
              defaultChecked
            />
          </Form.Item>
          <Form.Item>
            <Space size="middle" style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button 
                size="large" 
                style={{ 
                  borderRadius: 12,
                  border: '1px solid #FFE6CC',
                }}
              >
                Отмена
              </Button>
              <Button
                type="primary"
                size="large"
                style={{
                  background: 'linear-gradient(135deg, #F5A623 0%, #F7B731 100%)',
                  border: 'none',
                  borderRadius: 12,
                }}
              >
                ✅ Сохранить локацию
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <style>{`
        .partner-table-row {
          transition: all 0.3s;
        }
        .partner-table-row:hover {
          background-color: #FFF4E6 !important;
        }
      `}</style>
    </div>
  );
};

