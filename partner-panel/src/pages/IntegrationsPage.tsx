import { Card, Table, Button, Space, Tag, Switch } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { DeleteButton } from '../components/DeleteButton';

const integrationsData = [
  {
    key: '1',
    id: 1,
    name: 'POS integration',
    key: '1a2b3c4d5e6f',
    date: '20.10.2025 14:29',
  },
  {
    key: '2',
    id: 2,
    name: 'Loyalty API',
    key: '6fg78h9i0j',
    date: '20.10.2025 14:29',
  },
  {
    key: '3',
    id: 3,
    name: 'Webhook',
    key: '1k2i3m4k5o',
    date: '20.10.2025 14:29',
  },
  {
    key: '4',
    id: 4,
    name: 'POS integration',
    key: '1a2b3c4d5e6f',
    date: '20.10.2025 14:29',
  },
  {
    key: '5',
    id: 5,
    name: 'Loyalty API',
    key: '6fg78h9i0j',
    date: '20.10.2025 14:29',
  },
  {
    key: '6',
    id: 6,
    name: 'Webhook',
    key: '1k2i3m4k5o',
    date: '20.10.2025 14:29',
  },
];

export const IntegrationsPage = () => {
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Ключ',
      dataIndex: 'key',
      key: 'key',
      render: (key: string) => (
        <Space>
          <code style={{ background: '#F0F7EB', padding: '4px 8px', borderRadius: 4, color: '#0F2A1D' }}>{key}</code>
          <Button
            type="text"
            icon={<CopyOutlined />}
            size="small"
            onClick={() => {
              navigator.clipboard.writeText(key);
            }}
          />
        </Space>
      ),
    },
    {
      title: 'Дата создания',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: 'Действие',
      key: 'actions',
      render: (_: any, record: any) => (
        <DeleteButton
          onDelete={() => console.log('Delete integration', record.id)}
          text=""
          className="danger compact icon-only"
          confirmTitle="Удалить API ключ?"
          confirmContent="Это действие нельзя отменить"
          confirmOkText="Удалить"
          confirmCancelText="Отменить"
        />
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0, color: '#0F2A1D', background: 'linear-gradient(135deg, #0F2A1D 0%, #689071 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          🔌 Интеграции
        </h1>
        <Button
          type="primary"
          style={{
            background: 'linear-gradient(135deg, #689071 0%, #AEC380 100%)',
            border: 'none',
            borderRadius: 12,
            height: 40,
            fontWeight: 600,
          }}
        >
          + Новый ключ API
        </Button>
      </div>

      <Card
        title={<span style={{ color: '#0F2A1D', fontSize: 16, fontWeight: 700 }}>🔑 API Ключи</span>}
        style={{
          borderRadius: 16,
          background: 'linear-gradient(135deg, #ffffff 0%, #FFF4E6 100%)',
          border: '1px solid #FFE6CC',
          marginBottom: 24,
          boxShadow: '0 2px 12px rgba(245, 166, 35, 0.08)',
        }}
      >
        <Table
          columns={columns}
          dataSource={integrationsData}
          pagination={{ pageSize: 10 }}
          rowClassName={() => 'partner-table-row'}
        />
      </Card>

      <Card
        title={<span style={{ color: '#0F2A1D', fontSize: 16, fontWeight: 700 }}>🔔 Уведомления</span>}
        style={{
          borderRadius: 16,
          background: 'linear-gradient(135deg, #ffffff 0%, #F0F7EB 100%)',
          border: '1px solid #E3EED4',
          boxShadow: '0 2px 12px rgba(15, 42, 29, 0.08)',
        }}
      >
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <span style={{ color: '#0F2A1D', fontWeight: 500 }}>Уведомлять клиента о кешбэке</span>
          <Switch defaultChecked style={{ backgroundColor: '#689071' }} />
        </Space>
      </Card>

      <style>{`
        .partner-table-row {
          transition: all 0.3s;
        }
        .partner-table-row:hover {
          background-color: #F0F7EB !important;
        }
      `}</style>
    </div>
  );
};

