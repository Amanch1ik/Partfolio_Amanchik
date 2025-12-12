import { Card, Button, Table, Tag, Space, Spin, Empty, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { billingApi } from '../services/api';
import { formatDateTime } from '../utils/dateUtils';
import { toArray } from '../utils/arrayUtils';

export const BillingPage = () => {
  // Загрузка информации о биллинге
  const { data: billingInfoResponse, isLoading: infoLoading } = useQuery({
    queryKey: ['partner-billing-info'],
    queryFn: async () => {
      try {
        const response = await billingApi.getBillingInfo();
        return response?.data || {};
      } catch (error: any) {
        console.error('Error fetching billing info:', error);
        return {};
      }
    },
    retry: 1,
  });

  // Загрузка истории платежей
  const { data: billingHistoryResponse, isLoading: historyLoading } = useQuery({
    queryKey: ['partner-billing-history'],
    queryFn: async () => {
      try {
        const response = await billingApi.getBillingHistory();
        return response?.data || [];
      } catch (error: any) {
        console.error('Error fetching billing history:', error);
        return [];
      }
    },
    retry: 1,
  });

  // Мутация для создания счета
  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      await billingApi.createInvoice({});
    },
    onSuccess: () => {
      message.success('Счет создан');
      // Обновляем данные
      window.location.reload();
    },
    onError: (error: any) => {
      console.error('Error creating invoice:', error);
      message.error('Не удалось создать счет');
    },
  });

  const billingInfo = billingInfoResponse || {};
  const paymentHistory = toArray(billingHistoryResponse, []);

  const columns = [
    {
      title: '№',
      dataIndex: 'id',
      key: 'id',
      render: (id: any) => id?.toString() || '-',
    },
    {
      title: 'Дата',
      dataIndex: 'date',
      key: 'date',
      render: (date: string, record: any) => {
        const dateValue = date || record.created_at || record.createdAt;
        return dateValue ? formatDateTime(dateValue) : '-';
      },
    },
    {
      title: 'Сумма',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => (
        <span style={{ fontWeight: 600 }}>
          {amount ? amount.toLocaleString('ru-RU') : 0} сом
        </span>
      ),
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusValue = status?.toLowerCase() || '';
        const isPaid = statusValue === 'paid' || statusValue === 'оплачен' || statusValue === 'completed';
        return (
          <Tag color={isPaid ? 'green' : 'red'}>
            {isPaid ? 'Оплачен' : 'Просрочен'}
          </Tag>
        );
      },
    },
    {
      title: 'Действие',
      key: 'actions',
      width: 100,
      render: (_: any, record: any) => (
        <Button
          type="text"
          icon={<DownloadOutlined />}
          onClick={() => {
            // TODO: Реализовать скачивание счета
            message.info('Скачивание счета будет реализовано');
          }}
        />
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0, color: '#0F2A1D', background: 'linear-gradient(135deg, #0F2A1D 0%, #689071 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          💳 Биллинг
        </h1>
        <Button
          type="default"
          style={{
            borderRadius: 12,
            height: 40,
            border: '1px solid #E3EED4',
            color: '#689071',
          }}
        >
          📋 Посмотреть тарифы
        </Button>
      </div>

      <Card
        style={{
          borderRadius: 16,
          background: 'linear-gradient(135deg, #ffffff 0%, #F0F7EB 100%)',
          border: '2px solid #AEC380',
          marginBottom: 24,
          boxShadow: '0 4px 12px rgba(104, 144, 113, 0.15)',
        }}
      >
        {infoLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Spin size="large" />
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#0F2A1D', marginBottom: 12 }}>
                {billingInfo.plan_name || billingInfo.plan || '🏆 Базовый план'}
              </div>
              <Tag 
                color={billingInfo.status === 'active' ? '#689071' : '#ff4d4f'}
                style={{ fontSize: 14, padding: '6px 16px', borderRadius: 12 }}
              >
                {billingInfo.status === 'active' ? '✓ Активен' : 'Неактивен'}
              </Tag>
            </div>
            <Button
              type="primary"
              onClick={() => createInvoiceMutation.mutate()}
              loading={createInvoiceMutation.isPending}
              style={{
                background: 'linear-gradient(135deg, #689071 0%, #AEC380 100%)',
                border: 'none',
                borderRadius: 12,
                height: 40,
                fontWeight: 600,
              }}
            >
              📄 Выставить счет
            </Button>
          </div>
        )}
      </Card>

      <Card
        title={<span style={{ color: '#0F2A1D', fontSize: 16, fontWeight: 700 }}>📊 История оплат</span>}
        style={{
          borderRadius: 16,
          background: 'linear-gradient(135deg, #ffffff 0%, #F0F7EB 100%)',
          border: '1px solid #E3EED4',
          boxShadow: '0 2px 12px rgba(15, 42, 29, 0.08)',
        }}
      >
        {historyLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Spin size="large" />
          </div>
        ) : paymentHistory.length === 0 ? (
          <Empty description="Нет истории платежей" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Table
            columns={columns}
            dataSource={paymentHistory.map((item: any) => ({
              ...item,
              key: item.id?.toString() || Math.random().toString(),
            }))}
            pagination={{ pageSize: 10 }}
            rowClassName={() => 'partner-table-row'}
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
