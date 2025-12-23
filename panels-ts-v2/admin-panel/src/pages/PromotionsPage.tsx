import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Table, Modal, Form, Input, Select, DatePicker, InputNumber, message, Tabs, Avatar, Space, Tooltip, Upload, Row, Col, Image } from 'antd';
import { PlusOutlined, EditOutlined, ShopOutlined, UploadOutlined, DeleteOutlined, PictureOutlined, VideoCameraOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { promotionsApi } from '@/services/api';
import { Promotion } from '@/types';
import { DeleteButton } from '@/components/DeleteButton';
import { t } from '@/i18n';
import dayjs from 'dayjs';
import { toArray } from '../utils/arrayUtils';
import '../styles/animations.css';
import { useDocumentTitle } from '@shared/hooks/useDocumentTitle';

const { RangePicker } = DatePicker;
const { TextArea } = Input;

export const PromotionsPage = () => {
  useDocumentTitle('Промоакции', 'YESS!GO Admin');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [activeTab, setActiveTab] = useState('active');
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [imageList, setImageList] = useState<UploadFile[]>([]);
  const [videoList, setVideoList] = useState<UploadFile[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['promotions', activeTab],
    queryFn: () => promotionsApi.getAll().then(res => res.data),
  });

  // Filter promotions based on active tab
  const promotionsList = toArray<Promotion>(data as any, [] as Promotion[]);
  const filteredPromotions = promotionsList.filter((promo: Promotion) => {
    if (activeTab === 'active') return promo.status === 'active';
    if (activeTab === 'completed') return promo.status === 'expired' || promo.status === 'cancelled';
    if (activeTab === 'drafts') return promo.status === 'draft';
    return true;
  });

  const createMutation = useMutation({
    mutationFn: (values: any) => promotionsApi.create(values),
    onSuccess: () => {
      message.success(t('promotions.created', 'Акция создана'));
      handleCloseModal();
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => promotionsApi.update(id, data),
    onSuccess: () => {
      message.success(t('promotions.updated', 'Акция обновлена'));
      handleCloseModal();
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => promotionsApi.delete(id),
    onSuccess: () => {
      message.success(t('promotions.deleted', 'Акция удалена'));
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
    },
  });

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPromotion(null);
    form.resetFields();
    setImageList([]);
    setVideoList([]);
  };

  const handleEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    form.setFieldsValue({
      ...promotion,
      dates: [dayjs(promotion.start_date), dayjs(promotion.end_date)],
    });
    // Загружаем изображения и видео если есть
    if ((promotion as any).image_urls) {
      const images = Array.isArray((promotion as any).image_urls) 
        ? (promotion as any).image_urls.map((url: string, index: number) => ({
            uid: `image-${index}`,
            name: `image-${index}.jpg`,
            status: 'done' as const,
            url,
          }))
        : [];
      setImageList(images);
    }
    if ((promotion as any).video_urls) {
      const videos = Array.isArray((promotion as any).video_urls)
        ? (promotion as any).video_urls.map((url: string, index: number) => ({
            uid: `video-${index}`,
            name: `video-${index}.mp4`,
            status: 'done' as const,
            url,
          }))
        : [];
      setVideoList(videos);
    }
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      // Получаем URL изображений и видео
      const imageUrls = imageList
        .filter(file => file.status === 'done')
        .map(file => file.url || (file.response?.url))
        .filter(Boolean);
      
      const videoUrls = videoList
        .filter(file => file.status === 'done')
        .map(file => file.url || (file.response?.url))
        .filter(Boolean);

      const payload = {
        ...values,
        start_date: values.dates[0].toISOString(),
        end_date: values.dates[1].toISOString(),
        image_urls: imageUrls.length > 0 ? imageUrls : undefined,
        video_urls: videoUrls.length > 0 ? videoUrls : undefined,
      };
      delete payload.dates;

      if (editingPromotion) {
        updateMutation.mutate({ id: editingPromotion.id, data: payload });
      } else {
        createMutation.mutate(payload);
      }
    });
  };

  // Обработчики для загрузки файлов
  const handleImageChange: UploadProps['onChange'] = ({ fileList }) => {
    setImageList(fileList);
  };

  const handleVideoChange: UploadProps['onChange'] = ({ fileList }) => {
    setVideoList(fileList);
  };

  const beforeUpload = (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      message.error(t('promotions.invalidFileType', 'Можно загружать только изображения или видео!'));
      return false;
    }
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error(t('promotions.fileTooLarge', 'Файл должен быть меньше 10MB!'));
      return false;
    }
    return false; // Предотвращаем автоматическую загрузку, будем загружать через API
  };

  const columns = [
    {
      title: t('promotions.titleField', 'Название'),
      key: 'name',
      render: (_: any, record: Promotion) => (
        <Space>
          <div style={{ 
            width: 40, 
            height: 40, 
            background: '#ff4d4f', 
            borderRadius: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 12,
            fontWeight: 'bold',
          }}>
            <span>-{record.discount_percent || 20}%</span>
            <span style={{ fontSize: 10 }}>{t('promotions.discount', 'скидка')}</span>
          </div>
          <div>
            <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{record.title || t('promotions.defaultTitle', 'Пятерочка')}</div>
            <div style={{ fontSize: 12, color: '#689071' }}>
              -{record.discount_percent || 20}% {t('promotions.discount', 'скидка')}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: t('promotions.period', 'Период'),
      key: 'period',
      render: (_: any, record: Promotion) => (
        <span style={{ color: '#0F2A1D' }}>
          {dayjs(record.start_date).format('DD.MM')} - {dayjs(record.end_date).format('DD.MM')} {dayjs(record.start_date).format('YYYY')} {t('promotions.year', 'год')}
        </span>
      ),
    },
    {
      title: t('promotions.partner', 'Партнер'),
      key: 'partner',
      render: (_: any) => (
        <Space>
          <Avatar 
            icon={<ShopOutlined />} 
            size="small"
            style={{ backgroundColor: '#689071' }}
          >
            G
          </Avatar>
          <span style={{ color: '#0F2A1D' }}>{t('partners.defaultName', 'Глобус')}</span>
        </Space>
      ),
    },
    {
      title: t('promotions.priority', 'Приоритет'),
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: number) => <span style={{ color: '#0F2A1D' }}>{priority || '190 000'}</span>,
    },
    {
      title: 'CTR',
      dataIndex: 'ctr',
      key: 'ctr',
      render: (ctr: number) => <span style={{ color: '#0F2A1D' }}>{ctr ? `${ctr}%` : '6,75%'}</span>,
    },
    {
      title: t('promotions.statistics', 'Статистика'),
      dataIndex: 'statistics',
      key: 'statistics',
      render: (stats: number) => <span style={{ color: '#0F2A1D' }}>{stats ? `${stats}%` : '6,9%'}</span>,
    },
    {
      title: t('common.actions', 'Действие'),
      key: 'actions',
      width: 100,
      render: (_: any, record: Promotion) => (
        <Space size="small">
          <Tooltip title={t('common.edit', 'Редактировать')}>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title={t('common.delete', 'Удалить')}>
            <DeleteButton
              onDelete={() => handleDelete(record.id)}
              text=""
              className="danger compact icon-only"
              confirmTitle={t('promotions.deleteConfirm', 'Удалить акцию?')}
              confirmContent={t('promotions.deleteWarning', 'Вы уверены, что хотите удалить эту акцию?')}
              confirmOkText={t('common.delete', 'Удалить')}
              confirmCancelText={t('common.cancel', 'Отменить')}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'active',
      label: t('promotions.tabs.active', 'Активные'),
    },
    {
      key: 'completed',
      label: t('promotions.tabs.completed', 'Завершенные'),
    },
    {
      key: 'drafts',
      label: t('promotions.tabs.drafts', 'Черновики'),
    },
  ];

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
          {t('promotions.title', 'Акции')}
        </h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsModalOpen(true)}
          style={{ backgroundColor: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
        >
          {t('promotions.add', 'Создать акцию')}
        </Button>
      </div>

      <Card
        style={{
          borderRadius: 16,
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          boxShadow: 'var(--card-shadow)',
        }}
        className="hover-lift-green"
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          style={{ marginBottom: 16 }}
        />
        <Table
          columns={columns}
          dataSource={filteredPromotions}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <Modal
        title={editingPromotion ? t('promotions.edit', 'Редактировать акцию') : t('promotions.add', 'Создать акцию')}
        open={isModalOpen}
        onCancel={handleCloseModal}
        onOk={handleSubmit}
        okText={editingPromotion ? t('common.save', 'Сохранить') : t('common.create', 'Создать')}
        cancelText={t('common.cancel', 'Отмена')}
        width={700}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item
            name="title"
            label={t('promotions.titleField', 'Название')}
            rules={[{ required: true, message: t('promotions.titleRequired', 'Введите название') }]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="description" label={t('promotions.description', 'Описание')}>
            <TextArea rows={3} />
          </Form.Item>

          <Form.Item
            name="category"
            label={t('promotions.category', 'Категория')}
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { label: t('promotions.categoryGeneral', 'Общая'), value: 'general' },
                { label: t('promotions.categoryPartner', 'Партнерская'), value: 'partner' },
                { label: t('promotions.categorySeasonal', 'Сезонная'), value: 'seasonal' },
                { label: t('promotions.categoryReferral', 'Реферальная'), value: 'referral' },
                { label: t('promotions.categoryLoyalty', 'Лояльность'), value: 'loyalty' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="promotion_type"
            label={t('promotions.type', 'Тип акции')}
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { label: t('promotions.typePercent', 'Процентная скидка'), value: 'discount_percent' },
                { label: t('promotions.typeFixed', 'Фиксированная скидка'), value: 'discount_amount' },
                { label: t('promotions.typeCashback', 'Кэшбэк'), value: 'cashback' },
                { label: t('promotions.typeBonus', 'Бонусные баллы'), value: 'bonus_points' },
              ]}
            />
          </Form.Item>

          <Form.Item name="discount_percent" label={t('promotions.discountPercent', 'Процент скидки')}>
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="discount_amount" label={t('promotions.discountAmount', 'Сумма скидки (сом)')}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="dates"
            label={t('promotions.periodAction', 'Период действия')}
            rules={[{ required: true, message: t('promotions.periodRequired', 'Выберите период') }]}
          >
            <RangePicker 
              style={{ width: '100%' }} 
              format="DD.MM.YYYY"
              picker="date"
            />
          </Form.Item>

          <Form.Item name="usage_limit" label={t('promotions.usageLimit', 'Лимит использований')}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>

          {/* Загрузка изображений */}
          <Form.Item
            label={
              <Space>
                <PictureOutlined />
                <span>{t('promotions.images', 'Изображения')}</span>
              </Space>
            }
            help={t('promotions.imagesHelp', 'Можно загрузить несколько изображений (JPG, PNG, до 10MB каждое)')}
          >
            <Upload
              listType="picture-card"
              fileList={imageList}
              onChange={handleImageChange}
              beforeUpload={beforeUpload}
              accept="image/*"
              multiple
            >
              {imageList.length < 10 && (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>{t('promotions.upload', 'Загрузить')}</div>
                </div>
              )}
            </Upload>
          </Form.Item>

          {/* Загрузка видео */}
          <Form.Item
            label={
              <Space>
                <VideoCameraOutlined />
                <span>{t('promotions.videos', 'Видео')}</span>
              </Space>
            }
            help={t('promotions.videosHelp', 'Можно загрузить несколько видео (MP4, до 10MB каждое)')}
          >
            <Upload
              listType="picture-card"
              fileList={videoList}
              onChange={handleVideoChange}
              beforeUpload={beforeUpload}
              accept="video/*"
              multiple
            >
              {videoList.length < 5 && (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>{t('promotions.upload', 'Загрузить')}</div>
                </div>
              )}
            </Upload>
          </Form.Item>

          <Form.Item
            name="status"
            label={t('promotions.status', 'Статус')}
            initialValue="draft"
          >
            <Select
              options={[
                { label: t('promotions.tabs.drafts', 'Черновик'), value: 'draft' },
                { label: t('promotions.active', 'Активна'), value: 'active' },
                { label: t('promotions.paused', 'Приостановлена'), value: 'paused' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
