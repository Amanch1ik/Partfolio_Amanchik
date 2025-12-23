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

  const generate2GisLink = (lat: number, lon: number): string => {
    return `https://2gis.kg/bishkek/geo/${lon},${lat}`;
  };

  const { data: partnersData, isLoading, refetch } = useQuery({
    queryKey: ['partners', page, pageSize, searchText, filterStatus],
    queryFn: () => partnersApi.getAll(page, pageSize, searchText || undefined, filterStatus),
    retry: 1,
  });

  const partners: Partner[] = toArray<Partner>(partnersData?.data, [] as Partner[]);
  const total = (typeof partnersData?.data?.total === 'number') ? (partnersData?.data?.total as number) : partners.length;

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
    if ((partner as any).logo_url) {
      setLogoFileList([{ uid: '-1', name: 'logo', status: 'done', url: (partner as any).logo_url }]);
    } else {
      setLogoFileList([]);
    }
    if ((partner as any).cover_image_url) {
      setCoverFileList([{ uid: '-2', name: 'cover', status: 'done', url: (partner as any).cover_image_url }]);
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
      let partnerId = editingPartner?.id;
      if (editingPartner) {
        await partnersApi.update(editingPartner.id, values);
        message.success(t('partners.updated', 'Партнер обновлен'));
      } else {
        const response = await partnersApi.create(values);
        partnerId = (response as any)?.data?.id || response?.id;
        message.success(t('partners.created', 'Партнер создан'));
      }

      // Загрузка файлов если они есть
      if (partnerId) {
        if (logoFileList.length > 0 && logoFileList[0].originFileObj) {
          await adminApi.uploadPartnerLogo(partnerId, logoFileList[0].originFileObj);
        }
        if (coverFileList.length > 0 && coverFileList[0].originFileObj) {
          await adminApi.uploadPartnerCover(partnerId, coverFileList[0].originFileObj);
        }
      }

      setIsModalVisible(false);
      form.resetFields();
      setEditingPartner(null);
      setLogoFileList([]);
      setCoverFileList([]);
      refetch();
    } catch (error) {
      message.error(t('common.error', 'Ошибка при сохранении'));
    }
  };

  const handleExport = (format: 'csv' | 'excel' | 'json' = 'csv') => {
    const dataToExport = filteredPartners.length > 0 ? filteredPartners : partners;
    if (!dataToExport || dataToExport.length === 0) {
      message.warning(t('common.noDataToExport', 'Нет данных для экспорта'));
      return;
    }

    const exportColumns = [
      { key: 'id', title: 'ID' },
      { key: 'name', title: 'Название' },
      { key: 'category', title: 'Категория' },
      { key: 'email', title: 'Email' },
      { key: 'phone', title: 'Телефон' },
      { key: 'status', title: 'Статус' },
    ];

    try {
      if (format === 'csv') exportToCSV(dataToExport, exportColumns, 'partners');
      else if (format === 'excel') exportToExcel(dataToExport, exportColumns, 'partners');
      else exportToJSON(dataToExport, 'partners');
      message.success(t('common.exportSuccess', 'Файл успешно загружен'));
    } catch (error) {
      message.error(t('common.exportError', 'Ошибка при экспорте данных'));
    }
  };

  const getStatus = (partner: Partner) => {
    const status: string = partner.status || ((partner as any).is_active !== false ? 'active' : 'inactive');
    switch (status) {
      case 'active': return { text: t('partners.approved', 'Активен'), color: '#07B981' };
      case 'pending': return { text: t('partners.pending', 'На проверке'), color: '#F59E0B' };
      case 'rejected': return { text: t('partners.rejected', 'Отклонен'), color: '#EF4444' };
      case 'inactive': return { text: t('partners.inactive', 'Неактивен'), color: '#94a3b8' };
      default: return { text: status, color: '#94a3b8' };
    }
  };

  const columns = [
    { title: '#', key: 'id', width: 60, render: (_: any, __: any, index: number) => (page - 1) * pageSize + index + 1 },
    {
      title: t('partners.logo', 'Логотип'),
      key: 'logo',
      width: 100,
      render: (_: any, record: Partner) => (
        <Avatar size={48} src={record.logo_url} icon={<ShopOutlined />} style={{ backgroundColor: record.logo_url ? 'transparent' : '#E8F8F3', color: '#07B981' }} />
      ),
    },
    {
      title: t('partners.name', 'Название'),
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string) => <div style={{ fontWeight: 600, color: '#03533A' }}>{name || t('partners.defaultName', 'Глобус')}</div>,
    },
    { title: t('partners.category', 'Категория'), dataIndex: 'category', key: 'category', width: 150 },
    {
      title: t('partners.status', 'Статус'),
      key: 'status',
      width: 150,
      render: (_: any, record: Partner) => {
        const status = getStatus(record);
        return <Tag color={status.color} style={{ padding: '4px 12px', borderRadius: 8, fontWeight: 500, color: '#ffffff', border: 'none' }}>{status.text}</Tag>;
      },
    },
    {
      title: t('common.actions', 'Действие'),
      key: 'actions',
      width: 200,
      render: (_: any, record: Partner) => (
        <Space size="small">
          {record.status === 'pending' && <Button type="primary" size="small" icon={<CheckOutlined />} onClick={() => handleApprove(record.id)} style={{ background: '#07B981', borderColor: '#07B981' }}>{t('partners.approve', 'Одобрить')}</Button>}
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <DeleteButton onDelete={() => handleDelete(record.id)} text="" className="danger compact icon-only" />
          <Dropdown
            menu={{
              items: [
                { key: 'products', label: 'Товары', icon: <ShopOutlined />, onClick: () => navigate(`/partners/${record.id}/products`) },
                { key: 'locations', label: 'Локации', icon: <EnvironmentOutlined /> },
                { key: 'employees', label: 'Сотрудники', icon: <UserOutlined /> },
                { key: 'reject', label: 'Отклонить', icon: <CloseOutlined />, danger: true, onClick: () => handleReject(record.id) },
              ]
            }}
            trigger={['click']}
          >
            <Button type="text" size="small" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      ),
    },
  ];

  return (
    <div className="fade-in">
      <PageHeader
        title={t('partners.title', 'Партнёры')}
        extra={[
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditingPartner(null); form.resetFields(); setIsModalVisible(true); }} style={{ background: '#03533A', borderColor: '#03533A' }}>{t('partners.add', 'Добавить партнёра')}</Button>,
          <Dropdown key="export" menu={{ items: [{ key: 'csv', label: 'CSV', onClick: () => handleExport('csv') }, { key: 'excel', label: 'Excel', onClick: () => handleExport('excel') }] }}>
            <Button icon={<ExportOutlined />}>{t('common.export', 'Экспорт')}</Button>
          </Dropdown>,
        ]}
      />

      <Card style={{ marginBottom: 16, borderRadius: 16, border: '1px solid #E8F8F3', boxShadow: '0 4px 12px rgba(3, 83, 58, 0.05)' }}>
        <Row gutter={16} align="middle">
          <Col xs={24} md={12}><Input placeholder="Поиск партнеров..." prefix={<SearchOutlined style={{ color: '#07B981' }} />} value={searchText} onChange={(e) => setSearchText(e.target.value)} size="large" style={{ borderRadius: 12 }} /></Col>
          <Col xs={24} md={12}>
            <Select placeholder="Статус" value={filterStatus} onChange={setFilterStatus} style={{ width: '100%' }} allowClear size="large">
              <Select.Option value="active">Активен</Select.Option>
              <Select.Option value="pending">На проверке</Select.Option>
              <Select.Option value="inactive">Неактивен</Select.Option>
            </Select>
          </Col>
        </Row>
      </Card>

      <Card loading={isLoading} style={{ borderRadius: 16, border: '1px solid #E8F8F3', boxShadow: '0 4px 12px rgba(3, 83, 58, 0.05)' }}>
        <Table columns={columns} dataSource={filteredPartners} rowKey="id" pagination={false} scroll={{ x: 'max-content' }} />
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <Pagination current={page} total={total} pageSize={pageSize} onChange={setPage} showSizeChanger />
        </div>
      </Card>

      <Modal
        title={<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><ShopOutlined style={{ color: '#07B981', fontSize: 24 }} /> <span style={{ fontWeight: 600 }}>{editingPartner ? 'Редактировать партнёра' : 'Добавить партнёра'}</span></div>}
        open={isModalVisible}
        onOk={() => form.submit()}
        onCancel={() => setIsModalVisible(false)}
        width={800}
        okButtonProps={{ style: { background: '#03533A', borderColor: '#03533A' } }}
      >
        <Form form={form} layout="vertical" onFinish={handleSave} style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}><Form.Item label="Название" name="name" rules={[{ required: true }]}><Input size="large" /></Form.Item></Col>
            <Col span={12}><Form.Item label="Категория" name="category" rules={[{ required: true }]}><Select size="large"><Select.Option value="Супермаркет">Супермаркет</Select.Option><Select.Option value="Ресторан">Ресторан</Select.Option></Select></Form.Item></Col>
            <Col span={12}><Form.Item label="Email" name="email" rules={[{ type: 'email' }]}><Input size="large" /></Form.Item></Col>
            <Col span={12}><Form.Item label="Телефон" name="phone"><Input size="large" /></Form.Item></Col>
            <Col span={24}><Form.Item label="Адрес" name="address" rules={[{ required: true }]}><AddressAutocomplete placeholder="Введите адрес..." onSelectAddress={(opt) => form.setFieldsValue({ address: opt.value, latitude: opt.lat, longitude: opt.lon })} /></Form.Item></Col>
            <Col span={12}>
              <Form.Item label="Логотип">
                <Upload
                  listType="picture-card"
                  fileList={logoFileList}
                  onChange={({ fileList }) => setLogoFileList(fileList)}
                  beforeUpload={() => false}
                  maxCount={1}
                >
                  {logoFileList.length === 0 && <div><PlusOutlined /><div style={{ marginTop: 8 }}>Загрузить</div></div>}
                </Upload>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Обложка">
                <Upload
                  listType="picture-card"
                  fileList={coverFileList}
                  onChange={({ fileList }) => setCoverFileList(fileList)}
                  beforeUpload={() => false}
                  maxCount={1}
                >
                  {coverFileList.length === 0 && <div><PlusOutlined /><div style={{ marginTop: 8 }}>Загрузить</div></div>}
                </Upload>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};
