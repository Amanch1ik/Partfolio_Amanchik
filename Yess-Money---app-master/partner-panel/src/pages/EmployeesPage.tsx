import { Card, Table, Button, Avatar, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { DeleteButton } from '../components/DeleteButton';

const employeesData = [
  {
    key: '1',
    id: 1,
    name: 'Peter Taylor',
    role: 'Кассир',
    location: 'Yess!Food',
    action: 'reset',
  },
  {
    key: '2',
    id: 2,
    name: 'Szekeres Dalma',
    role: 'Менеджер',
    location: 'Центральная',
    action: 'reset',
  },
  {
    key: '3',
    id: 3,
    name: 'Peter Taylor',
    role: 'Классный чел',
    location: 'Центральная',
    action: 'reset',
  },
  {
    key: '4',
    id: 4,
    name: 'Peter Taylor',
    role: 'Кассир',
    location: 'Центральная',
    action: 'reset',
  },
  {
    key: '5',
    id: 5,
    name: 'Peter Taylor',
    role: 'Таргетолог',
    location: 'Центральная',
    action: 'reset',
  },
  {
    key: '6',
    id: 6,
    name: 'Balázs Annamária',
    role: 'Маркетолог',
    location: 'Yess!Food',
    action: 'reset',
  },
  {
    key: '7',
    id: 7,
    name: 'Peter Taylor',
    role: 'CMM',
    location: 'Yess!Food',
    action: 'dismiss',
  },
  {
    key: '8',
    id: 8,
    name: 'Balázs Annamária',
    role: 'Директор',
    location: 'Yess!Food',
    action: 'dismiss',
  },
  {
    key: '9',
    id: 9,
    name: 'Peter Taylor',
    role: 'Таксист',
    location: 'Yess!Food',
    action: 'dismiss',
  },
  {
    key: '10',
    id: 10,
    name: 'Balázs Annamária',
    role: 'Айтишник',
    location: 'Yess!Food',
    action: 'dismiss',
  },
  {
    key: '11',
    id: 11,
    name: 'Peter Taylor',
    role: 'Администратор',
    location: 'Yess!Food',
    action: 'dismiss',
  },
  {
    key: '12',
    id: 12,
    name: 'Balázs Annamária',
    role: 'Кассир',
    location: 'Yess!Food',
    action: 'dismiss',
  },
];

export const EmployeesPage = () => {
  const columns = [
    {
      title: 'Имя',
      key: 'name',
      render: (_: any, record: any) => (
        <Space>
          <Avatar style={{ backgroundColor: '#689071' }}>
            {record.name.charAt(0)}
          </Avatar>
          <span>{record.name}</span>
        </Space>
      ),
    },
    {
      title: 'Роль',
      dataIndex: 'role',
      key: 'role',
    },
    {
      title: 'Локация',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: 'Статус',
      key: 'status',
      render: (_: any, record: any) => (
        record.action === 'reset' ? (
          <Button
            type="link"
            style={{ color: '#689071', padding: 0 }}
            onClick={() => console.log('Reset password', record.id)}
          >
            Сбросить пароль
          </Button>
        ) : (
          <DeleteButton
            onDelete={() => console.log('Dismiss employee', record.id)}
            text="Уволить"
            className="danger compact"
            confirmTitle="Уволить сотрудника?"
            confirmContent="Это действие нельзя отменить"
            confirmOkText="Уволить"
            confirmCancelText="Отменить"
          />
        )
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0, color: '#8B4513' }}>
          👥 Сотрудники
        </h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          style={{
            background: 'linear-gradient(135deg, #F5A623 0%, #F7B731 100%)',
            border: 'none',
            borderRadius: 12,
            height: 40,
            fontWeight: 600,
          }}
        >
          + Добавить сотрудника
        </Button>
      </div>

      <Card
        style={{
          borderRadius: 16,
          background: 'linear-gradient(135deg, #ffffff 0%, #FFF4E6 100%)',
          border: '1px solid #FFE6CC',
          boxShadow: '0 2px 12px rgba(245, 166, 35, 0.08)',
        }}
      >
        <Table
          columns={columns}
          dataSource={employeesData}
          pagination={{ pageSize: 10 }}
          rowClassName={() => 'partner-table-row'}
        />
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

