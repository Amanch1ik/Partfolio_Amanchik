import { useState } from 'react';
import { Card, Table, Button, Tag, Avatar, Space, Modal, Form, Input, InputNumber, DatePicker, message, Spin } from 'antd';
import { PlusOutlined, ShopOutlined, EditOutlined } from '@ant-design/icons';
import { DeleteButton } from '../components/DeleteButton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { promotionsApi } from '../services/api';
import dayjs from 'dayjs';

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

const { RangePicker } = DatePicker;

export const PromotionsPage = () => {
  const [form] = Form.useForm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<any>(null);
  const queryClient = useQueryClient();

  // Загрузка акций из API
  const { data: promotionsResponse, isLoading } = useQuery({
    queryKey: ['promotions'],
    queryFn: async () => {
      try {
        const response = await promotionsApi.getPromotions();
        return response.data;
      } catch (err: any) {
        console.warn('Promotions API недоступен, используем моковые данные:', err);
        return promotionsData;
      }
    },
    retry: 1,
  });

  // Мутация для создания/обновления акции
  const createOrUpdateMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingPromotion?.id) {
        return await promotionsApi.updatePromotion(editingPromotion.id, data);
      } else {
        return await promotionsApi.createPromotion(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      message.success(editingPromotion?.id ? 'Акция обновлена' : 'Акция создана');
      form.resetFields();
      setIsModalOpen(false);
      setEditingPromotion(null);
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Ошибка при сохранении акции');
    },
  });

  // Мутация для удаления акции
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await promotionsApi.deletePromotion(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      message.success('Акция удалена');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Ошибка при удалении акции');
    },
  });

  // Используем данные из API или моковые
  const allPromotions = promotionsResponse || promotionsData;

  const handleCreate = () => {
    setEditingPromotion(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (record: any) => {
    setEditingPromotion(record);
    form.setFieldsValue({
      ...record,
      period: record.period ? dayjs(record.period.split(' - ')[0], 'DD.MM.YYYY') : null,
    });
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
          <DeleteButton
            onDelete={() => deleteMutation.mutate(record.id)}
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
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0, color: '#0F2A1D', background: 'linear-gradient(135deg, #0F2A1D 0%, #689071 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          🎁 Акции и сторисы
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
          + Создать акцию
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
            dataSource={allPromotions}
            pagination={{ pageSize: 10 }}
            rowClassName={() => 'partner-table-row'}
            loading={isLoading}
          />
        )}
      </Card>

      {/* Модальное окно для создания/редактирования акции */}
      <Modal
        title={editingPromotion ? 'Редактировать акцию' : 'Создать акцию'}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
          setEditingPromotion(null);
        }}
        onOk={handleSave}
        okText="Сохранить"
        cancelText="Отмена"
        confirmLoading={createOrUpdateMutation.isPending}
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item
            name="title"
            label="Название акции"
            rules={[{ required: true, message: 'Введите название акции' }]}
          >
            <Input placeholder="Например: Скидка 20%" />
          </Form.Item>
          <Form.Item
            name="discount"
            label="Размер скидки (%)"
            rules={[{ required: true, message: 'Введите размер скидки' }]}
          >
            <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="20" />
          </Form.Item>
          <Form.Item
            name="period"
            label="Период действия"
            rules={[{ required: true, message: 'Выберите период действия' }]}
          >
            <RangePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
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

