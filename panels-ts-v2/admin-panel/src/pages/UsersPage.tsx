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
  Avatar,
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

  const filteredUsers: User[] = users.filter((user) => {
    const matchesStatus = !filterStatus || (filterStatus === 'active' ? user.is_active : !user.is_active);
    const matchesDate = !dateRange || (() => {
      const userDate = dayjs(user.created_at);
      const [startDate, endDate] = dateRange;
      return userDate.isAfter(startDate.subtract(1, 'day')) && userDate.isBefore(endDate.add(1, 'day'));
    })();
    return matchesStatus && matchesDate;
  });

  const stats = useMemo(() => {
    const now = dayjs();
    const weekAgo = now.subtract(7, 'day');
    const monthAgo = now.subtract(30, 'day');
    const yearAgo = now.subtract(365, 'day');

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
      total: debouncedSearchText ? filteredUsers.length : total,
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
    const dataToExport = filteredUsers.length > 0 ? filteredUsers : users;
    if (!dataToExport || dataToExport.length === 0) {
      message.warning(t('common.noDataToExport', 'Нет данных для экспорта'));
      return;
    }
    
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
      } else if (format === 'excel') {
        exportToExcel(dataToExport, exportColumns, 'users');
      } else {
        exportToJSON(dataToExport, 'users');
      }
      message.success(t('common.exportSuccess', 'Файл успешно загружен'));
    } catch (error) {
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
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#E8F8F3', color: '#07B981' }} />
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
        <span style={{ color: '#07B981', fontWeight: 500 }}>
          {balance.toLocaleString()} Y
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
            borderRadius: 8,
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
          <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetails(record)} />
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          {record.is_active ? (
            <Button type="text" size="small" danger icon={<LockOutlined />} onClick={() => handleBlock(record.id)} />
          ) : (
            <Button type="text" size="small" icon={<UnlockOutlined />} onClick={() => handleUnblock(record.id)} />
          )}
          <DeleteButton
            onDelete={() => usersApi.delete(record.id).then(() => { message.success('Пользователь удален'); refetch(); })}
            text=""
            className="danger compact icon-only"
          />
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
            style={{ color: '#07B981' }}
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: '#03533A', margin: 0 }}>
          {t('users.title', 'Пользователи')}
        </h1>
      </div>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card className="hover-lift scale-in" style={{ borderRadius: 16, background: '#ffffff', border: '1px solid #E8F8F3' }}>
            <Statistic
              title={t('users.stats.total', 'Всего пользователей')}
              value={stats.total}
              prefix={<UserOutlined style={{ color: '#07B981', fontSize: 20 }} />}
              valueStyle={{ color: '#03533A', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="hover-lift scale-in" style={{ borderRadius: 16, background: '#ffffff', border: '1px solid #E8F8F3' }}>
            <Statistic
              title={t('users.stats.active', 'Активные')}
              value={stats.active}
              prefix={<UserOutlined style={{ color: '#07B981', fontSize: 20 }} />}
              valueStyle={{ color: '#07B981', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="hover-lift scale-in" style={{ borderRadius: 16, background: '#ffffff', border: '1px solid #E8F8F3' }}>
            <Statistic
              title={t('users.stats.inactive', 'Заблокированные')}
              value={stats.inactive}
              prefix={<LockOutlined style={{ color: '#EF4444', fontSize: 20 }} />}
              valueStyle={{ color: '#EF4444', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="hover-lift scale-in" style={{ borderRadius: 16, background: '#ffffff', border: '1px solid #E8F8F3' }}>
            <Statistic
              title={t('users.stats.totalBalance', 'Общий баланс')}
              value={stats.totalBalance}
              prefix={<DollarOutlined style={{ color: '#07B981', fontSize: 20 }} />}
              valueStyle={{ color: '#03533A', fontWeight: 700 }}
              formatter={(value) => `${(Number(value) / 1000000).toFixed(1)}M`}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic title={t('users.stats.thisWeek', 'За неделю')} value={stats.thisWeek} valueStyle={{ color: '#07B981' }} prefix={<LineChartOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic title={t('users.stats.thisMonth', 'За месяц')} value={stats.thisMonth} valueStyle={{ color: '#07B981' }} prefix={<LineChartOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic title={t('users.stats.thisYear', 'За год')} value={stats.thisYear} valueStyle={{ color: '#07B981' }} prefix={<LineChartOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic 
              title={stats.dateRange ? `${t('common.fromDate', 'С')} ${stats.dateRange.from}` : t('users.stats.selectPeriod', 'Выберите период')} 
              value={stats.dateRange ? stats.filteredCount : '-'} 
              valueStyle={{ color: '#07B981' }} 
              prefix={<CalendarOutlined />} 
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16, borderRadius: 16, boxShadow: '0 4px 12px rgba(3, 83, 58, 0.05)', border: '1px solid #E8F8F3' }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder={t('common.search', 'Поиск по имени, телефону или email...')}
              prefix={<SearchOutlined style={{ color: '#07B981' }} />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              size="large"
              style={{ borderRadius: 12, borderColor: searchText ? '#07B981' : '#E8F8F3' }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder={t('users.filterStatus', 'Фильтр по статусу')}
              value={filterStatus}
              onChange={setFilterStatus}
              style={{ width: '100%' }}
              allowClear
              size="large"
            >
              <Select.Option value="active">{t('users.active', 'Активные')}</Select.Option>
              <Select.Option value="inactive">{t('users.inactive', 'Заблокированные')}</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <RangePicker style={{ width: '100%', borderRadius: 12 }} size="large" onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)} />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Dropdown
              menu={{
                items: [
                  { key: 'csv', label: 'CSV', onClick: () => handleExport('csv') },
                  { key: 'excel', label: 'Excel', onClick: () => handleExport('excel') },
                  { key: 'json', label: 'JSON', onClick: () => handleExport('json') },
                ]
              }}
            >
              <Button icon={<ExportOutlined />} type="primary" size="large" block>
                {t('common.export', 'Экспорт')}
              </Button>
            </Dropdown>
          </Col>
        </Row>
      </Card>

      <Card loading={isLoading} style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(3, 83, 58, 0.05)', border: '1px solid #E8F8F3' }}>
        <Table<User> columns={columns} dataSource={filteredUsers} rowKey="id" pagination={false} scroll={{ x: 'max-content' }} />
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <Pagination current={page} total={total} pageSize={pageSize} onChange={setPage} showSizeChanger onShowSizeChange={(_, size) => setPageSize(size)} />
        </div>
      </Card>

      <Modal title="Редактировать пользователя" open={isModalOpen} onOk={() => form.submit()} onCancel={() => setIsModalOpen(false)} okText="Сохранить" cancelText="Отменить">
        <Form form={form} layout="vertical" onFinish={handleSave} style={{ marginTop: 16 }}>
          <Form.Item label="Имя" name="name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="Email" name="email" rules={[{ type: 'email' }]}><Input /></Form.Item>
          <Form.Item label="Баланс (Y)" name="balance" rules={[{ required: true }]}><Input type="number" /></Form.Item>
          <Form.Item label="Статус" name="is_active" rules={[{ required: true }]}>
            <Select>
              <Select.Option value={true}>Активен</Select.Option>
              <Select.Option value={false}>Заблокирован</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Drawer title="Детали пользователя" placement="right" onClose={() => setIsDrawerOpen(false)} open={isDrawerOpen} width={400}>
        {selectedUser && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div><div style={{ color: '#045A42', fontSize: 12 }}>Имя</div><div style={{ fontSize: 16, fontWeight: 600 }}>{selectedUser.name}</div></div>
            <div><div style={{ color: '#045A42', fontSize: 12 }}>Телефон</div><div style={{ fontSize: 14 }}><PhoneOutlined /> {selectedUser.phone}</div></div>
            <div><div style={{ color: '#045A42', fontSize: 12 }}>Email</div><div style={{ fontSize: 14 }}><MailOutlined /> {selectedUser.email || '-'}</div></div>
            <div><div style={{ color: '#045A42', fontSize: 12 }}>Баланс</div><div style={{ fontSize: 20, fontWeight: 700, color: '#07B981' }}><DollarOutlined /> {selectedUser.balance.toLocaleString()} Y</div></div>
            <div><div style={{ color: '#045A42', fontSize: 12 }}>Статус</div><Tag color={selectedUser.is_active ? 'green' : 'red'}>{selectedUser.is_active ? 'Активен' : 'Заблокирован'}</Tag></div>
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <Button block onClick={() => handleEdit(selectedUser)}>Редактировать</Button>
              <Button block danger onClick={() => { handleDelete(selectedUser.id); setIsDrawerOpen(false); }}>Удалить</Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
