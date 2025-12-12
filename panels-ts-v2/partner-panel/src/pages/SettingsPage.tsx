// local state hooks are not required yet for partner settings page
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Tabs, Button, Form, Input, Tooltip, Table, message } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { taxRulesApi, shippingMethodsApi } from '@/services/api';
import { integrationsApi } from '@/services/api';
import { t } from '@/i18n';
import { useDocumentTitle } from '@shared/hooks/useDocumentTitle';

export const SettingsPage = () => {
  useDocumentTitle('Настройки', 'YESS!GO Partner');
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // Settings payload (integration settings)
  const { data: integrationSettingsData } = useQuery({
    queryKey: ['partner-integration-settings'],
    queryFn: () => integrationsApi.getIntegrationSettings(),
    retry: 1,
  });
  const integrationSettings = integrationSettingsData?.data ?? {};

  // API Keys for integrations
  const { data: apiKeysData } = useQuery({
    queryKey: ['partner-api-keys'],
    queryFn: () => integrationsApi.getApiKeys(),
    retry: 1,
  });
  const apiKeys = apiKeysData?.data ?? [];
  const { data: taxRulesData } = useQuery({ queryKey: ['tax-rules'], queryFn: () => taxRulesApi.getAll(), retry: 1 });
  const taxRulesList = taxRulesData?.data ?? [];
  const taxRulesColumns = [
    { title: '#', key: 'id', width: 60, render: (_: any, __: any, i: number) => i + 1 },
    { title: t('settings.taxCode', 'Код'), dataIndex: 'code', key: 'code' },
    { title: t('settings.taxRate', 'Ставка'), dataIndex: 'rate', key: 'rate' },
  ];
  const { data: shippingMethodsData } = useQuery({ queryKey: ['shipping-methods'], queryFn: () => shippingMethodsApi.getAll(), retry: 1 });
  const shippingMethodsList = shippingMethodsData?.data ?? [];
  const shippingMethodsColumns = [
    { title: '#', key: 'id', width: 60, render: (_: any, __: any, i: number) => i + 1 },
    { title: t('settings.shippingMethodName', 'Название'), dataIndex: 'name', key: 'name' },
    { title: t('settings.shippingMethodCode', 'Код'), dataIndex: 'code', key: 'code' },
  ];

  const updateSettingsMutation = useMutation({
    mutationFn: (payload: any) => integrationsApi.updateIntegrationSettings(payload),
    onSuccess: () => {
      message.success(t('settings.updated', 'Настройки обновлены'));
      queryClient.invalidateQueries({ queryKey: ['partner-integration-settings'] });
    },
  });

  const onSaveSettings = () => {
    try {
      const payload = JSON.parse(form.getFieldValue('settingsJson') || '{}');
      updateSettingsMutation.mutate(payload);
    } catch (e) {
      message.error(t('settings.invalidJson', 'Некорректный JSON'));
    }
  };

  return (
    <div className="fade-in">
      <Tabs defaultActiveKey="1" items={[
        {
          key: '1',
          label: t('settings.integration', 'Интеграции'),
          children: (
            <Card style={{ padding: 16 }}>
              <Form form={form} layout="vertical">
                <Form.Item label={t('settings.integrationJson', 'Настройки интеграции (JSON)')} name="settingsJson" initialValue={JSON.stringify(integrationSettings, null, 2)}>
                  <Input.TextArea rows={12} />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" onClick={onSaveSettings}>{t('common.save', 'Сохранить')}</Button>
                </Form.Item>
              </Form>
            </Card>
          ),
        },
        {
          key: '2',
          label: t('settings.apiKeys', 'API ключи'),
          children: (
            <Card style={{ padding: 16 }}>
              <Table
                dataSource={apiKeys}
                rowKey="id"
                columns={[
                  { title: '#', key: 'idx', render: (_: any, __: any, i: number) => i + 1, width: 60 },
                  { title: t('settings.apiKey', 'Ключ'), dataIndex: 'key', key: 'key' },
                  {
                    title: t('common.actions', 'Действие'),
                    key: 'actions',
                    width: 120,
                    render: (_: any, record: any) => (
                      <Tooltip title={t('common.delete', 'Удалить')}>
                        <DeleteOutlined
                          style={{ fontSize: 20, color: '#ff4d4f' }}
                          onClick={() => {
                            // simple delete action
                            integrationsApi.deleteApiKey?.(record.id).then(() => {
                              message.success(t('settings.apiKeyDeleted', 'API ключ удален'));
                              queryClient.invalidateQueries({ queryKey: ['partner-api-keys'] });
                            }).catch(() => {
                              message.error(t('common.error', 'Ошибка'));
                            });
                          }}
                        />
                      </Tooltip>
                    ),
                  },
                ]}
              />
            </Card>
          ),
        },
        {
          key: '3',
          label: t('settings.taxRules', 'Налоговые правила'),
          children: (
            <Card style={{ padding: 16 }}>
              <Table columns={taxRulesColumns} dataSource={taxRulesList} rowKey="id" pagination={false} />
            </Card>
          ),
        },
        {
          key: '4',
          label: t('settings.shippingMethods','Способы доставки'),
          children: (
            <Card style={{ padding: 16 }}>
              <Table columns={shippingMethodsColumns} dataSource={shippingMethodsList} rowKey="id" pagination={false} />
            </Card>
          ),
        },
      ]} />
    </div>
  );
};


