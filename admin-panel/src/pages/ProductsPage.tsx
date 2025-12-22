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
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { partnersApi } from '@/services/api';
import { DeleteButton } from '@/components/DeleteButton';
import '../styles/animations.css';

export const ProductsPage = () => {
  const { partnerId } = useParams<{ partnerId: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [form] = Form.useForm();
  
  // Используем watch для превью
  const imageUrl = Form.useWatch('image_url', form);
  
  const queryClient = useQueryClient();

  const id = Number(partnerId);

  const handleImport = async (file: any) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        const productsToImport = Array.isArray(json) ? json : [json];
        
        message.loading({ content: 'Импорт товаров...', key: 'importing' });
        
        for (const p of productsToImport) {
          await partnersApi.products.create(id, p);
        }
        
        message.success({ content: `Успешно импортировано ${productsToImport.length} товаров`, key: 'importing' });
        setIsImportModalVisible(false);
        queryClient.invalidateQueries({ queryKey: ['partner-products', id] });
      } catch (error) {
        message.error({ content: 'Ошибка при разборе файла', key: 'importing' });
      }
    };
    reader.readAsText(file);
    return false;
  };

  // Получаем данные партнера для заголовка
  const { data: partnerData } = useQuery({
    queryKey: ['partner', id],
    queryFn: () => partnersApi.getById(id),
    enabled: !!id,
  });

  // Получаем товары партнера
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['partner-products', id, page, pageSize],
    queryFn: () => partnersApi.products.getAll(id, page, pageSize),
    enabled: !!id,
  });

  const products = productsData?.data?.items || [];
  const total = productsData?.data?.total || 0;

  const createMutation = useMutation({
    mutationFn: (values: any) => partnersApi.products.create(id, values),
    onSuccess: () => {
      message.success('Товар добавлен');
      setIsModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['partner-products', id] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: any) => partnersApi.products.update(id, editingProduct.id, values),
    onSuccess: () => {
      message.success('Товар обновлен');
      setIsModalVisible(false);
      setEditingProduct(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['partner-products', id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (productId: number) => partnersApi.products.delete(id, productId),
    onSuccess: () => {
      message.success('Товар удален');
      queryClient.invalidateQueries({ queryKey: ['partner-products', id] });
    },
  });

  const handleSave = (values: any) => {
    // Очищаем от File объектов
    const { image_file, ...payload } = values;
    
    if (editingProduct) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const columns = [
    {
      title: 'Изображение',
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
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: any) => (
        <div>
          <div style={{ fontWeight: 600 }}>{text}</div>
          <div style={{ fontSize: 12, color: '#999' }}>SKU: {record.sku || '-'}</div>
        </div>
      ),
    },
    {
      title: 'Цена',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => <span style={{ fontWeight: 600 }}>{price.toLocaleString()} сом</span>,
    },
    {
      title: 'Статус',
      dataIndex: 'is_available',
      key: 'status',
      render: (available: boolean) => (
        <Tag color={available ? 'green' : 'red'}>
          {available ? 'В наличии' : 'Нет в наличии'}
        </Tag>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      render: (_: any, record: any) => (
        <Space>
          <Tooltip title="Редактировать">
            <Button
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
            title="Удалить товар?"
            description="Вы уверены, что хотите удалить этот товар?"
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/partners')} />
        <h1 style={{ fontSize: 24, fontWeight: 600, color: '#03533A', margin: 0 }}>
          Товары: {partnerData?.data?.name || 'Загрузка...'}
        </h1>
        <Space style={{ marginLeft: 'auto' }}>
          <Button 
            icon={<ImportOutlined />} 
            onClick={() => setIsImportModalVisible(true)}
          >
            Импорт
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingProduct(null);
              form.resetFields();
              setIsModalVisible(true);
            }}
            style={{ backgroundColor: '#07B981' }}
          >
            Добавить товар
          </Button>
        </Space>
      </div>

      <Modal
        title="Импорт товаров"
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
              <ImportOutlined style={{ color: '#07B981' }} />
            </p>
            <p className="ant-upload-text">Нажмите или перетащите JSON файл для импорта</p>
            <p className="ant-upload-hint">Файл должен содержать массив объектов товаров</p>
          </Upload.Dragger>
        </div>
      </Modal>

      <Card
        style={{
          borderRadius: 16,
          boxShadow: '0 2px 12px rgba(15, 42, 29, 0.08)',
        }}
      >
        <Table
          columns={columns}
          dataSource={products}
          rowKey="id"
          loading={isLoading}
          pagination={false}
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

      <Modal
        title={editingProduct ? 'Редактировать товар' : 'Добавить товар'}
        open={isModalVisible}
        onOk={() => form.submit()}
        onCancel={() => setIsModalVisible(false)}
        okText="Сохранить"
        cancelText="Отмена"
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSave} style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="name" label="Название товара (RU)" rules={[{ required: true }]}>
                <Input placeholder="Например: Молоко 1л" />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name_kg" label="Название (KG)">
                <Input placeholder="Сүт 1л" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="category" label="Категория товара">
                <Input placeholder="Напитки / Еда / и т.д." />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="price" label="Цена" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="discount_percent" label="Скидка (%)" initialValue={0}>
                <InputNumber style={{ width: '100%' }} min={0} max={100} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="cashback_amount" label="Бонусы (+Y)" initialValue={0}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="stock_quantity" label="На складе">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="sku" label="Артикул (SKU)">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="sort_order" label="Порядок сортировки" initialValue={0}>
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Описание">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Form.Item name="image_file" label="Изображение товара">
            <Upload
              listType="picture-card"
              maxCount={1}
              showUploadList={false}
              beforeUpload={async (file) => {
                try {
                  message.loading({ content: 'Загрузка...', key: 'product_upload' });
                  const url = await partnersApi.upload.file(file);
                  form.setFieldsValue({ image_url: url });
                  message.success({ content: 'Фото загружено!', key: 'product_upload' });
                } catch (err) {
                  message.error({ content: 'Ошибка загрузки', key: 'product_upload' });
                }
                return false;
              }}
            >
              {imageUrl ? (
                <img src={imageUrl} alt="product" style={{ width: '100%', borderRadius: 8 }} />
              ) : (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>Загрузить</div>
                </div>
              )}
            </Upload>
          </Form.Item>

          <Form.Item name="image_url" hidden rules={[{ required: true, message: 'Загрузите фото товара' }]}>
            <Input />
          </Form.Item>

          <Form.Item name="is_available" label="Доступен для заказа" valuePropName="checked" initialValue={true}>
            <Input type="checkbox" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
