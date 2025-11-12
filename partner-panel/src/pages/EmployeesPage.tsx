import { useState } from 'react';
import { Card, Table, Button, Avatar, Space, Modal, Form, Input, Select, message, Spin } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { DeleteButton } from '../components/DeleteButton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeesApi } from '../services/api';

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
  const [form] = Form.useForm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const queryClient = useQueryClient();

  // Загрузка сотрудников из API
  const { data: employeesResponse, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      try {
        const response = await employeesApi.getEmployees();
        return response.data;
      } catch (err: any) {
        console.warn('Employees API недоступен, используем моковые данные:', err);
        return employeesData;
      }
    },
    retry: 1,
  });

  // Мутация для создания/обновления сотрудника
  const createOrUpdateMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingEmployee?.id) {
        return await employeesApi.updateEmployee(editingEmployee.id, data);
      } else {
        return await employeesApi.createEmployee(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      message.success(editingEmployee?.id ? 'Сотрудник обновлен' : 'Сотрудник добавлен');
      form.resetFields();
      setIsModalOpen(false);
      setEditingEmployee(null);
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Ошибка при сохранении сотрудника');
    },
  });

  // Мутация для удаления сотрудника
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await employeesApi.deleteEmployee(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      message.success('Сотрудник уволен');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Ошибка при увольнении сотрудника');
    },
  });

  // Используем данные из API или моковые
  const allEmployees = employeesResponse || employeesData;

  const handleCreate = () => {
    setEditingEmployee(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (record: any) => {
    setEditingEmployee(record);
    form.setFieldsValue(record);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      createOrUpdateMutation.mutate(values);
    } catch (err) {
      console.error('Validation failed:', err);
    }
  };

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
      title: 'Действие',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            style={{ color: '#689071' }}
          />
          {record.action === 'reset' ? (
            <Button
              type="link"
              style={{ color: '#689071', padding: 0 }}
              onClick={() => message.info('Функция сброса пароля будет доступна в следующей версии')}
            >
              Сбросить пароль
            </Button>
          ) : (
            <DeleteButton
              onDelete={() => deleteMutation.mutate(record.id)}
              text="Уволить"
              className="danger compact"
              confirmTitle="Уволить сотрудника?"
              confirmContent="Это действие нельзя отменить"
              confirmOkText="Уволить"
              confirmCancelText="Отменить"
            />
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0, color: '#0F2A1D', background: 'linear-gradient(135deg, #0F2A1D 0%, #689071 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          👥 Сотрудники
        </h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
          style={{
            background: 'linear-gradient(135deg, #689071 0%, #AEC380 100%)',
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

      {/* Модальное окно для создания/редактирования сотрудника */}
      <Modal
        title={editingEmployee ? 'Редактировать сотрудника' : 'Добавить сотрудника'}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
          setEditingEmployee(null);
        }}
        onOk={handleSave}
        okText="Сохранить"
        cancelText="Отмена"
        confirmLoading={createOrUpdateMutation.isPending}
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item
            name="name"
            label="Имя сотрудника"
            rules={[{ required: true, message: 'Введите имя сотрудника' }]}
          >
            <Input placeholder="Например: Иван Иванов" />
          </Form.Item>
          <Form.Item
            name="role"
            label="Роль"
            rules={[{ required: true, message: 'Введите роль' }]}
          >
            <Input placeholder="Например: Кассир" />
          </Form.Item>
          <Form.Item
            name="location"
            label="Локация"
            rules={[{ required: true, message: 'Введите локацию' }]}
          >
            <Input placeholder="Например: Yess!Food" />
          </Form.Item>
        </Form>
      </Modal>

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

