import { useState, lazy, Suspense } from 'react';
import { Card, Table, Tag, Input, Space, Row, Col, Select, message, Spin, Alert } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { locationsApi } from '../services/api';

// Динамический импорт карты для избежания проблем с SSR
const LocationMap = lazy(() => 
  import('../components/LocationMap').then((mod) => ({ default: mod.LocationMap }))
);

// Центр карты - Бишкек
const DEFAULT_CENTER: [number, number] = [42.8746, 74.5698];
const DEFAULT_ZOOM = 13;

interface Location {
  key?: string;
  id: number;
  name: string;
  address: string;
  status: 'open' | 'closed';
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
}

export const LocationsPage = () => {
  const [searchText, setSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>();
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const queryClient = useQueryClient();

  // Загрузка локаций из API
  const { data: locationsResponse, isLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await locationsApi.getLocations();
      return response.data;
    },
    retry: 1,
  });

  const allLocations = locationsResponse || [];

  // Фильтрация локаций
  const filteredLocations = allLocations.filter((location: Location) => {
    const matchesSearch =
      !searchText ||
      location.name.toLowerCase().includes(searchText.toLowerCase()) ||
      location.address.toLowerCase().includes(searchText.toLowerCase());
    const matchesStatus = !selectedStatus || location.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const handleMarkerClick = (location: Location) => {
    setSelectedLocation(location);
    if (location.latitude && location.longitude) {
      setMapCenter([location.latitude, location.longitude]);
      setMapZoom(15);
    }
  };

  const handleLocationSelect = (locationId: number) => {
    const location = allLocations.find((l: Location) => l.id === locationId);
    if (location) {
      handleMarkerClick(location);
    }
  };

  const columns = [
    {
      title: '№',
      key: 'id',
      width: 60,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: 'Название точки',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <span style={{ fontWeight: 600, color: '#0F2A1D' }}>{name}</span>,
    },
    {
      title: 'Адрес',
      dataIndex: 'address',
      key: 'address',
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag 
          color={status === 'open' ? 'green' : 'default'}
          style={{ borderRadius: 12, padding: '4px 12px' }}
        >
          {status === 'open' ? '🟢 Открыто' : '🔴 Закрыто'}
        </Tag>
      ),
    },
  ];

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0, color: '#0F2A1D', background: 'linear-gradient(135deg, #0F2A1D 0%, #689071 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          🏪 Локации партнёра
        </h1>
        <p style={{ color: '#689071', margin: '8px 0 0 0', fontSize: 14, fontWeight: 500 }}>
          Управляйте информацией о вашем бизнесе и локациях
        </p>
      </div>

      {/* Фильтры */}
      <Card
        style={{
          borderRadius: 16,
          background: 'linear-gradient(135deg, #ffffff 0%, #F0F7EB 100%)',
          border: '1px solid #E3EED4',
          boxShadow: '0 2px 12px rgba(15, 42, 29, 0.08)',
          marginBottom: 16,
        }}
        className="hover-lift-green"
      >
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Поиск по названию или адресу"
              prefix={<SearchOutlined style={{ color: '#689071' }} />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              size="large"
              style={{
                borderRadius: 8,
                borderColor: searchText ? '#689071' : undefined,
              }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Фильтр по статусу"
              value={selectedStatus}
              onChange={setSelectedStatus}
              allowClear
              style={{ width: '100%' }}
              size="large"
            >
              <Select.Option value="open">🟢 Открыто</Select.Option>
              <Select.Option value="closed">🔴 Закрыто</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Выбрать локацию"
              showSearch
              optionFilterProp="children"
              onChange={handleLocationSelect}
              style={{ width: '100%' }}
              size="large"
              filterOption={(input, option) => {
                const children = option?.children;
                const value = typeof children === 'string' ? children : String(children);
                return value.toLowerCase().includes(input.toLowerCase());
              }}
            >
              {allLocations.map((location: Location) => (
                <Select.Option key={location.id} value={location.id}>
                  {location.name}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Tag color="green" style={{ fontSize: 14, padding: '8px 12px', width: '100%', textAlign: 'center' }}>
              Найдено: {filteredLocations.length}
            </Tag>
          </Col>
        </Row>
      </Card>

      {/* Карта */}
      <Card
        style={{
          borderRadius: 16,
          background: 'linear-gradient(135deg, #ffffff 0%, #F0F7EB 100%)',
          border: '1px solid #E3EED4',
          boxShadow: '0 2px 12px rgba(15, 42, 29, 0.08)',
          padding: 0,
          overflow: 'hidden',
          marginBottom: 16,
        }}
        className="hover-lift-green"
      >
        <div style={{ height: '500px', width: '100%', position: 'relative' }}>
          <Suspense
            fallback={
              <div style={{ 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                background: '#F0F7EB'
              }}>
                <Spin size="large" />
              </div>
            }
          >
            <LocationMap
              locations={filteredLocations}
              center={mapCenter}
              zoom={mapZoom}
              onMarkerClick={handleMarkerClick}
            />
          </Suspense>
        </div>
      </Card>

      {/* Таблица локаций */}
      <Card
        title={<span style={{ color: '#0F2A1D', fontSize: 16, fontWeight: 700 }}>📍 Мои локации</span>}
        extra={
          <Tag color="#d9d9d9" style={{ borderRadius: 8 }}>
            Только просмотр. Для изменений — обратитесь к администратору.
          </Tag>
        }
        style={{
          borderRadius: 16,
          background: 'linear-gradient(135deg, #ffffff 0%, #F0F7EB 100%)',
          border: '1px solid #E3EED4',
          marginBottom: 32,
          boxShadow: '0 2px 12px rgba(15, 42, 29, 0.08)',
        }}
        className="hover-lift-green"
      >
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Spin size="large" />
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={filteredLocations}
            pagination={{ pageSize: 10 }}
            rowClassName={() => 'partner-table-row'}
            loading={isLoading}
          />
        )}
      </Card>

      <Alert
        type="info"
        showIcon
        message="Редактирование недоступно"
        description="Для добавления или изменения локаций обратитесь к администратору."
        style={{ borderRadius: 12 }}
      />

      <style>{`
        .partner-table-row {
          transition: all 0.3s;
        }
        .partner-table-row:hover {
          background-color: #F0F7EB !important;
          transform: scale(1.01);
        }
        .hover-lift-green:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(15, 42, 29, 0.12) !important;
        }
        .fade-in {
          animation: fadeIn 0.5s ease-in;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};
