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
import { toArray } from '../utils/arrayUtils';
import { DeleteButton } from '@/components/DeleteButton';
import { t } from '@/i18n';

import { useDocumentTitle } from '@shared/hooks/useDocumentTitle';

export const SettingsPage = () => {
  useDocumentTitle('Настройки', 'YESS!GO Admin');
  const [categoryForm] = Form.useForm();
  const [cityForm] = Form.useForm();

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

  // Лимиты пока не используются в UI, поэтому не дергаем endpoint, чтобы избежать лишних запросов
  const limits = undefined;

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
      // На текущем этапе поддерживаем только создание города
      await settingsApi.cities.create(values);
      message.success(t('settings.cityAdded', 'Город добавлен'));
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
            {/* Редактирование города пока не поддерживается */}
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
          <code style={{ color: 'var(--color-primary)' }}>
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

  // Приведение списков к массивам через toArray
  const categoriesList = toArray<any>(categories?.data ?? categories, []);
  const citiesList = toArray<any>(cities?.data ?? cities, []);
  const limitsList = toArray<any>(limits?.data ?? limits, []);
  const apiKeysList = toArray<any>(apiKeys?.data ?? apiKeys, []);
  const currenciesEndpoint = (settingsApi as any).currencies;
  const currenciesEndpointAvailable = !!(currenciesEndpoint && typeof currenciesEndpoint.getAll === 'function');
  const { data: currenciesData } = useQuery({
    queryKey: ['currencies'],
    queryFn: () => currenciesEndpointAvailable ? currenciesEndpoint.getAll() : Promise.resolve({ data: [] }),
    enabled: currenciesEndpointAvailable,
    retry: 1,
  });
  const currenciesList = toArray<any>((currenciesData?.data ?? currenciesData) ?? [], []);
  const currenciesColumns = [
    { title: '#', key: 'id', width: 60, render: (_: any, __: any, index: number) => index + 1 },
    { title: t('settings.currencyCode', 'Код'), dataIndex: 'code', key: 'code' },
    { title: t('settings.currencyName', 'Название'), dataIndex: 'name', key: 'name' },
    { title: t('settings.currencySymbol', 'Символ'), dataIndex: 'symbol', key: 'symbol' },
  ];

  // Новые: платежные методы
  const { data: paymentMethods } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => ( (settingsApi as any).paymentMethods?.getAll ? (settingsApi as any).paymentMethods.getAll() : Promise.resolve({ data: [] }) ),
    retry: 1,
  });
  const paymentMethodsList = toArray<any>(paymentMethods?.data ?? paymentMethods, []);
  const paymentMethodsColumns = [
    { title: '#', key: 'id', width: 60, render: (_: any, __: any, index: number) => index + 1 },
    { title: t('settings.paymentMethodCode', 'Код'), dataIndex: 'code', key: 'code' },
    { title: t('settings.paymentMethodName', 'Название'), dataIndex: 'name', key: 'name' },
  ];
  // Новые: платежные провайдеры (endpoints)
  const { data: paymentProviders } = useQuery({
    queryKey: ['payment-providers'],
    queryFn: () => ((settingsApi as any).paymentProviders?.getAll
      ? (settingsApi as any).paymentProviders.getAll()
      : Promise.resolve({ data: [] })),
    retry: 1,
  });
  const paymentProvidersList = toArray<any>(paymentProviders?.data ?? paymentProviders, []);
  const paymentProvidersColumns = [
    { title: '#', key: 'id', width: 60, render: (_: any, __: any, index: number) => index + 1 },
    { title: t('settings.paymentProvider', 'Провайдер'), dataIndex: 'provider', key: 'provider' },
    { title: t('settings.providerCode', 'Код'), dataIndex: 'code', key: 'code' },
  ];

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0, marginBottom: 8 }}>
          {t('settings.title', 'Настройки')}
        </h1>
        <p style={{ color: 'var(--color-primary)', margin: 0 }}>
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
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  boxShadow: 'var(--card-shadow)',
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
                    style={{ backgroundColor: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
                  >
                    {t('settings.addCategory', 'Добавить категорию')}
                  </Button>
                </div>
                <Table
                  columns={categoriesColumns}
                  dataSource={categoriesList}
                  rowKey="id"
                  pagination={false}
                  loading={isLoading}
                />
              </Card>
            ),
          },
          {
            key: '5',
            label: t('settings.currencies', 'Валюты'),
            children: (
              <Card
                style={{
                  borderRadius: 16,
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  boxShadow: 'var(--card-shadow)',
                }}
                className="hover-lift-green"
              >
                <Table
                  columns={currenciesColumns}
                  dataSource={currenciesList}
                  rowKey="id"
                  pagination={false}
                  loading={currenciesEndpointAvailable && !currenciesData}
                />
              </Card>
            ),
          },
          {
            key: '6',
            label: t('settings.paymentProviders', 'Провайдеры оплаты'),
            children: (
              <Card
                style={{
                  borderRadius: 16,
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  boxShadow: 'var(--card-shadow)',
                }}
                className="hover-lift-green"
              >
                <Table
                  columns={paymentProvidersColumns}
                  dataSource={paymentProvidersList}
                  rowKey="id"
                  pagination={false}
                  loading={false}
                />
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
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  boxShadow: 'var(--card-shadow)',
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
                    style={{ backgroundColor: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
                  >
                    {t('settings.createApiKey', '+ Создать API ключ')}
                  </Button>
                </div>
                <Table
                  columns={apiKeysColumns}
                  dataSource={apiKeysList}
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
