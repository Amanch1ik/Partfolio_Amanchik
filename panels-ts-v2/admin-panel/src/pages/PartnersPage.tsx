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
  Upload,
  InputNumber,
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
  UploadOutlined,
  PictureOutlined,
  GlobalOutlined,
  BankOutlined,
} from '@ant-design/icons';
import { partnersApi, settingsApi, adminApi } from '@/services/api';
import type { Partner } from '@/services/api';
import PageHeader from '@/components/PageHeader';
import { DeleteButton } from '@/components/DeleteButton';
import { t } from '@/i18n';
import { exportToCSV, exportToExcel, exportToJSON } from '@/utils/exportUtils';
import '../styles/animations.css';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { toArray } from '../utils/arrayUtils';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Компонент для обработки клика на карту
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lon: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Fix Leaflet default icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

import { useDocumentTitle } from '@shared/hooks/useDocumentTitle';

export const PartnersPage = () => {
  useDocumentTitle('Партнеры', 'YESS!GO Admin');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [form] = Form.useForm();
  const [mapCoords, setMapCoords] = useState<[number, number] | null>(null);
  const [logoFileList, setLogoFileList] = useState<any[]>([]);
  const [coverFileList, setCoverFileList] = useState<any[]>([]);

  // Получаем список городов
  const { data: citiesData } = useQuery({
    queryKey: ['cities'],
    queryFn: () => settingsApi.cities.getAll(),
  });

  const cities = citiesData?.data || [];

  // Функция для генерации ссылки на 2GIS по координатам
  const generate2GisLink = (lat: number, lon: number): string => {
    // 2GIS использует формат: https://2gis.kg/bishkek/geo/{lon},{lat}
    return `https://2gis.kg/bishkek/geo/${lon},${lat}`;
  };

  // Получаем данные партнеров
  const { data: partnersData, isLoading, refetch, error } = useQuery({
    queryKey: ['partners', page, pageSize, searchText, filterStatus],
    queryFn: () => partnersApi.getAll(page, pageSize, searchText || undefined, filterStatus),
    retry: 1,
  });

  const partners: Partner[] = toArray<Partner>(partnersData?.data, [] as Partner[]);
  const total = (typeof partnersData?.data?.total === 'number') ? (partnersData?.data?.total as number) : partners.length;
  const totalPages = partnersData?.data?.total_pages || Math.ceil(total / pageSize);

  // Фильтруем партнеров локально (если API не поддерживает фильтрацию)
  const filteredPartners = partners.filter((partner) => {
    const matchesSearch =
      !searchText ||
      (partner.name && partner.name.toLowerCase().includes(searchText.toLowerCase())) ||
      (partner.category && partner.category.toLowerCase().includes(searchText.toLowerCase())) ||
      (partner.email && partner.email.toLowerCase().includes(searchText.toLowerCase()));

    const matchesStatus = !filterStatus || 
      (filterStatus === 'active' && partner.status === 'active') ||
      (filterStatus === 'pending' && partner.status === 'pending') ||
      (filterStatus === 'inactive' && partner.status !== 'active');

    return matchesSearch && matchesStatus;
  });

  const handleEdit = (partner: Partner) => {
    setEditingPartner(partner);
    form.setFieldsValue(partner);
    if (partner.latitude && partner.longitude) {
      setMapCoords([partner.latitude, partner.longitude]);
    }
    // Устанавливаем файлы для логотипа и обложки
    if ((partner as any).logo_url) {
      setLogoFileList([{
        uid: '-1',
        name: 'logo',
        status: 'done',
        url: (partner as any).logo_url,
      }]);
    } else {
      setLogoFileList([]);
    }
    if ((partner as any).cover_image_url) {
      setCoverFileList([{
        uid: '-2',
        name: 'cover',
        status: 'done',
        url: (partner as any).cover_image_url,
      }]);
    } else {
      setCoverFileList([]);
    }
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

  const handleExport = (format: 'csv' | 'excel' | 'json' = 'csv') => {
    // Используем отфильтрованные данные для экспорта
    const dataToExport = filteredPartners.length > 0 ? filteredPartners : partners;
    
    // Проверяем, что есть данные для экспорта
    if (!dataToExport || dataToExport.length === 0) {
      message.warning(t('common.noDataToExport', 'Нет данных для экспорта'));
      return;
    }

    const exportColumns = [
      { key: 'id', title: t('partners.export.id', 'ID') },
      { key: 'name', title: t('partners.export.name', 'Название') },
      { key: 'category', title: t('partners.export.category', 'Категория') },
      { key: 'email', title: t('partners.export.email', 'Email') },
      { key: 'phone', title: t('partners.export.phone', 'Телефон') },
      { 
        key: 'status', 
        title: t('partners.export.status', 'Статус'),
        render: (_: any, record: Partner) => {
          const status = record.status || 'active';
          switch (status) {
            case 'active':
          return t('partners.approved', 'Активен');
            case 'pending':
              return t('partners.pending', 'На проверке');
            case 'rejected':
              return t('partners.rejected', 'Отклонен');
            default:
              return status;
          }
        }
      },
    ];

    try {
      if (format === 'csv') {
        exportToCSV(dataToExport, exportColumns, 'partners');
        message.success(t('common.exportSuccess', 'Файл успешно загружен'));
      } else if (format === 'excel') {
        exportToExcel(dataToExport, exportColumns, 'partners');
        message.success(t('common.exportSuccess', 'Файл успешно загружен'));
      } else {
        exportToJSON(dataToExport, 'partners');
        message.success(t('common.exportSuccess', 'Файл успешно загружен'));
      }
    } catch (error) {
      console.error('Export error:', error);
      message.error(t('common.exportError', 'Ошибка при экспорте данных'));
    }
  };

  // Генерация статуса
  const getStatus = (partner: Partner) => {
    const status: string = partner.status || ((partner as any).is_active !== false ? 'active' : 'inactive');
    switch (status) {
      case 'active':
        return { text: t('partners.approved', 'Активен'), color: 'var(--color-success)' };
      case 'pending':
        return { text: t('partners.pending', 'На проверке'), color: 'var(--color-warning, #faad14)' };
      case 'rejected':
        return { text: t('partners.rejected', 'Отклонен'), color: 'var(--color-error)' };
      case 'inactive':
        return { text: t('partners.inactive', 'Неактивен'), color: '#8c8c8c' };
      default:
        return { text: status, color: '#8c8c8c' };
    }
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
            backgroundColor: record.logo_url ? 'transparent' : 'var(--color-success)',
            color: 'var(--color-text-inverse)',
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
          <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{name || t('partners.defaultName', 'Глобус')}</div>
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
        const ratingValue = (record as any).rating;
        if (ratingValue == null) {
          return <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>;
        }
        const rating = Math.max(0, Math.min(5, Number(ratingValue)));
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
              color: status.color === '#262626' ? '#262626' : 'var(--color-text-inverse)',
              fontWeight: 500,
              border: status.color === '#262626' ? '1px solid var(--color-border)' : 'none',
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

        const partnerStatus: string = record.status || 'pending';
        if (partnerStatus === 'pending') {
          actionMenuItems.unshift({
            key: 'approve',
            label: t('partners.approve', 'Одобрить'),
            icon: <CheckOutlined />,
            onClick: () => handleApprove(record.id),
          });
        }

        if (partnerStatus === 'pending' || partnerStatus === 'active') {
        actionMenuItems.push({
          key: 'reject',
          label: t('partners.reject', 'Отклонить'),
          icon: <CloseOutlined />,
          onClick: () => handleReject(record.id),
        });
        }

        actionMenuItems.push({
          key: 'delete',
          label: t('common.delete', 'Удалить'),
          icon: <DeleteOutlined />,
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
                style={{ background: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
              >
                {t('partners.approve', 'Одобрить')}
              </Button>
            )}
            <Tooltip title={t('common.delete', 'Удалить')}>
              <span style={{ display: 'inline-block' }}>
                <DeleteButton
                  onDelete={() => handleDelete(record.id)}
                  text=""
                  className="danger compact icon-only"
                  confirmTitle={t('partners.deleteConfirm', 'Удалить партнера?')}
                  confirmContent={t('partners.deleteWarning', 'Это действие нельзя отменить')}
                  confirmOkText={t('common.delete', 'Удалить')}
                  confirmCancelText={t('common.cancel', 'Отменить')}
                />
              </span>
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
      <PageHeader
        title={t('partners.title', 'Партнёры')}
        extra={[
          <Button
            key="add"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingPartner(null);
              form.resetFields();
              setMapCoords(null);
              setIsModalVisible(true);
            }}
            style={{ marginRight: 8 }}
          >
            {t('partners.add', 'Добавить партнёра')}
          </Button>,
          <Dropdown
            key="export"
            menu={{
              items: [
                { 
                  key: 'csv', 
                  label: t('common.exportCSV', 'Экспорт в CSV'), 
                  onClick: () => handleExport('csv') 
                },
                { 
                  key: 'excel', 
                  label: t('common.exportExcel', 'Экспорт в Excel'), 
                  onClick: () => handleExport('excel') 
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
            <Button icon={<ExportOutlined />}>
            {t('common.export', 'Экспорт')}
          </Button>
          </Dropdown>,
        ]}
      />

      {/* Поиск и фильтры */}
      <Card
        style={{
          marginBottom: 16,
          borderRadius: 12,
          background: 'var(--color-bg-primary)',
          border: '1px solid var(--color-border)',
        }}
      >
        <Row gutter={16} align="middle">
          <Col xs={24} sm={12} md={10}>
            <Input
              placeholder={t('partners.searchPlaceholder', 'Поиск по названию, категории, email...')}
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setPage(1);
              }}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Select
              placeholder={t('partners.filterStatus', 'Фильтр по статусу')}
              value={filterStatus}
              onChange={(value) => {
                setFilterStatus(value);
                setPage(1);
              }}
              allowClear
              style={{ width: '100%' }}
            >
              <Select.Option value="active">{t('partners.approved', 'Активен')}</Select.Option>
              <Select.Option value="pending">{t('partners.pending', 'На проверке')}</Select.Option>
              <Select.Option value="rejected">{t('partners.rejected', 'Отклонен')}</Select.Option>
              <Select.Option value="inactive">{t('partners.inactive', 'Неактивен')}</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={24} md={6}>
            <Space>
              {(searchText || filterStatus) && (
                <Button
                  onClick={() => {
                    setSearchText('');
                    setFilterStatus(undefined);
                    setPage(1);
                  }}
                >
                  {t('common.clearFilters', 'Очистить')}
                </Button>
              )}
              <Button
                icon={<FilterOutlined />}
                onClick={() => message.info(t('common.filtersApplied', 'Фильтры применены'))}
              >
                {t('common.filters', 'Фильтры')}
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Таблица */}
      <Card
        loading={isLoading}
        style={{
          borderRadius: 16,
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          boxShadow: 'var(--card-shadow)',
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
          <span style={{ color: 'var(--color-text-secondary)' }}>
            {t('common.showing', 'Показано')} {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, total)} {t('common.of', 'из')} {total}
          </span>
          <Pagination
            current={page}
            total={total}
            pageSize={pageSize}
            onChange={(newPage) => {
              setPage(newPage);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            showSizeChanger
            onShowSizeChange={(_, size) => {
              setPageSize(size);
              setPage(1);
            }}
            showQuickJumper
            showTotal={(total, range) => `${range[0]}-${range[1]} из ${total}`}
          />
        </div>
      </Card>

      {/* Модальное окно редактирования с улучшенным UI */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ShopOutlined style={{ color: 'var(--color-primary)', fontSize: 24 }} />
            <span style={{ fontSize: 20, fontWeight: 600 }}>
              {editingPartner ? t('partners.edit', 'Редактировать партнёра') : t('partners.add', 'Добавить партнёра')}
            </span>
          </div>
        }
        open={isModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
          setEditingPartner(null);
          setMapCoords(null);
          setLogoFileList([]);
          setCoverFileList([]);
        }}
        okText={editingPartner ? t('common.save', 'Сохранить') : t('common.create', 'Создать')}
        cancelText={t('common.cancel', 'Отменить')}
        width={window.innerWidth < 768 ? '95%' : 900}
        style={{ 
          top: window.innerWidth < 768 ? 10 : 20,
          maxWidth: '95vw',
        }}
        okButtonProps={{ style: { background: 'var(--color-primary)', borderColor: 'var(--color-primary)' } }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          style={{ marginTop: 16 }}
        >
          <Row gutter={16}>
            {/* Левая колонка - Основная информация */}
            <Col xs={24} md={12}>
              <Card
                title={t('partners.basicInfo', 'Основная информация')}
                size="small"
                style={{ marginBottom: 16, borderRadius: 8 }}
              >
                <Form.Item
                  label={t('partners.name', 'Название')}
                  name="name"
                  rules={[{ required: true, message: t('partners.nameRequired', 'Введите название') }]}
                >
                  <Input 
                    placeholder={t('partners.namePlaceholder', 'Введите название партнера')}
                    size="large"
                  />
                </Form.Item>

                <Form.Item
                  label={t('partners.category', 'Категория')}
                  name="category"
                  rules={[{ required: true, message: t('partners.categoryRequired', 'Выберите категорию') }]}
                >
                  <Select 
                    placeholder={t('partners.categoryPlaceholder', 'Выберите категорию')}
                    size="large"
                  >
                    <Select.Option value="Супермаркет">{t('partners.categorySupermarket', 'Супермаркет')}</Select.Option>
                    <Select.Option value="Ресторан">{t('partners.categoryRestaurant', 'Ресторан')}</Select.Option>
                    <Select.Option value="Кафе">{t('partners.categoryCafe', 'Кафе')}</Select.Option>
                    <Select.Option value="Аптека">{t('partners.categoryPharmacy', 'Аптека')}</Select.Option>
                    <Select.Option value="Магазин">{t('partners.categoryShop', 'Магазин')}</Select.Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  label={t('partners.email', 'Email')}
                  name="email"
                  rules={[{ type: 'email', message: t('partners.emailInvalid', 'Неверный формат email') }]}
                >
                  <Input 
                    placeholder="partner@example.com"
                    size="large"
                  />
                </Form.Item>

                <Form.Item
                  label={t('partners.phone', 'Телефон')}
                  name="phone"
                >
                  <Input 
                    placeholder="+996551234567"
                    size="large"
                  />
                </Form.Item>

                <Form.Item
                  label={t('partners.cashback', 'Кэшбэк (%)')}
                  name="cashback_rate"
                  rules={[{ required: true, message: t('partners.cashbackRequired', 'Введите процент кэшбэка') }]}
                >
                  <Input 
                    type="number" 
                    placeholder={t('partners.cashbackPlaceholder', 'Например: 5')}
                    size="large"
                    min={0}
                    max={100}
                  />
                </Form.Item>

                <Form.Item
                  label={t('partners.description', 'Описание')}
                  name="description"
                >
                  <Input.TextArea 
                    rows={4} 
                    placeholder={t('partners.descriptionPlaceholder', 'Введите описание')}
                    showCount
                    maxLength={500}
                  />
                </Form.Item>

                <Form.Item
                  label={t('partners.logo', 'Логотип')}
                  name="logo_url"
                >
                  <Upload
                    listType="picture-card"
                    fileList={logoFileList}
                    onChange={async ({ fileList, file }) => {
                      setLogoFileList(fileList);
                      if (file.status === 'uploading') {
                        return;
                      }
                      if (file.status === 'done' && file.response) {
                        form.setFieldsValue({ logo_url: file.response.logo_url || file.response.url });
                      } else if (fileList.length > 0 && fileList[0].url && !fileList[0].originFileObj) {
                        form.setFieldsValue({ logo_url: fileList[0].url });
                      } else if (fileList.length > 0 && fileList[0].originFileObj && editingPartner) {
                        // Загружаем на сервер
                        try {
                          const response = await adminApi.uploadPartnerLogo(editingPartner.id, fileList[0].originFileObj);
                          form.setFieldsValue({ logo_url: response.data?.logo_url });
                          setLogoFileList([{
                            ...fileList[0],
                            status: 'done',
                            url: response.data?.logo_url,
                            response: response.data,
                          }]);
                          message.success(t('partners.logoUploaded', 'Логотип загружен'));
                        } catch (error) {
                          message.error(t('partners.logoUploadError', 'Ошибка при загрузке логотипа'));
                          setLogoFileList(fileList.filter((f: any) => f.uid !== fileList[0].uid));
                        }
                      }
                    }}
                    beforeUpload={(file) => {
                      if (editingPartner) {
                        return true; // Разрешаем загрузку
                      }
                      message.warning(t('partners.createPartnerFirst', 'Сначала создайте партнера'));
                      return false;
                    }}
                    customRequest={async ({ file, onSuccess, onError }) => {
                      if (!editingPartner) {
                        onError?.(new Error(t('partners.partnerNotSelected', 'Партнер не выбран')));
                        return;
                      }
                      try {
                        const response = await adminApi.uploadPartnerLogo(editingPartner.id, file as File);
                        onSuccess?.(response.data, file as any);
                      } catch (error) {
                        onError?.(error as Error);
                      }
                    }}
                    maxCount={1}
                  >
                    {logoFileList.length < 1 && (
                      <div>
                        <PictureOutlined />
                        <div style={{ marginTop: 8 }}>{t('partners.uploadLogo', 'Загрузить логотип')}</div>
                      </div>
                    )}
                  </Upload>
                </Form.Item>

                <Form.Item
                  label={t('partners.coverImage', 'Обложка')}
                  name="cover_image_url"
                >
                  <Upload
                    listType="picture-card"
                    fileList={coverFileList}
                    onChange={async ({ fileList, file }) => {
                      setCoverFileList(fileList);
                      if (file.status === 'uploading') {
                        return;
                      }
                      if (file.status === 'done' && file.response) {
                        form.setFieldsValue({ cover_image_url: file.response.cover_image_url || file.response.url });
                      } else if (fileList.length > 0 && fileList[0].url && !fileList[0].originFileObj) {
                        form.setFieldsValue({ cover_image_url: fileList[0].url });
                      } else if (fileList.length > 0 && fileList[0].originFileObj && editingPartner) {
                        try {
                          const response = await adminApi.uploadPartnerCover(editingPartner.id, fileList[0].originFileObj);
                          form.setFieldsValue({ cover_image_url: response.data?.cover_image_url });
                          setCoverFileList([{
                            ...fileList[0],
                            status: 'done',
                            url: response.data?.cover_image_url,
                            response: response.data,
                          }]);
                          message.success(t('partners.coverUploaded', 'Обложка загружена'));
                        } catch (error) {
                          message.error(t('partners.coverUploadError', 'Ошибка при загрузке обложки'));
                          setCoverFileList(fileList.filter((f: any) => f.uid !== fileList[0].uid));
                        }
                      }
                    }}
                    beforeUpload={(file) => {
                      if (editingPartner) {
                        return true;
                      }
                      message.warning(t('partners.createPartnerFirst', 'Сначала создайте партнера'));
                      return false;
                    }}
                    customRequest={async ({ file, onSuccess, onError }) => {
                      if (!editingPartner) {
                        onError?.(new Error(t('partners.partnerNotSelected', 'Партнер не выбран')));
                        return;
                      }
                      try {
                        const response = await adminApi.uploadPartnerCover(editingPartner.id, file as File);
                        onSuccess?.(response.data, file as any);
                      } catch (error) {
                        onError?.(error as Error);
                      }
                    }}
                    maxCount={1}
                  >
                    {coverFileList.length < 1 && (
                      <div>
                        <PictureOutlined />
                        <div style={{ marginTop: 8 }}>{t('partners.uploadCover', 'Загрузить обложку')}</div>
                      </div>
                    )}
                  </Upload>
                </Form.Item>

                <Form.Item
                  label={t('partners.website', 'Веб-сайт')}
                  name="website"
                >
                  <Input 
                    placeholder="https://example.com"
                    prefix={<GlobalOutlined />}
                    size="large"
                  />
                </Form.Item>

                <Form.Item
                  label={t('partners.city', 'Город')}
                  name="city_id"
                >
                  <Select 
                    placeholder={t('partners.selectCity', 'Выберите город')}
                    size="large"
                    showSearch
                    optionFilterProp="children"
                  >
                    {cities.map((city: any) => (
                      <Select.Option key={city.id} value={city.id}>
                        {city.name}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  label={t('partners.maxDiscount', 'Максимальная скидка (%)')}
                  name="max_discount_percent"
                >
                  <InputNumber 
                    placeholder={t('partners.maxDiscountPlaceholder', 'Например: 20')}
                    min={0}
                    max={100}
                    style={{ width: '100%' }}
                    size="large"
                  />
                </Form.Item>

                <Form.Item
                  label={t('partners.bankAccount', 'Банковский счет')}
                  name="bank_account"
                >
                  <Input 
                    placeholder={t('partners.bankAccountPlaceholder', 'Номер банковского счета')}
                    prefix={<BankOutlined />}
                    size="large"
                  />
                </Form.Item>
              </Card>
            </Col>

            {/* Правая колонка - Адрес и карта */}
            <Col xs={24} md={12}>
              <Card
                title={t('partners.locationInfo', 'Местоположение')}
                size="small"
                style={{ marginBottom: 16, borderRadius: 8 }}
              >
                <Form.Item
                  label={t('partners.address', 'Адрес')}
                  name="address"
                  rules={[{ required: true, message: t('partners.addressRequired', 'Выберите адрес') }]}
                >
                  <AddressAutocomplete
                    placeholder={t('partners.addressPlaceholder', 'Начните вводить адрес или выберите на карте')}
                    showExisting={true}
                    onSelectAddress={(opt) => {
                      const twoGisLink = generate2GisLink(opt.lat, opt.lon);
                      form.setFieldsValue({
                        address: opt.value,
                        latitude: opt.lat,
                        longitude: opt.lon,
                        two_gis_link: twoGisLink,
                      });
                      setMapCoords([opt.lat, opt.lon]);
                    }}
                  />
                </Form.Item>

                {/* Скрытые поля для координат */}
                <Form.Item name="latitude" hidden>
                  <Input type="hidden" />
                </Form.Item>
                <Form.Item name="longitude" hidden>
                  <Input type="hidden" />
                </Form.Item>

                {/* 2GIS интеграция - автоматически заполняется при выборе адреса */}
                <Form.Item
                  label={t('partners.twoGisLink', 'Ссылка на 2GIS')}
                  name="two_gis_link"
                  help={t('partners.twoGisHelpAuto', 'Ссылка автоматически генерируется при выборе адреса на карте')}
                >
                  <Input 
                    placeholder="https://2gis.kg/bishkek/geo/..."
                    readOnly
                    addonAfter={
                      <Button
                        type="link"
                        size="small"
                        onClick={() => {
                          const link = form.getFieldValue('two_gis_link');
                          if (link) {
                            window.open(link, '_blank');
                          } else {
                            message.warning(t('partners.twoGisLinkRequired', 'Выберите адрес на карте для генерации ссылки'));
                          }
                        }}
                      >
                        {t('partners.openIn2Gis', 'Открыть в 2GIS')}
                      </Button>
                    }
                  />
                </Form.Item>

                {/* Мини-карта для предпросмотра с возможностью клика */}
                <div style={{ height: 200, borderRadius: 8, overflow: 'hidden', marginTop: 16, border: '1px solid var(--color-border)', position: 'relative' }}>
                  <MapContainer
                    center={mapCoords || [form.getFieldValue('latitude') || 42.8746, form.getFieldValue('longitude') || 74.5698]}
                    zoom={mapCoords ? 15 : 13}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={true}
                    key={`${mapCoords?.[0] || form.getFieldValue('latitude') || 42.8746}-${mapCoords?.[1] || form.getFieldValue('longitude') || 74.5698}`}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {/* Обработчик клика на карту */}
                    <MapClickHandler
                      onMapClick={async (lat, lon) => {
                        const twoGisLink = generate2GisLink(lat, lon);
                        form.setFieldsValue({
                          latitude: lat,
                          longitude: lon,
                          two_gis_link: twoGisLink,
                        });
                        setMapCoords([lat, lon]);
                        
                        // Получаем адрес по координатам при клике на карте
                        try {
                          const response = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
                            {
                              headers: { 'User-Agent': 'YESS-AdminPanel/1.0' },
                            }
                          );
                          const data = await response.json();
                          if (data.display_name) {
                            form.setFieldsValue({
                              address: data.display_name,
                            });
                            message.success(t('partners.addressSelected', 'Адрес выбран на карте'));
                          }
                        } catch (error) {
                          console.error('Reverse geocoding error:', error);
                          message.success(t('partners.coordinatesSelected', 'Координаты выбраны на карте'));
                        }
                      }}
                    />
                    {(mapCoords || (form.getFieldValue('latitude') && form.getFieldValue('longitude'))) && (
                      <Marker position={mapCoords || [form.getFieldValue('latitude'), form.getFieldValue('longitude')]} />
                    )}
                  </MapContainer>
                  <div style={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    background: 'rgba(255, 255, 255, 0.9)',
                    padding: '4px 8px',
                    borderRadius: 4,
                    fontSize: 12,
                    color: 'var(--color-text-secondary)',
                    zIndex: 1000,
                  }}>
                    {t('partners.clickOnMap', 'Кликните на карте для выбора адреса')}
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};
