import { Card, Table, Button, Tag, Avatar, Space } from 'antd';
import { PlusOutlined, ShopOutlined, EditOutlined } from '@ant-design/icons';
import { DeleteButton } from '../components/DeleteButton';

const promotionsData = [
  {
    key: '1',
    id: 1,
    title: 'Скидка 20%',
    discount: 20,
    period: '01.11 - 30.11 2025 год',
    partner: 'Глобус',
    priority: 190000,
    ctr: 6.75,
    stats: 6.9,
  },
];

export const PromotionsPage = () => {
  const columns = [
    {
      title: 'Название',
      key: 'title',
      render: (_: any, record: any) => (
        <Space>
          <div
            style={{
              width: 40,
              height: 40,
              background: '#ff4d4f',
              borderRadius: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 12,
              fontWeight: 'bold',
            }}
          >
            <span>-{record.discount}%</span>
            <span style={{ fontSize: 10 }}>скидка</span>
          </div>
          <div>
            <div style={{ fontWeight: 500, color: '#0F2A1D' }}>{record.title}</div>
            <div style={{ fontSize: 12, color: '#689071' }}>
              -{record.discount}% скидка
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Период',
      dataIndex: 'period',
      key: 'period',
    },
    {
      title: 'Партнер',
      key: 'partner',
      render: (_: any, record: any) => (
        <Space>
          <Avatar icon={<ShopOutlined />} size="small" style={{ backgroundColor: '#689071' }}>
            G
          </Avatar>
          <span>{record.partner}</span>
        </Space>
      ),
    },
    {
      title: 'Приоритет',
      dataIndex: 'priority',
      key: 'priority',
    },
    {
      title: 'CTR',
      dataIndex: 'ctr',
      key: 'ctr',
      render: (ctr: number) => `${ctr}%`,
    },
    {
      title: 'Статистика',
      dataIndex: 'stats',
      key: 'stats',
      render: (stats: number) => `${stats}%`,
    },
    {
      title: 'Действие',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => console.log('Edit promotion', record.id)}
          />
          <DeleteButton
            onDelete={() => console.log('Delete promotion', record.id)}
            text=""
            className="danger compact icon-only"
            confirmTitle="Удалить акцию?"
            confirmContent="Вы уверены, что хотите удалить эту акцию?"
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
          🎁 Акции и сторисы
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
          + Создать акцию
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
          dataSource={promotionsData}
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

