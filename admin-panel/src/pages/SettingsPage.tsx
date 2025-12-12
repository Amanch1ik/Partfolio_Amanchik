import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Tabs,
  Card,
  Form,
  Input,
  Button,
  Table,
  Space,
  Modal,
  message,
  InputNumber,
  Tooltip,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  CopyOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons';
import { settingsApi } from '@/services/api';
import { DeleteButton } from '@/components/DeleteButton';
import { t } from '@/i18n';

export const SettingsPage = () => {
  const [categoryForm] = Form.useForm();
  const [cityForm] = Form.useForm();
  const [limitsForm] = Form.useForm();

  // State для модальных окон
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editingCity, setEditingCity] = useState<any>(null);

  // Получаем данные настроек (если понадобится в будущем)
  const { isLoading, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.getAll(),
    retry: 1,
    enabled: false, // Отключаем автоматическую загрузку, если не используется
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => settingsApi.categories.getAll(),
    retry: 1,
  });

  const { data: cities } = useQuery({
    queryKey: ['cities'],
    queryFn: () => settingsApi.cities.getAll(),
    retry: 1,
  });

  const { data: limits } = useQuery({
    queryKey: ['limits'],
    queryFn: () => settingsApi.limits.getAll(),
    retry: 1,
  });

  const { data: apiKeys } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => settingsApi.apiKeys.getAll(),
    retry: 1,
  });

  // Обработчики для категорий
  const handleAddCategory = async (values: any) => {
    try {
      if (editingCategory) {
        await settingsApi.categories.update(editingCategory.id, values);
        message.success(t('settings.categoryUpdated', 'Категория обновлена'));
      } else {
        await settingsApi.categories.create(values);
        message.success(t('settings.categoryAdded', 'Категория добавлена'));
      }
      setIsCategoryModalOpen(false);
      categoryForm.resetFields();
      setEditingCategory(null);
      refetch();
    } catch (error) {
      message.error(t('common.error', 'Ошибка при сохранении'));
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      await settingsApi.categories.delete(id);
      message.success(t('settings.categoryDeleted', 'Категория удалена'));
      refetch();
    } catch (error) {
      message.error('Ошибка при удалении');
    }
  };

  // Обработчики для городов
  const handleAddCity = async (values: any) => {
    try {
      if (editingCity) {
        await settingsApi.cities.update(editingCity.id, values);
        message.success(t('settings.cityUpdated', 'Город обновлен'));
      } else {
        await settingsApi.cities.create(values);
        message.success(t('settings.cityAdded', 'Город добавлен'));
      }
      setIsCityModalOpen(false);
      cityForm.resetFields();
      setEditingCity(null);
      refetch();
    } catch (error) {
      message.error(t('common.error', 'Ошибка при сохранении'));
    }
  };

  const handleDeleteCity = async (id: number) => {
    try {
      await settingsApi.cities.delete(id);
      message.success(t('settings.cityDeleted', 'Город удален'));
      refetch();
    } catch (error) {
      message.error(t('common.error', 'Ошибка при удалении'));
    }
  };

  const handleRevokeApiKey = async (id: number) => {
    Modal.confirm({
      title: t('settings.revokeApiKeyConfirm', 'Отозвать API ключ?'),
      content: t('settings.revokeApiKeyWarning', 'Это действие нельзя отменить'),
      okText: t('settings.revoke', 'Отозвать'),
      cancelText: t('common.cancel', 'Отменить'),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await settingsApi.apiKeys.revoke(id);
          message.success(t('settings.apiKeyRevoked', 'API ключ отозван'));
          refetch();
        } catch (error) {
          message.error(t('settings.revokeApiKeyError', 'Ошибка при отзыве ключа'));
        }
      },
    });
  };

  const categoriesColumns = [
    { title: '#', key: 'id', width: 60, render: (_: any, __: any, index: number) => index + 1 },
    { title: t('settings.categoryName', 'Название категории'), dataIndex: 'name', key: 'name' },
    {
      title: t('common.actions', 'Действие'),
      key: 'actions',
      width: 100,
      render: (_: any, record: any) => (
        <Space size="small">
          <Tooltip title={t('common.edit', 'Редактировать')}>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingCategory(record);
                categoryForm.setFieldsValue(record);
                setIsCategoryModalOpen(true);
              }}
            />
          </Tooltip>
          <Tooltip title={t('common.delete', 'Удалить')}>
            <DeleteButton
              onDelete={() => handleDeleteCategory(record.id)}
              text=""
              className="danger compact icon-only"
              confirmTitle={t('settings.deleteCategoryConfirm', 'Удалить категорию?')}
              confirmContent={t('common.deleteWarning', 'Это действие нельзя отменить')}
              confirmOkText={t('common.delete', 'Удалить')}
              confirmCancelText={t('common.cancel', 'Отменить')}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const citiesColumns = [
    { title: '#', key: 'id', width: 60, render: (_: any, __: any, index: number) => index + 1 },
    { title: t('settings.cityName', 'Название города'), dataIndex: 'name', key: 'name' },
    { title: t('settings.country', 'Страна'), dataIndex: 'country', key: 'country' },
    {
      title: t('common.actions', 'Действие'),
      key: 'actions',
      width: 100,
      render: (_: any, record: any) => (
        <Space size="small">
          <Tooltip title={t('common.edit', 'Редактировать')}>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingCity(record);
                cityForm.setFieldsValue(record);
                setIsCityModalOpen(true);
              }}
            />
          </Tooltip>
          <Tooltip title={t('common.delete', 'Удалить')}>
            <DeleteButton
              onDelete={() => handleDeleteCity(record.id)}
              text=""
              className="danger compact icon-only"
              confirmTitle={t('settings.deleteCityConfirm', 'Удалить город?')}
              confirmContent={t('common.deleteWarning', 'Это действие нельзя отменить')}
              confirmOkText={t('common.delete', 'Удалить')}
              confirmCancelText={t('common.cancel', 'Отменить')}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const apiKeysColumns = [
    { title: '#', key: 'id', width: 60, render: (_: any, __: any, index: number) => index + 1 },
    { title: t('settings.apiKeyName', 'Название'), dataIndex: 'name', key: 'name' },
    {
      title: t('settings.apiKey', 'Ключ'),
      dataIndex: 'key',
      key: 'key',
      render: (key: string) => (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <code style={{ color: '#689071' }}>
            {key.substring(0, 10)}...{key.substring(key.length - 4)}
          </code>
          <Tooltip title={t('settings.copy', 'Скопировать')}>
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => {
                navigator.clipboard.writeText(key);
                message.success(t('settings.keyCopied', 'Ключ скопирован'));
              }}
            />
          </Tooltip>
        </div>
      ),
    },
    { title: t('settings.created', 'Создан'), dataIndex: 'created_at', key: 'created_at' },
    {
      title: t('common.actions', 'Действие'),
      key: 'actions',
      width: 120,
      render: (_: any, record: any) => (
        <Tooltip title={t('settings.revoke', 'Отозвать')}>
          <Button
            type="text"
            size="small"
            danger
            icon={<EyeInvisibleOutlined />}
            onClick={() => handleRevokeApiKey(record.id)}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0F2A1D', margin: 0, marginBottom: 8 }}>
          {t('settings.title', 'Настройки')}
        </h1>
        <p style={{ color: '#689071', margin: 0 }}>
          {t('settings.subtitle', 'Управление настройками и конфигурацией')}
        </p>
      </div>

      <Tabs
        items={[
            {
            key: '1',
            label: t('settings.categories', 'Категории'),
      children: (
              <Card
                style={{
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, #ffffff 0%, #F0F7EB 100%)',
                  border: '1px solid #E3EED4',
                  boxShadow: '0 2px 12px rgba(15, 42, 29, 0.08)',
                }}
                className="hover-lift-green"
              >
                <div style={{ marginBottom: 16 }}>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setEditingCategory(null);
                      categoryForm.resetFields();
                      setIsCategoryModalOpen(true);
                    }}
                    style={{ backgroundColor: '#689071', borderColor: '#689071' }}
                  >
                    {t('settings.addCategory', 'Добавить категорию')}
                  </Button>
                </div>
          <Table
                  columns={categoriesColumns}
                  dataSource={categories?.data || []}
            rowKey="id"
            pagination={false}
                  loading={isLoading}
          />
        </Card>
      ),
    },
    {
            key: '2',
            label: t('settings.cities', 'Города'),
      children: (
        <Card
          style={{
            borderRadius: 16,
            background: 'linear-gradient(135deg, #ffffff 0%, #F0F7EB 100%)',
            border: '1px solid #E3EED4',
            boxShadow: '0 2px 12px rgba(15, 42, 29, 0.08)',
          }}
          className="hover-lift-green"
        >
                <div style={{ marginBottom: 16 }}>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setEditingCity(null);
                      cityForm.resetFields();
                      setIsCityModalOpen(true);
                    }}
                    style={{ backgroundColor: '#689071', borderColor: '#689071' }}
                  >
                    {t('settings.addCity', 'Добавить город')}
              </Button>
                </div>
                <Table
                  columns={citiesColumns}
                  dataSource={cities?.data || []}
                  rowKey="id"
                  pagination={false}
                  loading={isLoading}
                />
        </Card>
      ),
    },
    {
            key: '3',
            label: t('settings.limits', 'Лимиты'),
      children: (
        <Card
          style={{
            borderRadius: 16,
            background: 'linear-gradient(135deg, #ffffff 0%, #F0F7EB 100%)',
            border: '1px solid #E3EED4',
            boxShadow: '0 2px 12px rgba(15, 42, 29, 0.08)',
          }}
          className="hover-lift-green"
        >
          <Form 
                  form={limitsForm}
            layout="vertical" 
                  initialValues={limits?.data}
                  onFinish={async (values) => {
                    try {
                      await settingsApi.limits.update(values);
                      message.success(t('settings.limitsUpdated', 'Лимиты обновлены'));
                      refetch();
                    } catch (error) {
                      message.error(t('common.error', 'Ошибка при обновлении'));
                    }
                  }}
                >
                  <Row gutter={[12, 12]}>
                    <Col xs={24} sm={12} md={8}>
                      <Form.Item
                        label={t('settings.maxUsersPerDay', 'Максимум пользователей в день')}
                        name="max_users_per_day"
                      >
                        <InputNumber style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                      <Form.Item
                        label={t('settings.maxTransactionsPerDay', 'Максимум транзакций в день')}
                        name="max_transactions_per_day"
                      >
                        <InputNumber style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
            <Form.Item
                        label={t('settings.maxCashbackPerTransaction', 'Максимум кэшбэка на транзакцию')}
                        name="max_cashback_per_transaction"
            >
                        <InputNumber style={{ width: '100%' }} />
            </Form.Item>
                    </Col>
                  </Row>
            <Form.Item>
                    <Button type="primary" htmlType="submit" style={{ backgroundColor: '#689071', borderColor: '#689071' }}>
                      {t('settings.saveLimits', 'Сохранить лимиты')}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
            key: '4',
            label: t('settings.apiKeys', 'API ключи'),
      children: (
        <Card
          style={{
            borderRadius: 16,
            background: 'linear-gradient(135deg, #ffffff 0%, #F0F7EB 100%)',
            border: '1px solid #E3EED4',
            boxShadow: '0 2px 12px rgba(15, 42, 29, 0.08)',
          }}
          className="hover-lift-green"
        >
                <div style={{ marginBottom: 16 }}>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      Modal.confirm({
                        title: t('settings.createApiKey', 'Создать новый API ключ'),
                        content: (
                          <Form layout="vertical">
                            <Form.Item label={t('settings.apiKeyName', 'Название')} required>
                              <Input placeholder={t('settings.apiKeyNamePlaceholder', 'Например: Mobile App')} />
                            </Form.Item>
                          </Form>
                        ),
                        okText: t('common.create', 'Создать'),
                        cancelText: t('common.cancel', 'Отменить'),
                        onOk: async () => {
                          try {
                            await settingsApi.apiKeys.create({ name: t('settings.newApiKey', 'New API Key') });
                            message.success(t('settings.apiKeyCreated', 'API ключ создан'));
                            refetch();
                          } catch (error) {
                            message.error(t('settings.createApiKeyError', 'Ошибка при создании ключа'));
                          }
                        },
                      });
                    }}
                    style={{ backgroundColor: '#689071', borderColor: '#689071' }}
                  >
                    {t('settings.createApiKey', '+ Создать API ключ')}
                  </Button>
                </div>
                <Table
                  columns={apiKeysColumns}
                  dataSource={apiKeys?.data || []}
            rowKey="id"
            pagination={false}
                  loading={isLoading}
          />
        </Card>
      ),
    },
        ]}
      />

      {/* Модальное окно для категорий */}
      <Modal
        title={editingCategory ? t('settings.editCategory', 'Редактировать категорию') : t('settings.addCategory', 'Добавить категорию')}
        open={isCategoryModalOpen}
        onOk={() => categoryForm.submit()}
        onCancel={() => setIsCategoryModalOpen(false)}
        okText={editingCategory ? t('common.save', 'Сохранить') : t('common.create', 'Добавить')}
        cancelText={t('common.cancel', 'Отменить')}
      >
        <Form
          form={categoryForm}
          layout="vertical"
          onFinish={handleAddCategory}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            label={t('settings.categoryName', 'Название категории')}
            name="name"
            rules={[{ required: true, message: t('settings.categoryNameRequired', 'Введите название') }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* Модальное окно для городов */}
      <Modal
        title={editingCity ? t('settings.editCity', 'Редактировать город') : t('settings.addCity', 'Добавить город')}
        open={isCityModalOpen}
        onOk={() => cityForm.submit()}
        onCancel={() => setIsCityModalOpen(false)}
        okText={editingCity ? t('common.save', 'Сохранить') : t('common.create', 'Добавить')}
        cancelText={t('common.cancel', 'Отменить')}
      >
        <Form
          form={cityForm}
          layout="vertical"
          onFinish={handleAddCity}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            label={t('settings.cityName', 'Название города')}
            name="name"
            rules={[{ required: true, message: t('settings.cityNameRequired', 'Введите название') }]}
          >
            <Input />
          </Form.Item>
          <Form.Item 
            label={t('settings.country', 'Страна')} 
            name="country"
            rules={[{ required: true, message: t('settings.countryRequired', 'Введите страну') }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
