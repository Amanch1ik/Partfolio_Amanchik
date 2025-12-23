import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  Button,
  Space,
  Card,
  Input,
  Row,
  Col,
  Tag,
  Modal,
  Form,
  App,
  Tooltip,
  Pagination,
  InputNumber,
  Image,
  Upload,
} from 'antd';
import {
  EditOutlined,
  PlusOutlined,
  ArrowLeftOutlined,
  ImportOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { partnersApi } from '@/services/api';
import { DeleteButton } from '@/components/DeleteButton';
import PageHeader from '@/components/PageHeader';
import { t } from '@/i18n';
import '../styles/animations.css';
import { useDocumentTitle } from '@shared/hooks/useDocumentTitle';

export const ProductsPage = () => {
  useDocumentTitle('Товары партнера', 'YESS!GO Admin');
  const { partnerId } = useParams<{ partnerId: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [form] = Form.useForm();
  
  const imageUrl = Form.useWatch('image_url', form);
  const queryClient = useQueryClient();
  const id = Number(partnerId);

  // Получаем данные партнера
  const { data: partnerResponse } = useQuery({
    queryKey: ['partner', id],
    queryFn: () => partnersApi.getById(id),
    enabled: !!id,
  });

  const partner = partnerResponse?.data;

  // Получаем товары партнера
  const { data: productsResponse, isLoading } = useQuery({
    queryKey: ['partner-products', id, page, pageSize],
    queryFn: () => partnersApi.products.getAll(id, page, pageSize),
    enabled: !!id,
  });

  const products = productsResponse?.data?.items || [];
  const total = productsResponse?.data?.total || 0;

  const createMutation = useMutation({
    mutationFn: (values: any) => partnersApi.products.create(id, values),
    onSuccess: () => {
      message.success(t('products.created', 'Товар добавлен'));
      handleCloseModal();
      queryClient.invalidateQueries({ queryKey: ['partner-products', id] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: any) => partnersApi.products.update(id, editingProduct.id, values),
    onSuccess: () => {
      message.success(t('products.updated', 'Товар обновлен'));
      handleCloseModal();
      queryClient.invalidateQueries({ queryKey: ['partner-products', id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (productId: number) => partnersApi.products.delete(id, productId),
    onSuccess: () => {
      message.success(t('products.deleted', 'Товар удален'));
      queryClient.invalidateQueries({ queryKey: ['partner-products', id] });
    },
  });

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setEditingProduct(null);
    form.resetFields();
  };

  const handleSave = (values: any) => {
    if (editingProduct) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const handleImport = async (file: any) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        const productsToImport = Array.isArray(json) ? json : [json];
        
        message.loading({ content: t('products.importing', 'Импорт товаров...'), key: 'importing' });
        
        for (const p of productsToImport) {
          await partnersApi.products.create(id, p);
        }
        
        message.success({ content: t('products.importSuccess', `Успешно импортировано ${productsToImport.length} товаров`), key: 'importing' });
        setIsImportModalVisible(false);
        queryClient.invalidateQueries({ queryKey: ['partner-products', id] });
      } catch (error) {
        message.error({ content: t('products.importError', 'Ошибка при разборе файла'), key: 'importing' });
      }
    };
    reader.readAsText(file);
    return false;
  };

  const columns = [
    {
      title: t('products.image', 'Изображение'),
      dataIndex: 'image_url',
      key: 'image',
      width: 100,
      render: (url: string) => (
        <Image
          src={url}
          width={50}
          height={50}
          style={{ objectFit: 'cover', borderRadius: 8 }}
          fallback="https://via.placeholder.com/50?text=No+Img"
        />
      ),
    },
    {
      title: t('products.name', 'Название'),
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: any) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{text}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>SKU: {record.sku || '-'}</div>
        </div>
      ),
    },
    {
      title: t('products.price', 'Цена'),
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => <span style={{ fontWeight: 600 }}>{price?.toLocaleString()} сом</span>,
    },
    {
      title: t('products.status', 'Статус'),
      dataIndex: 'is_available',
      key: 'status',
      render: (available: boolean) => (
        <Tag color={available ? 'green' : 'red'} style={{ borderRadius: 6 }}>
          {available ? t('products.available', 'В наличии') : t('products.notAvailable', 'Нет в наличии')}
        </Tag>
      ),
    },
    {
      title: t('common.actions', 'Действия'),
      key: 'actions',
      width: 150,
      render: (_: any, record: any) => (
        <Space>
          <Tooltip title={t('common.edit', 'Редактировать')}>
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingProduct(record);
                form.setFieldsValue(record);
                setIsModalVisible(true);
              }}
            />
          </Tooltip>
          <DeleteButton
            onDelete={() => deleteMutation.mutate(record.id)}
            title={t('products.deleteConfirm', 'Удалить товар?')}
            description={t('products.deleteWarning', 'Вы уверены, что хотите удалить этот товар?')}
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="fade-in">
      <PageHeader
        title={`${t('products.title', 'Товары')}: ${partner?.name || '...'}`}
        onBack={() => navigate('/partners')}
        extra={[
          <Button 
            key="import"
            icon={<ImportOutlined />} 
            onClick={() => setIsImportModalVisible(true)}
          >
            {t('common.import', 'Импорт')}
          </Button>,
          <Button
            key="add"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingProduct(null);
              form.resetFields();
              setIsModalVisible(true);
            }}
            style={{ backgroundColor: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
          >
            {t('products.add', 'Добавить товар')}
          </Button>,
        ]}
      />

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
          columns={columns}
          dataSource={products}
          rowKey="id"
          loading={isLoading}
          pagination={false}
          scroll={{ x: 'max-content' }}
        />
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <Pagination
            current={page}
            total={total}
            pageSize={pageSize}
            onChange={setPage}
            showSizeChanger={false}
          />
        </div>
      </Card>

      {/* Модалка редактирования/создания */}
      <Modal
        title={editingProduct ? t('products.edit', 'Редактировать товар') : t('products.add', 'Добавить товар')}
        open={isModalVisible}
        onOk={() => form.submit()}
        onCancel={handleCloseModal}
        okText={t('common.save', 'Сохранить')}
        cancelText={t('common.cancel', 'Отмена')}
        width={700}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={handleSave} style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="name" label={t('products.nameField', 'Название товара')} rules={[{ required: true }]}>
                <Input placeholder="Например: Молоко 1л" />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="category" label={t('products.categoryField', 'Категория')}>
                <Input placeholder="Напитки / Еда / и т.д." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="sku" label="SKU / Артикул">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="price" label={t('products.priceField', 'Цена')} rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="discount_percent" label={t('products.discountField', 'Скидка (%)')} initialValue={0}>
                <InputNumber style={{ width: '100%' }} min={0} max={100} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="stock_quantity" label={t('products.stockField', 'На складе')}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label={t('products.descriptionField', 'Описание')}>
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item name="image_url" label={t('products.imageUrlField', 'URL изображения')}>
            <Input placeholder="https://..." prefix={<PictureOutlined />} />
          </Form.Item>

          {imageUrl && (
            <div style={{ marginBottom: 16, textAlign: 'center' }}>
              <Image src={imageUrl} height={100} style={{ borderRadius: 8, objectFit: 'cover' }} />
            </div>
          )}

          <Form.Item name="is_available" label={t('products.isAvailableField', 'Доступен для заказа')} valuePropName="checked" initialValue={true}>
            <Input type="checkbox" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Модалка импорта */}
      <Modal
        title={t('products.importTitle', 'Импорт товаров')}
        open={isImportModalVisible}
        onCancel={() => setIsImportModalVisible(false)}
        footer={null}
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Upload.Dragger
            accept=".json"
            beforeUpload={handleImport}
            showUploadList={false}
          >
            <p className="ant-upload-drag-icon">
              <ImportOutlined style={{ color: 'var(--color-primary)' }} />
            </p>
            <p className="ant-upload-text">{t('products.importHint', 'Нажмите или перетащите JSON файл для импорта')}</p>
            <p className="ant-upload-hint">{t('products.importSubHint', 'Файл должен содержать массив объектов товаров')}</p>
          </Upload.Dragger>
        </div>
      </Modal>
    </div>
  );
};

