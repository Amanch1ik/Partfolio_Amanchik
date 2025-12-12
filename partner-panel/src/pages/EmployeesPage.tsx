import { Card, Table, Avatar, Space, Spin, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { employeesApi } from '../services/api';

export const EmployeesPage = () => {
  // Загрузка сотрудников из API
  const { data: employeesResponse, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await employeesApi.getEmployees();
      return response.data;
    },
    retry: 1,
  });

  const allEmployees = employeesResponse || [];

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
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0, color: '#0F2A1D', background: 'linear-gradient(135deg, #0F2A1D 0%, #689071 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          👥 Сотрудники
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

