import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  message,
  Tabs,
  Space,
  Image,
  Tag,
  Tooltip,
  Statistic,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import storiesApi from '@/services/storiesApi';
import { toArray } from '../utils/arrayUtils';
import { DeleteButton } from '@/components/DeleteButton';
import { t } from '@/i18n';
import dayjs from 'dayjs';
import '../styles/animations.css';
import { useDocumentTitle } from '@shared/hooks/useDocumentTitle';

const { RangePicker } = DatePicker;
const { TextArea } = Input;

interface Story {
  id: number;
  title: string;
  title_kg?: string;
  title_ru?: string;
  description?: string;
  image_url: string;
  video_url?: string;
  story_type: string;
  partner_id?: number;
  promotion_id?: number;
  city_id?: number;
  expires_at: string;
  scheduled_at?: string;
  status: string;
  is_active: boolean;
  priority: number;
  views_count: number;
  clicks_count: number;
  shares_count: number;
  action_type: string;
  action_value?: string;
  created_at: string;
  updated_at: string;
  partner_name?: string;
  promotion_title?: string;
  city_name?: string;
}

export const StoriesPage = () => {
  useDocumentTitle('Сторисы', 'YESS!GO Admin');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [selectedStoryId, setSelectedStoryId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('active');
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['stories', activeTab],
    queryFn: () => storiesApi.getAll({ page: 1, page_size: 100 }).then(res => res),
  });

  const { data: statsData } = useQuery({
    queryKey: ['storyStats', selectedStoryId],
    queryFn: () => storiesApi.getStats(selectedStoryId!),
    enabled: !!selectedStoryId && isStatsModalOpen,
  });

  const storiesList = toArray<any>(data?.items ?? data, []);
  const filteredStories = storiesList.filter((story: Story) => {
    if (activeTab === 'active') return story.status === 'active' && story.is_active;
    if (activeTab === 'expired') return story.status === 'expired' || (new Date(story.expires_at) < new Date());
    if (activeTab === 'drafts') return story.status === 'draft';
    if (activeTab === 'scheduled') return story.status === 'scheduled';
    return true;
  });

  const createMutation = useMutation({
    mutationFn: (values: any) => storiesApi.create(values),
    onSuccess: () => {
      message.success('Сторис создан');
      handleCloseModal();
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.detail || 'Ошибка создания сториса');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => storiesApi.update(id, data),
    onSuccess: () => {
      message.success('Сторис обновлен');
      handleCloseModal();
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.detail || 'Ошибка обновления сториса');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => storiesApi.delete(id),
    onSuccess: () => {
      message.success('Сторис удален');
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
  });

  const publishMutation = useMutation({
    mutationFn: (id: number) => storiesApi.publish(id),
    onSuccess: () => {
      message.success('Сторис опубликован');
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: number) => storiesApi.archive(id),
    onSuccess: () => {
      message.success('Сторис архивирован');
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
  });

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStory(null);
    form.resetFields();
  };

  const handleEdit = (story: Story) => {
    setEditingStory(story);
    form.setFieldsValue({
      ...story,
      expires_at: dayjs(story.expires_at),
      scheduled_at: story.scheduled_at ? dayjs(story.scheduled_at) : null,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleShowStats = (id: number) => {
    setSelectedStoryId(id);
    setIsStatsModalOpen(true);
  };

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      const payload = {
        ...values,
        expires_at: values.expires_at.toISOString(),
        scheduled_at: values.scheduled_at ? values.scheduled_at.toISOString() : null,
      };

      if (editingStory) {
        updateMutation.mutate({ id: editingStory.id, data: payload });
      } else {
        createMutation.mutate(payload);
      }
    });
  };

  const getStatusTag = (status: string, expiresAt: string) => {
    const isExpired = new Date(expiresAt) < new Date();
    
    if (isExpired) {
      return <Tag color="default">Истек</Tag>;
    }
    
    switch (status) {
      case 'active':
        return <Tag color="green">Активен</Tag>;
      case 'draft':
        return <Tag color="orange">Черновик</Tag>;
      case 'scheduled':
        return <Tag color="blue">Запланирован</Tag>;
      case 'archived':
        return <Tag color="default">Архив</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const columns = [
    {
      title: 'Изображение',
      key: 'image',
      width: 100,
      render: (_: any, record: Story) => (
        <Image
          src={record.image_url}
          alt={record.title}
          width={60}
          height={60}
          style={{ objectFit: 'cover', borderRadius: 8 }}
          fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAwIiB5PSI1MDAiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM5OTkiPkltYWdlPC90ZXh0Pjwvc3ZnPg=="
        />
      ),
    },
    {
      title: 'Название',
      key: 'title',
      render: (_: any, record: Story) => (
        <div>
          <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{record.title}</div>
          {record.partner_name && (
            <div style={{ fontSize: 12, color: 'var(--color-primary)' }}>Партнер: {record.partner_name}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Тип',
      key: 'type',
      render: (_: any, record: Story) => (
        <Tag color={record.story_type === 'promotion' ? 'blue' : 'purple'}>
          {record.story_type === 'promotion' ? 'Акция' : 
           record.story_type === 'partner' ? 'Партнер' : 
           record.story_type === 'announcement' ? 'Объявление' : record.story_type}
        </Tag>
      ),
    },
    {
      title: 'Статус',
      key: 'status',
      render: (_: any, record: Story) => getStatusTag(record.status, record.expires_at),
    },
    {
      title: 'Истекает',
      key: 'expires',
      render: (_: any, record: Story) => (
        <div>
          <div>{dayjs(record.expires_at).format('DD.MM.YYYY HH:mm')}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            {/* Метод from доступен через плагин relativeTime, поэтому приводим к any, чтобы избежать проблем с типами */}
            {(dayjs(record.expires_at) as any).from(dayjs(), true)}
          </div>
        </div>
      ),
    },
    {
      title: 'Статистика',
      key: 'stats',
      render: (_: any, record: Story) => (
        <Space>
          <Tooltip title="Просмотры">
            <span><EyeOutlined /> {record.views_count}</span>
          </Tooltip>
          <Tooltip title="Клики">
            <span><PlayCircleOutlined /> {record.clicks_count}</span>
          </Tooltip>
        </Space>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: Story) => (
        <Space>
          <Tooltip title="Статистика">
            <Button
              icon={<EyeOutlined />}
              size="small"
              onClick={() => handleShowStats(record.id)}
            />
          </Tooltip>
          <Tooltip title="Редактировать">
            <Button
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          {record.status === 'draft' && (
            <Tooltip title="Опубликовать">
              <Button
                icon={<CheckCircleOutlined />}
                size="small"
                type="primary"
                onClick={() => publishMutation.mutate(record.id)}
              />
            </Tooltip>
          )}
          {record.status === 'active' && (
            <Tooltip title="Архивировать">
              <Button
                icon={<CloseCircleOutlined />}
                size="small"
                onClick={() => archiveMutation.mutate(record.id)}
              />
            </Tooltip>
          )}
          <DeleteButton
            onDelete={() => handleDelete(record.id)}
            confirmTitle="Удалить сторис"
            confirmContent="Вы уверены, что хотите удалить этот сторис?"
          />
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Сторисы</span>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingStory(null);
                form.resetFields();
                setIsModalOpen(true);
              }}
            >
              Создать сторис
            </Button>
          </div>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            { key: 'active', label: 'Активные' },
            { key: 'scheduled', label: 'Запланированные' },
            { key: 'drafts', label: 'Черновики' },
            { key: 'expired', label: 'Истекшие' },
          ]}
        />
        <Table
          columns={columns}
          dataSource={filteredStories}
          loading={isLoading}
          rowKey="id"
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <Modal
        title={editingStory ? 'Редактировать сторис' : 'Создать сторис'}
        open={isModalOpen}
        onCancel={handleCloseModal}
        onOk={handleSubmit}
        width={800}
        okText="Сохранить"
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="Название" rules={[{ required: true }]}>
            <Input placeholder="Название сториса" />
          </Form.Item>

          <Form.Item name="title_ru" label="Название (русский)">
            <Input placeholder="Название на русском" />
          </Form.Item>

          <Form.Item name="title_kg" label="Название (кыргызский)">
            <Input placeholder="Название на кыргызском" />
          </Form.Item>

          <Form.Item name="description" label="Описание">
            <TextArea rows={3} placeholder="Описание сториса" />
          </Form.Item>

          <Form.Item name="image_url" label="URL изображения" rules={[{ required: true }]}>
            <Input placeholder="https://example.com/image.jpg" />
          </Form.Item>

          <Form.Item name="video_url" label="URL видео (опционально)">
            <Input placeholder="https://example.com/video.mp4" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="story_type" label="Тип сториса" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="announcement">Объявление</Select.Option>
                  <Select.Option value="promotion">Акция</Select.Option>
                  <Select.Option value="partner">Партнер</Select.Option>
                  <Select.Option value="system">Системное</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="priority" label="Приоритет" initialValue={0}>
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="expires_at" label="Истекает" rules={[{ required: true }]}>
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
              placeholder="Выберите дату истечения"
            />
          </Form.Item>

          <Form.Item name="scheduled_at" label="Запланировать на">
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
              placeholder="Когда опубликовать (опционально)"
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="action_type" label="Действие при клике">
                <Select>
                  <Select.Option value="none">Без действия</Select.Option>
                  <Select.Option value="open_partner">Открыть партнера</Select.Option>
                  <Select.Option value="open_promotion">Открыть акцию</Select.Option>
                  <Select.Option value="open_url">Открыть URL</Select.Option>
                  <Select.Option value="open_product">Открыть товар</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="action_value" label="Значение действия">
                <Input placeholder="ID партнера/акции или URL" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="target_audience" label="Целевая аудитория" initialValue="all">
            <Select>
              <Select.Option value="all">Все</Select.Option>
              <Select.Option value="city">По городу</Select.Option>
              <Select.Option value="partner">Партнер</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="auto_delete" label="Автоматически удалить" valuePropName="checked" initialValue={true}>
            <Select>
              <Select.Option value="true">Да</Select.Option>
              <Select.Option value="false">Нет</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Статистика сториса"
        open={isStatsModalOpen}
        onCancel={() => {
          setIsStatsModalOpen(false);
          setSelectedStoryId(null);
        }}
        footer={null}
        width={600}
      >
        {statsData && (
          <Row gutter={16}>
            <Col span={8}>
              <Statistic title="Просмотры" value={statsData.views_count} />
            </Col>
            <Col span={8}>
              <Statistic title="Клики" value={statsData.clicks_count} />
            </Col>
            <Col span={8}>
              <Statistic title="Уникальные просмотры" value={statsData.unique_views} />
            </Col>
            <Col span={24} style={{ marginTop: 16 }}>
              <Statistic
                title="Процент кликов"
                value={statsData.click_rate}
                suffix="%"
                precision={2}
              />
            </Col>
          </Row>
        )}
      </Modal>
    </div>
  );
};

