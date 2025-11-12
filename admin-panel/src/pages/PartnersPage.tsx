import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  Button,
  Space,
  Card,
  Input,
  Select,
  Row,
  Col,
  Tag,
  Modal,
  Form,
  message,
  Tooltip,
  Pagination,
  Dropdown,
  Avatar,
} from 'antd';
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  ExportOutlined,
  ShopOutlined,
  MoreOutlined,
  EnvironmentOutlined,
  CheckOutlined,
  CloseOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { partnersApi } from '@/services/api';
import type { Partner } from '@/services/api';
import PageHeader from '@/components/PageHeader';
import { DeleteButton } from '@/components/DeleteButton';
import { t } from '@/i18n';
import { exportToCSV, exportToJSON } from '@/utils/exportUtils';
import '../styles/animations.css';

export const PartnersPage = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [form] = Form.useForm();

  // Получаем данные партнеров
  const { data: partnersData, isLoading, refetch } = useQuery({
    queryKey: ['partners', page, pageSize],
    queryFn: () => partnersApi.getAll(page, pageSize),
    retry: 1,
  });

  const partners = partnersData?.data?.items || [];
  const total = partnersData?.data?.total || 0;

  // Фильтруем партнеров
  const filteredPartners = partners.filter((partner) => {
    const matchesSearch =
      !searchText ||
      partner.name.toLowerCase().includes(searchText.toLowerCase()) ||
      partner.category.toLowerCase().includes(searchText.toLowerCase());

    const matchesStatus = !filterStatus || 
      (filterStatus === 'active' ? partner.is_active : !partner.is_active) ||
      (filterStatus === 'verified' ? partner.is_verified : !partner.is_verified);

    return matchesSearch && matchesStatus;
  });

  const handleEdit = (partner: Partner) => {
    setEditingPartner(partner);
    form.setFieldsValue(partner);
    setIsModalVisible(true);
  };

  const handleDelete = async (partnerId: number) => {
    try {
      await partnersApi.delete(partnerId);
      message.success(t('partners.deleted', 'Партнер удален'));
      refetch();
    } catch (error) {
      message.error(t('partners.deleteError', 'Ошибка при удалении партнера'));
    }
  };

  const handleApprove = async (partnerId: number) => {
    try {
      await partnersApi.approve(partnerId);
      message.success(t('partners.approved', 'Партнер одобрен'));
      refetch();
    } catch (error) {
      message.error(t('partners.approveError', 'Ошибка при одобрении партнера'));
    }
  };

  const handleReject = (partnerId: number) => {
    Modal.confirm({
      title: t('partners.rejectConfirm', 'Отклонить партнера?'),
      content: t('partners.rejectWarning', 'Введите причину отклонения'),
      onOk: async () => {
        try {
          await partnersApi.reject(partnerId, t('partners.rejectReason', 'По запросу администратора'));
          message.success(t('partners.rejected', 'Партнер отклонен'));
          refetch();
        } catch (error) {
          message.error(t('partners.rejectError', 'Ошибка при отклонении партнера'));
        }
      },
    });
  };

  const handleSave = async (values: any) => {
    try {
      if (editingPartner) {
        await partnersApi.update(editingPartner.id, values);
        message.success(t('partners.updated', 'Партнер обновлен'));
      } else {
        await partnersApi.create(values);
        message.success(t('partners.created', 'Партнер создан'));
      }
      setIsModalVisible(false);
      form.resetFields();
      setEditingPartner(null);
      refetch();
    } catch (error) {
      message.error(t('common.error', 'Ошибка при сохранении'));
    }
  };

  const handleExport = (format: 'csv' | 'json' = 'csv') => {
    const exportColumns = [
      { key: 'id', title: t('partners.export.id', 'ID') },
      { key: 'name', title: t('partners.export.name', 'Название') },
      { key: 'category', title: t('partners.export.category', 'Категория') },
      { key: 'email', title: t('partners.export.email', 'Email') },
      { key: 'phone', title: t('partners.export.phone', 'Телефон') },
      { 
        key: 'is_active', 
        title: t('partners.export.status', 'Статус'),
        render: (val: boolean, record: Partner) => {
          if (!val) return t('partners.rejected', 'Отклонен');
          if (!record.is_verified) return t('partners.pending', 'На проверке');
          return t('partners.approved', 'Активен');
        }
      },
    ];

    if (format === 'csv') {
      exportToCSV(partners, exportColumns, 'partners');
      message.success(t('common.exportSuccess', 'Файл успешно загружен'));
    } else {
      exportToJSON(partners, 'partners');
      message.success(t('common.exportSuccess', 'Файл успешно загружен'));
    }
  };

  // Генерация случайного рейтинга для демо
  const getRating = (id: number) => {
    return (id % 6); // 0-5 звезд
  };

  // Генерация статуса
  const getStatus = (partner: Partner) => {
    if (!partner.is_active) return { text: t('partners.rejected', 'Отклонен'), color: '#ff4d4f' };
    if (!partner.is_verified) return { text: t('partners.pending', 'На проверке'), color: '#262626' };
    return { text: t('partners.approved', 'Активен'), color: '#689071' };
  };

  const columns = [
    {
      title: '#',
      key: 'id',
      width: 60,
      render: (_: any, __: any, index: number) => (page - 1) * pageSize + index + 1,
    },
    {
      title: t('partners.logo', 'Логотип'),
      key: 'logo',
      width: 100,
      render: (_: any, record: Partner) => (
        <Avatar
          size={48}
          src={record.logo_url}
          icon={<ShopOutlined />}
          style={{
            backgroundColor: record.logo_url ? 'transparent' : '#52c41a',
            color: '#ffffff',
          }}
        />
      ),
    },
    {
      title: t('partners.name', 'Название'),
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string) => (
        <div>
          <div style={{ fontWeight: 500, color: '#0F2A1D' }}>{name || t('partners.defaultName', 'Глобус')}</div>
        </div>
      ),
    },
    {
      title: t('partners.category', 'Категория'),
      dataIndex: 'category',
      key: 'category',
      width: 150,
      render: (category: string) => category || t('partners.defaultCategory', 'Супермаркет'),
    },
    {
      title: t('partners.rating', 'Рейтинг'),
      key: 'rating',
      width: 150,
      render: (_: any, record: Partner) => {
        const rating = getRating(record.id);
        return (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {[...Array(5)].map((_, i) => (
              <span
                key={i}
                style={{
                  fontSize: 16,
                  color: i < rating ? '#ffc069' : '#d9d9d9',
                }}
              >
                ★
              </span>
            ))}
          </div>
        );
      },
    },
    {
      title: t('partners.status', 'Статус'),
      key: 'status',
      width: 150,
      render: (_: any, record: Partner) => {
        const status = getStatus(record);
        return (
          <Tag
            color={status.color}
            style={{
              padding: '4px 12px',
              borderRadius: 4,
              color: status.color === '#262626' ? '#262626' : '#ffffff',
              fontWeight: 500,
              border: status.color === '#262626' ? '1px solid #d9d9d9' : 'none',
            }}
          >
            {status.text}
          </Tag>
        );
      },
    },
    {
      title: t('common.actions', 'Действие'),
      key: 'actions',
      width: 200,
      render: (_: any, record: Partner) => {
        const status = getStatus(record);
        const actionMenuItems = [
          {
            key: 'locations',
            label: t('partners.locations', 'Локации'),
            icon: <EnvironmentOutlined />,
            onClick: () => message.info(t('partners.locations', 'Локации партнера')),
          },
          {
            key: 'employees',
            label: t('partners.employees', 'Сотрудники'),
            icon: <UserOutlined />,
            onClick: () => message.info(t('partners.employees', 'Сотрудники партнера')),
          },
          {
            key: 'edit',
            label: t('common.edit', 'Редактировать'),
            icon: <EditOutlined />,
            onClick: () => handleEdit(record),
          },
        ];

        if (!record.is_verified) {
          actionMenuItems.unshift({
            key: 'approve',
            label: t('partners.approve', 'Одобрить'),
            icon: <CheckOutlined />,
            onClick: () => handleApprove(record.id),
          });
        }

        if (record.is_active && !record.is_verified) {
          actionMenuItems.push({
            key: 'reject',
            label: t('partners.reject', 'Отклонить'),
            icon: <CloseOutlined />,
            danger: true,
            onClick: () => handleReject(record.id),
          });
        }

        actionMenuItems.push({
          key: 'delete',
          label: t('common.delete', 'Удалить'),
          icon: <DeleteOutlined />,
          danger: true,
          onClick: () => handleDelete(record.id),
        });

        return (
          <Space size="small">
            {status.text === t('partners.pending', 'На проверке') && (
              <Button
                type="primary"
                size="small"
                icon={<CheckOutlined />}
                onClick={() => handleApprove(record.id)}
                style={{ backgroundColor: '#689071', borderColor: '#689071' }}
              >
                {t('partners.approve', 'Одобрить')}
              </Button>
            )}
            <Tooltip title={t('common.delete', 'Удалить')}>
              <DeleteButton
                onDelete={() => handleDelete(record.id)}
                text=""
                className="danger compact icon-only"
                confirmTitle={t('partners.deleteConfirm', 'Удалить партнера?')}
                confirmContent={t('partners.deleteWarning', 'Это действие нельзя отменить')}
                confirmOkText={t('common.delete', 'Удалить')}
                confirmCancelText={t('common.cancel', 'Отменить')}
              />
            </Tooltip>
            <Dropdown
              menu={{ items: actionMenuItems }}
              trigger={['click']}
              placement="bottomRight"
            >
              <Button
                type="text"
                size="small"
                icon={<MoreOutlined />}
                onClick={(e) => e.stopPropagation()}
              />
            </Dropdown>
          </Space>
        );
      },
    },
  ];

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0F2A1D', margin: 0 }}>
          {t('partners.title', 'Партнёры')}
        </h1>
        <Dropdown
          menu={{
            items: [
              { 
                key: 'csv', 
                label: t('common.exportCSV', 'Экспорт в CSV'), 
                onClick: () => handleExport('csv') 
              },
              { 
                key: 'json', 
                label: t('common.exportJSON', 'Экспорт в JSON'), 
                onClick: () => handleExport('json') 
              },
            ],
          }}
          trigger={['click']}
        >
          <Button icon={<ExportOutlined />} type="primary">
            {t('common.export', 'Экспорт')}
          </Button>
        </Dropdown>
      </div>

      {/* Таблица */}
      <Card
        loading={isLoading}
        style={{
          borderRadius: 16,
          background: 'linear-gradient(135deg, #ffffff 0%, #F0F7EB 100%)',
          border: '1px solid #E3EED4',
          boxShadow: '0 2px 12px rgba(15, 42, 29, 0.08)',
        }}
        className="hover-lift-green"
      >
        <Table
          columns={columns}
          dataSource={filteredPartners}
          rowKey="id"
          pagination={false}
          scroll={{ x: 1200 }}
          style={{
            borderRadius: 8,
          }}
        />

        {/* Пагинация */}
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#689071' }}>
            {t('common.page', 'Страница')} {page} | {Math.ceil(total / pageSize)} {t('common.of', 'из')} {Math.ceil(total / pageSize)}
          </span>
          <Pagination
            current={page}
            total={total}
            pageSize={pageSize}
            onChange={setPage}
            showSizeChanger
            onShowSizeChange={(_, size) => setPageSize(size)}
            showQuickJumper
          />
        </div>
      </Card>

      {/* Модальное окно редактирования */}
      <Modal
        title={editingPartner ? t('partners.edit', 'Редактировать партнёра') : t('partners.add', 'Добавить партнёра')}
        open={isModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
          setEditingPartner(null);
        }}
        okText={editingPartner ? t('common.save', 'Сохранить') : t('common.create', 'Создать')}
        cancelText={t('common.cancel', 'Отменить')}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            label={t('partners.name', 'Название')}
            name="name"
            rules={[{ required: true, message: t('partners.nameRequired', 'Введите название') }]}
          >
            <Input placeholder={t('partners.namePlaceholder', 'Введите название партнера')} />
          </Form.Item>

          <Form.Item
            label={t('partners.category', 'Категория')}
            name="category"
            rules={[{ required: true, message: t('partners.categoryRequired', 'Выберите категорию') }]}
          >
            <Select placeholder={t('partners.categoryPlaceholder', 'Выберите категорию')}>
              <Select.Option value="Супермаркет">{t('partners.categorySupermarket', 'Супермаркет')}</Select.Option>
              <Select.Option value="Ресторан">{t('partners.categoryRestaurant', 'Ресторан')}</Select.Option>
              <Select.Option value="Кафе">{t('partners.categoryCafe', 'Кафе')}</Select.Option>
              <Select.Option value="Аптека">{t('partners.categoryPharmacy', 'Аптека')}</Select.Option>
              <Select.Option value="Магазин">{t('partners.categoryShop', 'Магазин')}</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label={t('partners.description', 'Описание')}
            name="description"
          >
            <Input.TextArea rows={4} placeholder={t('partners.descriptionPlaceholder', 'Введите описание')} />
          </Form.Item>

          <Form.Item
            label={t('partners.cashback', 'Кэшбэк (%)')}
            name="cashback_rate"
            rules={[{ required: true, message: t('partners.cashbackRequired', 'Введите процент кэшбэка') }]}
          >
            <Input type="number" placeholder={t('partners.cashbackPlaceholder', 'Например: 5')} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
