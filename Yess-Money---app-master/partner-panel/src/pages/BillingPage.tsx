import { Card, Button, Table, Tag, Space } from 'antd';
import { DownloadOutlined, EditOutlined } from '@ant-design/icons';
import { DeleteButton } from '../components/DeleteButton';

const paymentHistoryData = [
  {
    key: '1',
    id: '00124',
    date: '15.10.2025',
    amount: 10000,
    status: 'paid',
  },
  {
    key: '2',
    id: '00123',
    date: '15.10.2025',
    amount: 10000,
    status: 'paid',
  },
  {
    key: '3',
    id: '00122',
    date: '15.10.2025',
    amount: 10000,
    status: 'overdue',
  },
  {
    key: '4',
    id: '00122',
    date: '15.10.2025',
    amount: 10000,
    status: 'paid',
  },
];

export const BillingPage = () => {
  const columns = [
    {
      title: '№',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: 'Дата',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: 'Сумма',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => (
        <span style={{ fontWeight: 600 }}>{amount.toLocaleString()} сом</span>
      ),
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'paid' ? 'green' : 'red'}>
          {status === 'paid' ? 'Оплачен' : 'Просрочен'}
        </Tag>
      ),
    },
    {
      title: 'Действие',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space size="small">
          <Button
            type="text"
            icon={<DownloadOutlined />}
            onClick={() => console.log('Download', record.id)}
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => console.log('Edit', record.id)}
          />
          <DeleteButton
            onDelete={() => console.log('Delete payment', record.id)}
            text=""
            className="danger compact icon-only"
            confirmTitle="Удалить платеж?"
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0, color: '#8B4513' }}>
          💳 Биллинг
        </h1>
        <Button
          type="default"
          style={{
            borderRadius: 12,
            height: 40,
            border: '1px solid #FFE6CC',
            color: '#F5A623',
          }}
        >
          📋 Посмотреть тарифы
        </Button>
      </div>

      <Card
        style={{
          borderRadius: 16,
          background: 'linear-gradient(135deg, #ffffff 0%, #FFF4E6 100%)',
          border: '2px solid #F7B731',
          marginBottom: 24,
          boxShadow: '0 4px 12px rgba(245, 166, 35, 0.15)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#8B4513', marginBottom: 12 }}>
              🏆 Базовый план
            </div>
            <Tag 
              color="#F5A623"
              style={{ fontSize: 14, padding: '6px 16px', borderRadius: 12 }}
            >
              ✓ Активен
            </Tag>
          </div>
          <Button
            type="primary"
            style={{
              background: 'linear-gradient(135deg, #F5A623 0%, #F7B731 100%)',
              border: 'none',
              borderRadius: 12,
              height: 40,
              fontWeight: 600,
            }}
          >
            📄 Выставить счет
          </Button>
        </div>
      </Card>

      <Card
        title={<span style={{ color: '#8B4513', fontSize: 16, fontWeight: 700 }}>📊 История оплат</span>}
        style={{
          borderRadius: 16,
          background: 'linear-gradient(135deg, #ffffff 0%, #FFF4E6 100%)',
          border: '1px solid #FFE6CC',
          boxShadow: '0 2px 12px rgba(245, 166, 35, 0.08)',
        }}
      >
        <Table
          columns={columns}
          dataSource={paymentHistoryData}
          pagination={false}
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

