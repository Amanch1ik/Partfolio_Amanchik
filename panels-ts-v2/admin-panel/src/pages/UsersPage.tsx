import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  Button,
  Space,
  Card,
  Input,
  Select,
  Modal,
  Form,
  message,
  Tooltip,
  Pagination,
  Row,
  Col,
  Tag,
  Statistic,
  Drawer,
  DatePicker,
  Dropdown,
  InputNumber,
} from 'antd';

const { TextArea } = Input;
import {
  EyeOutlined,
  EditOutlined,
  LockOutlined,
  UnlockOutlined,
  SearchOutlined,
  ExportOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  DollarOutlined,
  CalendarOutlined,
  LineChartOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { usersApi, api } from '@/services/api';
import type { User } from '@/services/api';
import { DeleteButton } from '@/components/DeleteButton';
import dayjs from 'dayjs';
import { t } from '@/i18n';
import { exportToCSV, exportToExcel, exportToJSON } from '@/utils/exportUtils';
import '../styles/animations.css';
import { toArray } from '../utils/arrayUtils';

const { RangePicker } = DatePicker;

import { useDocumentTitle } from '@shared/hooks/useDocumentTitle';

export const UsersPage = () => {
  useDocumentTitle('Пользователи', 'YESS!GO Admin');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [transferFromUser, setTransferFromUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  const [transferForm] = Form.useForm();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce для поиска (500ms)
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchText(searchText);
      // Сбрасываем страницу при новом поиске
      if (searchText !== debouncedSearchText) {
        setPage(1);
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchText, debouncedSearchText]);

  // Получаем данные пользователей с API-поиском
  const { data: usersData, isLoading, refetch } = useQuery({
    queryKey: ['users', page, pageSize, debouncedSearchText],
    queryFn: () => usersApi.getAll(page, pageSize, debouncedSearchText || undefined),
    retry: 1,
  });

  const usersArray = toArray<User>(usersData?.data, [] as User[]);
  const users = usersArray as any;
  const total = (typeof usersData?.data?.total === 'number') ? (usersData?.data?.total as number) : usersArray.length;

  // Фильтруем пользователей только по статусу и датам (поиск уже выполнен на сервере)
  const filteredUsers: User[] = users.filter((user) => {
    const matchesStatus = !filterStatus || (filterStatus === 'active' ? user.is_active : !user.is_active);

    // Фильтр по дате регистрации
    const matchesDate = !dateRange || (() => {
      const userDate = dayjs(user.created_at);
      const [startDate, endDate] = dateRange;
      return userDate.isAfter(startDate.subtract(1, 'day')) && userDate.isBefore(endDate.add(1, 'day'));
    })();

    return matchesStatus && matchesDate;
  });

  // Подробная статистика с датами (используем отфильтрованных пользователей)
  const stats = useMemo(() => {
    const now = dayjs();
    const weekAgo = now.subtract(7, 'day');
    const monthAgo = now.subtract(30, 'day');
    const yearAgo = now.subtract(365, 'day');

    // Используем filteredUsers для статистики, чтобы учитывать все фильтры
    const usersThisWeek = filteredUsers.filter(u => dayjs(u.created_at).isAfter(weekAgo));
    const usersThisMonth = filteredUsers.filter(u => dayjs(u.created_at).isAfter(monthAgo));
    const usersThisYear = filteredUsers.filter(u => dayjs(u.created_at).isAfter(yearAgo));

    const filteredByDate = dateRange 
      ? filteredUsers.filter(u => {
          const userDate = dayjs(u.created_at);
          const [startDate, endDate] = dateRange;
          return userDate.isAfter(startDate.subtract(1, 'day')) && userDate.isBefore(endDate.add(1, 'day'));
        })
      : filteredUsers;

    return {
      total: debouncedSearchText ? filteredUsers.length : total, // Если есть поиск, показываем количество отфильтрованных
      active: filteredUsers.filter((u) => u.is_active).length,
      inactive: filteredUsers.filter((u) => !u.is_active).length,
      totalBalance: filteredUsers.reduce((sum, u) => sum + ((u as any).balance || 0), 0),
      thisWeek: usersThisWeek.length,
      thisMonth: usersThisMonth.length,
      thisYear: usersThisYear.length,
      filteredCount: filteredByDate.length,
      dateRange: dateRange ? {
        from: dateRange[0].format('DD.MM.YYYY'),
        to: dateRange[1].format('DD.MM.YYYY'),
      } : null,
    };
  }, [filteredUsers, total, dateRange, debouncedSearchText]);

  const handleViewDetails = (user: User) => {
    setSelectedUser(user);
    setIsDrawerOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue(user);
    setIsModalOpen(true);
  };

  const handleDelete = (userId: number) => {
    Modal.confirm({
      title: 'Удалить пользователя?',
      content: 'Это действие нельзя отменить',
      okText: 'Удалить',
      cancelText: 'Отменить',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await usersApi.delete(userId);
          message.success('Пользователь удален');
          refetch();
        } catch (error) {
          message.error('Ошибка при удалении');
        }
      },
    });
  };

  const handleBlock = async (userId: number) => {
    try {
      await usersApi.deactivate(userId);
      message.success('Пользователь заблокирован');
      refetch();
    } catch (error) {
      message.error('Ошибка при блокировке');
    }
  };

  const handleUnblock = async (userId: number) => {
    try {
      await usersApi.activate(userId);
      message.success('Пользователь разблокирован');
      refetch();
    } catch (error) {
      message.error('Ошибка при разблокировке');
    }
  };

  const handleSave = async (values: any) => {
    try {
      if (editingUser) {
        await usersApi.update(editingUser.id, values);
        message.success('Пользователь обновлен');
      }
      setIsModalOpen(false);
      form.resetFields();
      setEditingUser(null);
      refetch();
    } catch (error) {
      message.error('Ошибка при сохранении');
    }
  };

  const handleExport = (format: 'csv' | 'excel' | 'json' = 'csv') => {
    // Используем отфильтрованные данные для экспорта (если есть фильтры)
    // Иначе используем все данные
    const dataToExport = filteredUsers.length > 0 ? filteredUsers : users;
    
    // Проверяем, что есть данные для экспорта
    if (!dataToExport || dataToExport.length === 0) {
      message.warning(t('common.noDataToExport', 'Нет данных для экспорта'));
      return;
    }
    
    console.log('Exporting users:', { count: dataToExport.length, sample: dataToExport[0] });

    const exportColumns = [
      { key: 'id', title: t('users.export.id', 'ID') },
      { key: 'name', title: t('users.export.name', 'Имя') },
      { key: 'phone', title: t('users.export.phone', 'Телефон') },
      { key: 'email', title: t('users.export.email', 'Email') },
      { key: 'balance', title: t('users.export.balance', 'Баланс'), render: (val: number) => `${val.toLocaleString()} Yess!Coin` },
      { 
        key: 'is_active', 
        title: t('users.export.status', 'Статус'),
        render: (val: boolean) => val ? t('users.active', 'Активен') : t('users.inactive', 'Заблокирован')
      },
      { 
        key: 'created_at', 
        title: t('users.export.registrationDate', 'Дата регистрации'),
        render: (val: string) => dayjs(val).format('DD.MM.YYYY HH:mm:ss')
      },
    ];

    try {
      if (format === 'csv') {
        exportToCSV(dataToExport, exportColumns, 'users');
        message.success(t('common.exportSuccess', 'Файл успешно загружен'));
      } else if (format === 'excel') {
        exportToExcel(dataToExport, exportColumns, 'users');
        message.success(t('common.exportSuccess', 'Файл успешно загружен'));
      } else {
        exportToJSON(dataToExport, 'users');
        message.success(t('common.exportSuccess', 'Файл успешно загружен'));
      }
    } catch (error) {
      console.error('Export error:', error);
      message.error(t('common.exportError', 'Ошибка при экспорте данных'));
    }
  };

  const columns = [
    {
      title: '#',
      key: 'id',
      width: 60,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: t('users.name', 'Имя'),
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (name: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: '#e0e0e0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <UserOutlined />
          </div>
          <span>{name}</span>
        </div>
      ),
    },
    {
      title: t('users.phone', 'Телефон'),
      dataIndex: 'phone',
      key: 'phone',
      width: 140,
    },
    {
      title: t('users.email', 'Email'),
      dataIndex: 'email',
      key: 'email',
      width: 180,
    },
    {
      title: t('users.balance', 'Баланс'),
      dataIndex: 'balance',
      key: 'balance',
      width: 120,
      render: (balance: number) => (
        <span style={{ color: 'var(--color-primary)', fontWeight: 500 }}>
          {balance.toLocaleString()} Yess!Coin
        </span>
      ),
    },
    {
      title: t('users.status', 'Статус'),
      dataIndex: 'is_active',
      key: 'is_active',
      width: 120,
      render: (is_active: boolean) => (
        <Tag
          color={is_active ? 'green' : 'red'}
          style={{
            padding: '4px 12px',
            borderRadius: 4,
            color: 'white',
            fontWeight: 500,
          }}
        >
          {is_active ? t('users.active', 'Активен') : t('users.inactive', 'Заблокирован')}
        </Tag>
      ),
    },
    {
      title: t('users.registration', 'Регистрация'),
      dataIndex: 'created_at',
      key: 'created_at',
      width: 140,
      render: (date: string) => dayjs(date).format('DD.MM.YYYY'),
    },
    {
      title: t('common.actions', 'Действие'),
      key: 'actions',
      width: 180,
      render: (_: any, record: User) => (
        <Space size="small">
          <Tooltip title={t('common.view', 'Просмотр')}>
            <span style={{ display: 'inline-block' }}>
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => handleViewDetails(record)}
              />
            </span>
          </Tooltip>
          <Tooltip title={t('common.edit', 'Редактировать')}>
            <span style={{ display: 'inline-block' }}>
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              />
            </span>
          </Tooltip>
          {record.is_active ? (
            <Tooltip title={t('users.block', 'Заблокировать')}>
              <span style={{ display: 'inline-block' }}>
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<LockOutlined />}
                  onClick={() => handleBlock(record.id)}
                />
              </span>
            </Tooltip>
          ) : (
            <Tooltip title={t('users.unblock', 'Разблокировать')}>
              <span style={{ display: 'inline-block' }}>
                <Button
                  type="text"
                  size="small"
                  icon={<UnlockOutlined />}
                  onClick={() => handleUnblock(record.id)}
                />
              </span>
            </Tooltip>
          )}
          <Tooltip title={t('common.delete', 'Удалить')}>
            <span style={{ display: 'inline-block' }}>
              <DeleteButton
                onDelete={() => {
                  // handleDelete уже показывает модальное окно, поэтому просто вызываем API напрямую
                  usersApi.delete(record.id).then(() => {
                    message.success('Пользователь удален');
                    refetch();
                  }).catch(() => {
                    message.error('Ошибка при удалении');
                  });
                }}
                text=""
                className="danger compact icon-only"
                confirmTitle={t('common.deleteConfirm', 'Удалить пользователя?')}
                confirmContent={t('common.deleteWarning', 'Это действие нельзя отменить')}
                confirmOkText={t('common.delete', 'Удалить')}
                confirmCancelText={t('common.cancel', 'Отменить')}
              />
            </span>
          </Tooltip>
          <Tooltip title={t('users.transfer.title', 'Перевод баллов')}>
            <span style={{ display: 'inline-block' }}>
              <Button
                type="text"
                size="small"
                icon={<SwapOutlined />}
                onClick={() => {
                  setTransferFromUser(record);
                  transferForm.resetFields();
                  transferForm.setFieldsValue({ from_user_id: record.id });
                  setIsTransferModalOpen(true);
                }}
                style={{ color: 'var(--color-primary)' }}
              />
            </span>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
          {t('users.title', 'Пользователи')}
        </h1>
      </div>

      {/* Статистика */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card 
            className="hover-lift scale-in"
            style={{ 
              borderRadius: 12,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            }}
          >
            <Statistic
              title={t('users.stats.total', 'Всего пользователей')}
              value={stats.total}
              prefix={<UserOutlined style={{ color: 'var(--color-primary)', fontSize: 20 }} />}
              valueStyle={{ color: 'var(--color-text-primary)', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card 
            className="hover-lift scale-in"
            style={{ 
              borderRadius: 12,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            }}
          >
            <Statistic
              title={t('users.stats.active', 'Активные')}
              value={stats.active}
              prefix={<UserOutlined style={{ color: '#689071', fontSize: 20 }} />}
              valueStyle={{ color: 'var(--color-primary)', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card 
            className="hover-lift scale-in"
            style={{ 
              borderRadius: 12,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            }}
          >
            <Statistic
              title={t('users.stats.inactive', 'Заблокированные')}
              value={stats.inactive}
              prefix={<LockOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />}
              valueStyle={{ color: 'var(--color-error)', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card 
            className="hover-lift scale-in"
            style={{ 
              borderRadius: 12,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            }}
          >
            <Statistic
              title={t('users.stats.totalBalance', 'Общий баланс')}
              value={stats.totalBalance}
              prefix={<DollarOutlined style={{ color: '#689071', fontSize: 20 }} />}
              suffix=" Yess!Coin"
              valueStyle={{ color: 'var(--color-text-primary)', fontWeight: 600 }}
              formatter={(value) => `${(Number(value) / 1000000).toFixed(1)}M`}
            />
          </Card>
        </Col>
      </Row>

      {/* Аналитика по датам */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('users.stats.thisWeek', 'За неделю')}
              value={stats.thisWeek}
              prefix={<LineChartOutlined />}
              valueStyle={{ color: '#689071' }}
              suffix={t('users.stats.new', 'новых')}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('users.stats.thisMonth', 'За месяц')}
              value={stats.thisMonth}
              prefix={<LineChartOutlined />}
              valueStyle={{ color: '#689071' }}
              suffix={t('users.stats.new', 'новых')}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('users.stats.thisYear', 'За год')}
              value={stats.thisYear}
              prefix={<LineChartOutlined />}
              valueStyle={{ color: '#689071' }}
              suffix={t('users.stats.new', 'новых')}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={stats.dateRange ? `${t('common.fromDate', 'С')} ${stats.dateRange.from}` : t('users.stats.selectPeriod', 'Выберите период')}
              value={stats.dateRange ? stats.filteredCount : '-'}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#689071' }}
              suffix={stats.dateRange ? `${t('common.toDate', 'до')} ${stats.dateRange.to}` : ''}
            />
          </Card>
        </Col>
      </Row>

      {/* Фильтры */}
      <Card 
        style={{ 
          marginBottom: 16,
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        }}
      >
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder={t('common.search', 'Поиск по имени, телефону или email...')}
              prefix={<SearchOutlined style={{ color: 'var(--color-primary)' }} />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              size="large"
              style={{
                borderRadius: 8,
                borderColor: searchText ? '#689071' : undefined,
              }}
              suffix={
                searchText && searchText !== debouncedSearchText ? (
                  <span style={{ color: 'var(--color-primary)', fontSize: 12 }}>Поиск...</span>
                ) : null
              }
            />
            {debouncedSearchText && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-primary)' }}>
                Найдено результатов: {total}
              </div>
            )}
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder={t('users.filterStatus', 'Фильтр по статусу')}
              value={filterStatus}
              onChange={setFilterStatus}
              style={{ width: '100%' }}
              allowClear
            >
              <Select.Option value="active">{t('users.active', 'Активные')}</Select.Option>
              <Select.Option value="inactive">{t('users.inactive', 'Заблокированные')}</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <RangePicker
              style={{ width: '100%' }}
              placeholder={[t('common.fromDate', 'С даты'), t('common.toDate', 'По дату')]}
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
              format="DD.MM.YYYY"
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Dropdown
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
                <Button icon={<ExportOutlined />} type="primary">
                  {t('common.export', 'Экспорт')}
                </Button>
              </Dropdown>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Таблица */}
      <Card 
        loading={isLoading}
        style={{
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        }}
        className="hover-lift"
      >
      <Table<User>
        columns={columns}
        dataSource={filteredUsers}
        rowKey="id"
        pagination={false}
        scroll={{ x: 1200 }}
      />

        {/* Пагинация */}
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <Pagination
            current={page}
            total={total}
            pageSize={pageSize}
            onChange={setPage}
            showSizeChanger
            onShowSizeChange={(_, size) => setPageSize(size)}
          />
        </div>
    </Card>

      {/* Модальное окно редактирования */}
      <Modal
        title="Редактировать пользователя"
        open={isModalOpen}
        onOk={() => form.submit()}
        onCancel={() => setIsModalOpen(false)}
        okText="Сохранить"
        cancelText="Отменить"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            label="Имя"
            name="name"
            rules={[{ required: true, message: 'Введите имя' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[{ type: 'email', message: 'Неверный email' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Баланс (Y)"
            name="balance"
            rules={[{ required: true, message: 'Введите баланс' }]}
          >
            <Input type="number" />
          </Form.Item>

          <Form.Item
            label="Статус"
            name="is_active"
            rules={[{ required: true, message: 'Выберите статус' }]}
          >
            <Select>
              <Select.Option value={true}>Активен</Select.Option>
              <Select.Option value={false}>Заблокирован</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Drawer для деталей */}
      <Drawer
        title="Детали пользователя"
        placement="right"
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
        width={400}
      >
        {selectedUser && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ color: 'var(--color-text-tertiary)', fontSize: 12 }}>Имя</div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>{selectedUser.name}</div>
            </div>

            <div>
              <div style={{ color: 'var(--color-text-tertiary)', fontSize: 12 }}>Телефон</div>
              <div style={{ fontSize: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
                <PhoneOutlined />
                {selectedUser.phone}
              </div>
            </div>

            <div>
              <div style={{ color: 'var(--color-text-tertiary)', fontSize: 12 }}>Email</div>
              <div style={{ fontSize: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
                <MailOutlined />
                {selectedUser.email || '-'}
              </div>
            </div>

            <div>
              <div style={{ color: 'var(--color-text-tertiary)', fontSize: 12 }}>Баланс</div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: 'var(--color-success)',
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                }}
              >
                <DollarOutlined />
                {selectedUser.balance.toLocaleString()} Y
              </div>
            </div>

            <div>
              <div style={{ color: 'var(--color-text-tertiary)', fontSize: 12 }}>Статус</div>
              <Tag
                color={selectedUser.is_active ? 'green' : 'red'}
                style={{
                  padding: '6px 12px',
                  borderRadius: 4,
                  color: 'white',
                  marginTop: 4,
                }}
              >
                {selectedUser.is_active ? 'Активен' : 'Заблокирован'}
              </Tag>
            </div>

            <div>
              <div style={{ color: 'var(--color-text-tertiary)', fontSize: 12 }}>Дата регистрации</div>
              <div style={{ fontSize: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
                <CalendarOutlined />
                {dayjs(selectedUser.created_at).format('DD.MM.YYYY HH:mm')}
              </div>
            </div>

            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <Button block onClick={() => handleEdit(selectedUser)}>
                Редактировать
              </Button>
              <Button
                block
                danger
                onClick={() => {
                  handleDelete(selectedUser.id);
                  setIsDrawerOpen(false);
                }}
              >
                Удалить
              </Button>
            </div>
          </div>
        )}
        </Drawer>

        {/* Модальное окно для перевода баллов */}
        <Modal
          title={t('users.transfer.title', 'Перевод баллов')}
          open={isTransferModalOpen}
          onCancel={() => {
            setIsTransferModalOpen(false);
            transferForm.resetFields();
            setTransferFromUser(null);
          }}
          onOk={() => transferForm.submit()}
          okText={t('users.transfer.confirm', 'Подтвердить перевод')}
          cancelText={t('common.cancel', 'Отменить')}
          width={500}
        >
          <Form
            form={transferForm}
            layout="vertical"
            onFinish={async (values) => {
              try {
                if (!transferFromUser) return;
                
                if (values.amount > transferFromUser.balance) {
                  message.error(t('users.transfer.amountMax', 'Недостаточно баллов'));
                  return;
                }

                if (values.from_user_id === values.to_user_id) {
                  message.error(t('users.transfer.sameUser', 'Нельзя переводить баллы самому себе'));
                  return;
                }

                // Вызов API для перевода
                await api.post('/admin/users/transfer', {
                  from_user_id: values.from_user_id,
                  to_user_id: values.to_user_id,
                  amount: values.amount,
                  reason: values.reason || null,
                });

                message.success(t('users.transfer.success', 'Баллы успешно переведены'));
                setIsTransferModalOpen(false);
                transferForm.resetFields();
                setTransferFromUser(null);
                refetch();
              } catch (error: any) {
                message.error(error?.response?.data?.detail || t('users.transfer.error', 'Ошибка при переводе баллов'));
              }
            }}
            style={{ marginTop: 16 }}
          >
            <Form.Item
              name="from_user_id"
              label={t('users.transfer.from', 'От пользователя')}
              rules={[{ required: true }]}
            >
              <Select
                disabled
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  ((option?.children as unknown) as string)?.toLowerCase().includes(input.toLowerCase())
                }
              >
                {users.map(user => (
                  <Select.Option key={user.id} value={user.id}>
                    {user.name} ({(user as any).balance?.toLocaleString() || '0'} Y)
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="to_user_id"
              label={t('users.transfer.to', 'К пользователю')}
              rules={[{ required: true, message: t('users.transfer.toRequired', 'Выберите получателя') }]}
            >
              <Select
                showSearch
                placeholder={t('users.transfer.selectRecipient', 'Выберите получателя')}
                optionFilterProp="children"
                filterOption={(input, option) =>
                  ((option?.children as unknown) as string)?.toLowerCase().includes(input.toLowerCase())
                }
              >
                {users
                  .filter(user => user.id !== transferFromUser?.id)
                  .map(user => (
                    <Select.Option key={user.id} value={user.id}>
                      {user.name} ({(user as any).balance?.toLocaleString() || '0'} Y)
                    </Select.Option>
                  ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="amount"
              label={t('users.transfer.amount', 'Сумма (Yess коины)')}
              rules={[
                { required: true, message: t('users.transfer.amountRequired', 'Введите сумму') },
                { type: 'number', min: 1, message: t('users.transfer.amountMin', 'Минимальная сумма: 1') },
                {
                  validator: (_, value) => {
                    if (transferFromUser && value > transferFromUser.balance) {
                      return Promise.reject(new Error(t('users.transfer.amountMax', 'Недостаточно баллов')));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={1}
                max={transferFromUser?.balance}
                placeholder={t('users.transfer.amountPlaceholder', 'Введите сумму')}
                formatter={(value) => `${value} Y`}
                parser={(value) => {
                  const numeric = Number((value || '').toString().replace(' Y', ''));
                  return Number.isNaN(numeric) ? 0 : numeric;
                }}
              />
            </Form.Item>
            <Form.Item
              name="reason"
              label={t('users.transfer.reason', 'Причина перевода (необязательно)')}
            >
            <TextArea
              rows={3}
              placeholder={t('users.transfer.reasonPlaceholder', 'Например: Возврат долга')}
            />
            </Form.Item>
            {transferFromUser && (
              <div style={{ 
                padding: 12, 
                background: 'var(--color-bg-secondary)', 
                borderRadius: 8, 
                marginTop: 8,
                border: '1px solid var(--color-border)'
              }}>
                <div style={{ fontSize: 12, color: 'var(--color-primary)', marginBottom: 4 }}>
                  {t('users.transfer.available', 'Доступно для перевода')}:
                </div>
                <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {transferFromUser.balance.toLocaleString()} Y
                </div>
              </div>
            )}
          </Form>
        </Modal>
      </div>
    );
  };
