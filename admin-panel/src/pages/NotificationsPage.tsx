import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  Button,
  Space,
  Card,
  Modal,
  Form,
  Input,
  Select,
  message,
  Tag,
  Pagination,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { notificationsApi } from '@/services/api';
import type { AdminNotification } from '@/services/api';
import { t } from '@/i18n';
import dayjs from 'dayjs';
import '../styles/animations.css';

export const NotificationsPage = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  // Получаем данные уведомлений
  const { data: notificationsData, isLoading, refetch } = useQuery({
    queryKey: ['notifications', page, pageSize],
    queryFn: () => notificationsApi.getAll(page, pageSize),
    retry: 1,
  });

  const notifications = notificationsData?.data?.items || [];
  const total = notificationsData?.data?.total || 0;

  // Демо-данные для соответствия дизайну
  const demoNotifications = [
    {
      id: 1,
      template: 'Добро пожаловать в Yess Go!',
      segment: 'Все пользователи',
      schedule: 'Завтра, 9:00',
      sent: 'Отправлено',
    },
    {
      id: 2,
      template: 'Новая акция у партнёра!',
      segment: 'Неактивные пользователи',
      schedule: 'Завтра, 9:00',
      sent: 'Не отправлено',
    },
    {
      id: 3,
      template: 'С Днём Рождения!',
      segment: 'Уровень бронза',
      schedule: 'Завтра, 9:00',
      sent: 'Отправлено',
    },
    {
      id: 4,
      template: 'Твои результаты за неделю',
      segment: 'Все пользователи',
      schedule: 'Завтра, 9:00',
      sent: 'Отправлено',
    },
    {
      id: 5,
      template: 'Новые партнёры рядом!',
      segment: 'Все пользователи',
      schedule: 'Завтра, 9:00',
      sent: 'Отправлено',
    },
    {
      id: 6,
      template: 'Обновления программы лояльности',
      segment: 'Неактивные пользователи',
      schedule: 'Завтра, 9:00',
      sent: 'Не отправлено',
    },
  ];

  const displayNotifications = notifications.length > 0 ? notifications : demoNotifications;

  const handleSendNotification = async (values: any) => {
    try {
      await notificationsApi.send({
        title: values.title,
        message: values.message,
        segment: values.segment,
        scheduled_for: values.scheduled_for,
      });
      message.success(t('notifications.sent', 'Уведомление отправлено'));
      setIsModalOpen(false);
      form.resetFields();
      refetch();
    } catch (error) {
      message.error(t('notifications.sendError', 'Ошибка при отправке уведомления'));
    }
  };

  const columns = [
    {
      title: t('notifications.template', 'Шаблон'),
      dataIndex: 'template',
      key: 'template',
      width: 300,
      render: (template: string, record: any) => (
        <span style={{ color: '#0F2A1D', fontWeight: 500 }}>
          {template || record.title || t('notifications.notification', 'Уведомление')}
        </span>
      ),
    },
    {
      title: t('notifications.segment', 'Сегмент'),
      dataIndex: 'segment',
      key: 'segment',
      width: 200,
      render: (segment: string, record: any) => {
        const segmentLabels: Record<string, string> = {
          all: t('notifications.segmentAll', 'Все пользователи'),
          active: t('notifications.segmentActive', 'Активные пользователи'),
          inactive: t('notifications.segmentInactive', 'Неактивные пользователи'),
          bronze: t('notifications.segmentBronze', 'Уровень бронза'),
          silver: t('notifications.segmentSilver', 'Уровень серебро'),
          gold: t('notifications.segmentGold', 'Уровень золото'),
          new: t('notifications.segmentNew', 'Новые пользователи'),
        };
        return segmentLabels[segment] || segment || t('notifications.segmentAll', 'Все пользователи');
      },
    },
    {
      title: t('notifications.schedule', 'Расписание'),
      dataIndex: 'schedule',
      key: 'schedule',
      width: 200,
      render: (schedule: string, record: any) => {
        if (schedule) return schedule;
        if (record.scheduled_for) {
          return dayjs(record.scheduled_for).format('DD.MM.YYYY, HH:mm');
        }
        return t('notifications.tomorrow', 'Завтра, 9:00');
      },
    },
    {
      title: t('notifications.sent', 'Отправлено'),
      dataIndex: 'sent',
      key: 'sent',
      width: 150,
      render: (sent: string, record: any) => {
        const isSent = sent === t('notifications.sent', 'Отправлено') || record.status === 'sent' || record.is_sent;
        return (
          <Tag
            color={isSent ? 'success' : 'error'}
            style={{
              color: isSent ? '#689071' : '#ff4d4f',
              border: isSent ? '1px solid #689071' : '1px solid #ff4d4f',
              backgroundColor: 'transparent',
            }}
          >
            {isSent ? t('notifications.sent', 'Отправлено') : t('notifications.notSent', 'Не отправлено')}
          </Tag>
        );
      },
    },
  ];

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0F2A1D', margin: 0 }}>
          {t('notifications.title', 'Уведомления')}
        </h1>
        <Space>
          <Select
            placeholder={t('notifications.city', 'Город')}
            style={{ width: 150 }}
            options={[
              { label: t('notifications.allCities', 'Все города'), value: 'all' },
              { label: t('notifications.bishkek', 'Бишкек'), value: 'bishkek' },
              { label: t('notifications.osh', 'Ош'), value: 'osh' },
            ]}
          />
          <Select
            placeholder={t('notifications.level', 'Уровень')}
            style={{ width: 150 }}
            options={[
              { label: t('notifications.allLevels', 'Все уровни'), value: 'all' },
              { label: t('notifications.bronze', 'Бронза'), value: 'bronze' },
              { label: t('notifications.silver', 'Серебро'), value: 'silver' },
              { label: t('notifications.gold', 'Золото'), value: 'gold' },
            ]}
          />
          <Select
            placeholder={t('notifications.activity', 'Активность')}
            style={{ width: 150 }}
            options={[
              { label: t('common.all', 'Все'), value: 'all' },
              { label: t('users.active', 'Активные'), value: 'active' },
              { label: t('users.inactive', 'Неактивные'), value: 'inactive' },
            ]}
          />
          <Button icon={<MoreOutlined />} />
        </Space>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsModalOpen(true)}
          style={{ backgroundColor: '#689071', borderColor: '#689071' }}
          size="large"
        >
          {t('notifications.new', 'Новое уведомление')}
        </Button>
      </div>

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
          dataSource={displayNotifications}
          rowKey="id"
          pagination={false}
          scroll={{ x: 800 }}
        />

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <Pagination
            current={page}
            total={total || displayNotifications.length}
            pageSize={pageSize}
            onChange={setPage}
            showSizeChanger
            onShowSizeChange={(_, size) => setPageSize(size)}
          />
        </div>
      </Card>

      {/* Модальное окно для создания уведомления */}
      <Modal
        title={t('notifications.new', 'Новое уведомление')}
        open={isModalOpen}
        onOk={() => form.submit()}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        okText={t('notifications.send', 'Отправить')}
        cancelText={t('common.cancel', 'Отменить')}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSendNotification}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            label={t('notifications.template', 'Шаблон')}
            name="title"
            rules={[{ required: true, message: t('notifications.titleRequired', 'Введите название') }]}
          >
            <Input placeholder={t('notifications.titlePlaceholder', 'Например: Добро пожаловать в Yess Go!')} />
          </Form.Item>

          <Form.Item
            label={t('notifications.message', 'Сообщение')}
            name="message"
            rules={[{ required: true, message: t('notifications.messageRequired', 'Введите сообщение') }]}
          >
            <Input.TextArea
              rows={4}
              placeholder={t('notifications.messagePlaceholder', 'Текст уведомления')}
            />
          </Form.Item>

          <Form.Item
            label={t('notifications.segment', 'Сегмент')}
            name="segment"
            rules={[{ required: true, message: t('notifications.segmentRequired', 'Выберите сегмент') }]}
          >
            <Select placeholder={t('notifications.segmentPlaceholder', 'Выберите сегмент пользователей')}>
              <Select.Option value="all">{t('notifications.segmentAll', 'Все пользователи')}</Select.Option>
              <Select.Option value="active">{t('notifications.segmentActive', 'Активные пользователи')}</Select.Option>
              <Select.Option value="inactive">{t('notifications.segmentInactive', 'Неактивные пользователи')}</Select.Option>
              <Select.Option value="bronze">{t('notifications.segmentBronze', 'Уровень Бронза')}</Select.Option>
              <Select.Option value="silver">{t('notifications.segmentSilver', 'Уровень Серебро')}</Select.Option>
              <Select.Option value="gold">{t('notifications.segmentGold', 'Уровень Золото')}</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label={t('notifications.schedule', 'Расписание')}
            name="scheduled_for"
          >
            <Input placeholder={t('notifications.tomorrow', 'Завтра, 9:00')} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
