import { useState } from 'react';
import { Card, Table, Tag, Avatar, Space, Spin } from 'antd';
import { ShopOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { promotionsApi } from '../services/api';

export const PromotionsPage = () => {
  // Загрузка акций из API
  const { data: promotionsResponse, isLoading } = useQuery({
    queryKey: ['promotions'],
    queryFn: async () => {
      const response = await promotionsApi.getPromotions();
      return response.data;
    },
    retry: 1,
  });

  const allPromotions = promotionsResponse || [];

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
              background: 'linear-gradient(135deg, #689071 0%, #AEC380 100%)',
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
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0, color: '#0F2A1D', background: 'linear-gradient(135deg, #0F2A1D 0%, #689071 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          🎁 Акции и сторисы
        </h1>
        <Tag color="#d9d9d9" style={{ borderRadius: 8 }}>
          Только просмотр. Для изменений — обратитесь к администратору.
        </Tag>
      </div>

      <Card
        style={{
          borderRadius: 16,
          background: 'linear-gradient(135deg, #ffffff 0%, #F0F7EB 100%)',
          border: '1px solid #E3EED4',
          boxShadow: '0 2px 12px rgba(15, 42, 29, 0.08)',
        }}
      >
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Spin size="large" />
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={allPromotions}
            pagination={{ pageSize: 10 }}
            rowClassName={() => 'partner-table-row'}
            loading={isLoading}
          />
        )}
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

