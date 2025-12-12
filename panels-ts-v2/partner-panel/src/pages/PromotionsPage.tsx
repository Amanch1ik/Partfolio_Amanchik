import { Card, Table, Tag, Avatar, Space, message, Spin, Dropdown, Button } from 'antd';
import { ShopOutlined, ExportOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { promotionsApi } from '../services/api';
import { exportToCSV, exportToExcel, exportToJSON } from '../utils/exportUtils';

import { toArray } from '../utils/arrayUtils';
import { useDocumentTitle } from '@shared/hooks/useDocumentTitle';

export const PromotionsPage = () => {
  useDocumentTitle('Промоакции', 'YESS!GO Partner');

  // Загрузка акций из API
  const { data: promotionsResponse, isLoading } = useQuery({
    queryKey: ['promotions'],
    queryFn: async () => {
      const response = await promotionsApi.getPromotions();
      return response.data;
    },
    retry: 1,
  });


  // Используем данные из API
  const allPromotions = toArray(promotionsResponse, []);

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
    {
      title: 'Статус',
      key: 'status',
      width: 120,
      render: (_: any) => (
        <Tag color="green" style={{ borderRadius: 12, padding: '4px 12px' }}>
          Активна
        </Tag>
      ),
    },
  ];

  // Экспорт данных
  const handleExport = (format: 'csv' | 'excel' | 'json' = 'csv') => {
    if (!allPromotions || allPromotions.length === 0) {
      message.warning('Нет данных для экспорта');
      return;
    }

    const exportColumns = [
      { key: 'id', title: 'ID' },
      { key: 'title', title: 'Название' },
      { key: 'discount', title: 'Скидка (%)', render: (val: number) => `${val}%` },
      { key: 'period', title: 'Период' },
      { key: 'partner', title: 'Партнер' },
    ];

    try {
      if (format === 'csv') {
        exportToCSV(allPromotions, exportColumns, 'promotions');
        message.success('Файл успешно загружен');
      } else if (format === 'excel') {
        exportToExcel(allPromotions, exportColumns, 'promotions');
        message.success('Файл успешно загружен');
      } else {
        exportToJSON(allPromotions, 'promotions');
        message.success('Файл успешно загружен');
      }
    } catch (error) {
      console.error('Export error:', error);
      message.error('Ошибка при экспорте данных');
    }
  };

  const exportMenuItems = [
    { key: 'csv', label: 'Экспорт в CSV', onClick: () => handleExport('csv') },
    { key: 'excel', label: 'Экспорт в Excel', onClick: () => handleExport('excel') },
    { key: 'json', label: 'Экспорт в JSON', onClick: () => handleExport('json') },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0, color: '#0F2A1D', background: 'linear-gradient(135deg, #0F2A1D 0%, #689071 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          🎁 Акции и сторисы
        </h1>
        <Space>
          <Dropdown
            menu={{ items: exportMenuItems }}
            trigger={['click']}
          >
            <Button
              type="default"
              icon={<ExportOutlined />}
              style={{
                borderRadius: 12,
                borderColor: '#689071',
                color: '#689071',
                height: 40,
                fontWeight: 600,
              }}
            >
              Экспорт
            </Button>
          </Dropdown>
          <div style={{
            backgroundColor: '#FFF3CD',
            border: '1px solid #FFECB5',
            borderRadius: 12,
            padding: '12px 16px',
            color: '#856404',
            fontSize: '14px',
            fontWeight: 500
          }}>
            <strong>ℹ️ Управление акциями:</strong><br/>
            Для создания или изменения акций обратитесь к администратору
          </div>
        </Space>
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

