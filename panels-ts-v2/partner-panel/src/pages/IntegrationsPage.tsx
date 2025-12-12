import { Card, Table, Button, Space, Switch, Spin, Empty, message } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { DeleteButton } from '../components/DeleteButton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { integrationsApi } from '../services/api';
import { formatDateTime } from '../utils/dateUtils';
import { toArray } from '../utils/arrayUtils';

export const IntegrationsPage = () => {
  const queryClient = useQueryClient();

  // Загрузка API ключей из API
  const { data: apiKeysResponse, isLoading } = useQuery({
    queryKey: ['partner-api-keys'],
    queryFn: async () => {
      try {
        const response = await integrationsApi.getApiKeys();
        return response?.data || [];
      } catch (error: any) {
        console.error('Error fetching API keys:', error);
        return [];
      }
    },
    retry: 1,
  });

  // Загрузка настроек интеграций
  const { data: settingsResponse } = useQuery({
    queryKey: ['partner-integration-settings'],
    queryFn: async () => {
      try {
        const response = await integrationsApi.getIntegrationSettings();
        return response?.data || {};
      } catch (error: any) {
        console.error('Error fetching integration settings:', error);
        return {};
      }
    },
    retry: 1,
  });

  const apiKeys = toArray(apiKeysResponse, []);
  const settings = settingsResponse || {};

  // Мутация для удаления ключа
  const deleteKeyMutation = useMutation({
    mutationFn: async (id: number) => {
      await integrationsApi.deleteApiKey(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-api-keys'] });
      message.success('API ключ удален');
    },
    onError: (error: any) => {
      console.error('Error deleting API key:', error);
      message.error('Не удалось удалить API ключ');
    },
  });

  // Мутация для обновления настроек
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      await integrationsApi.updateIntegrationSettings(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-integration-settings'] });
      message.success('Настройки обновлены');
    },
    onError: (error: any) => {
      console.error('Error updating settings:', error);
      message.error('Не удалось обновить настройки');
    },
  });

  const handleCopyApiKey = (apiKey: string) => {
    navigator.clipboard.writeText(apiKey);
    message.success('API ключ скопирован в буфер обмена');
  };

  const handleDeleteKey = (id: number) => {
    deleteKeyMutation.mutate(id);
  };

  const handleToggleNotification = (checked: boolean) => {
    updateSettingsMutation.mutate({
      ...settings,
      notify_cashback: checked,
    });
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: any) => name || record.title || 'API Key',
    },
    {
      title: 'Ключ',
      dataIndex: 'api_key',
      key: 'api_key',
      render: (apiKey: string, record: any) => {
        const key = apiKey || record.apiKey || record.key || '';
        if (!key) return '-';
        return (
          <Space>
            <code style={{ background: '#F0F7EB', padding: '4px 8px', borderRadius: 4, color: '#0F2A1D' }}>
              {key.length > 20 ? `${key.substring(0, 20)}...` : key}
            </code>
            <Button
              type="text"
              icon={<CopyOutlined />}
              size="small"
              onClick={() => handleCopyApiKey(key)}
            />
          </Space>
        );
      },
    },
    {
      title: 'Дата создания',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string, record: any) => {
        const dateValue = date || record.date || record.created_at;
        return dateValue ? formatDateTime(dateValue) : '-';
      },
    },
    {
      title: 'Действие',
      key: 'actions',
      width: 100,
      render: (_: any, record: any) => (
        <DeleteButton
          onDelete={() => handleDeleteKey(record.id)}
          text=""
          className="danger compact icon-only"
          confirmTitle="Удалить API ключ?"
          confirmContent="Это действие нельзя отменить"
          confirmOkText="Удалить"
          confirmCancelText="Отменить"
        />
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0, color: '#0F2A1D', background: 'linear-gradient(135deg, #0F2A1D 0%, #689071 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          🔌 Интеграции
        </h1>
        <Button
          type="primary"
          style={{
            background: 'linear-gradient(135deg, #689071 0%, #AEC380 100%)',
            border: 'none',
            borderRadius: 12,
            height: 40,
            fontWeight: 600,
          }}
        >
          + Новый ключ API
        </Button>
      </div>

      <Card
        title={<span style={{ color: '#0F2A1D', fontSize: 16, fontWeight: 700 }}>🔑 API Ключи</span>}
        style={{
          borderRadius: 16,
          background: 'linear-gradient(135deg, #ffffff 0%, #FFF4E6 100%)',
          border: '1px solid #FFE6CC',
          marginBottom: 24,
          boxShadow: '0 2px 12px rgba(245, 166, 35, 0.08)',
        }}
      >
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Spin size="large" />
          </div>
        ) : apiKeys.length === 0 ? (
          <Empty description="Нет API ключей" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Table
            columns={columns}
            dataSource={apiKeys.map((key: any) => ({
              ...key,
              key: key.id?.toString() || Math.random().toString(),
            }))}
            pagination={{ pageSize: 10 }}
            rowClassName={() => 'partner-table-row'}
          />
        )}
      </Card>

      <Card
        title={<span style={{ color: '#0F2A1D', fontSize: 16, fontWeight: 700 }}>🔔 Уведомления</span>}
        style={{
          borderRadius: 16,
          background: 'linear-gradient(135deg, #ffffff 0%, #F0F7EB 100%)',
          border: '1px solid #E3EED4',
          boxShadow: '0 2px 12px rgba(15, 42, 29, 0.08)',
        }}
      >
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <span style={{ color: '#0F2A1D', fontWeight: 500 }}>Уведомлять клиента о кешбэке</span>
          <Switch 
            checked={settings.notify_cashback !== false}
            onChange={handleToggleNotification}
            loading={updateSettingsMutation.isPending}
            style={{ backgroundColor: settings.notify_cashback !== false ? '#689071' : undefined }} 
          />
        </Space>
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

