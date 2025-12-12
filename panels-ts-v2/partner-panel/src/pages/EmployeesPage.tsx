import { Card, Table, Avatar, Space, message, Spin, Dropdown, Tag, Button } from 'antd';
import { toArray } from '../utils/arrayUtils';
import { ExportOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { employeesApi } from '../services/api';
import { exportToCSV, exportToExcel, exportToJSON } from '../utils/exportUtils';
import { useDocumentTitle } from '@shared/hooks/useDocumentTitle';

export const EmployeesPage = () => {
  useDocumentTitle('Сотрудники', 'YESS!GO Partner');

  // Загрузка сотрудников из API
  const { data: employeesResponse, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await employeesApi.getEmployees();
      return response.data;
    },
    retry: 1,
  });


  // Используем данные из API
  const allEmployees = toArray(employeesResponse, []);

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
      width: 120,
      render: (_: any) => (
        <Tag color="green" style={{ borderRadius: 12, padding: '4px 12px' }}>
          Активен
        </Tag>
      ),
    },
  ];

  // Экспорт данных
  const handleExport = (format: 'csv' | 'excel' | 'json' = 'csv') => {
    if (!allEmployees || allEmployees.length === 0) {
      message.warning('Нет данных для экспорта');
      return;
    }

    const exportColumns = [
      { key: 'id', title: 'ID' },
      { key: 'name', title: 'Имя' },
      { key: 'role', title: 'Роль' },
      { key: 'location', title: 'Локация' },
    ];

    try {
      if (format === 'csv') {
        exportToCSV(allEmployees, exportColumns, 'employees');
        message.success('Файл успешно загружен');
      } else if (format === 'excel') {
        exportToExcel(allEmployees, exportColumns, 'employees');
        message.success('Файл успешно загружен');
      } else {
        exportToJSON(allEmployees, 'employees');
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
          👥 Сотрудники
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
            <strong>ℹ️ Управление сотрудниками:</strong><br/>
            Для добавления или изменения сотрудников обратитесь к администратору
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
            dataSource={allEmployees}
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

