import { useState, useEffect, lazy, Suspense } from 'react';
import { Card, Table, Tag, Space, Tooltip, Row, Col, Select, message, Spin, Dropdown, Segmented, Button } from 'antd';
import { ExportOutlined, AimOutlined, ClockCircleOutlined, SwapRightOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { toArray } from '../utils/arrayUtils';
import { locationsApi } from '../services/api';
import { exportToCSV, exportToExcel, exportToJSON } from '../utils/exportUtils';
import { buildRoute, buildRouteViaBackend, buildTransitViaBackend, formatDistance, formatDuration } from '../services/mapService';
import { DownOutlined } from '@ant-design/icons';
import { AddressAutocomplete } from '../components/AddressAutocomplete';
import { useDocumentTitle } from '@shared/hooks/useDocumentTitle';

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

// Моковые данные удалены - используем только данные из API

export const LocationsPage = () => {
  useDocumentTitle('Локации', 'YESS!GO Partner');
  const [searchText, setSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>();
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [routePath, setRoutePath] = useState<[number, number][]>([]);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [routeMode, setRouteMode] = useState<'driving' | 'walking' | 'cycling' | 'transit'>('driving');
  const [routeLoading, setRouteLoading] = useState(false);

  // Загрузка локаций из API
  const { data: locationsResponse, isLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await locationsApi.getLocations();
      return response.data || [];
    },
    retry: 1,
  });

  // Режим только чтение для партнёрской панели

  // Нормализуем ответ API в массив локаций
  const allLocations: Location[] = toArray((locationsResponse as any), []);

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

  // Геолокация пользователя
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        if (!selectedLocation) {
          setMapCenter(coords);
          setMapZoom(14);
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, [selectedLocation]);

  // Построение маршрута к выбранной локации
  const buildRouteToLocation = async (loc?: Location) => {
    const target = loc ?? selectedLocation;
    if (!target?.latitude || !target?.longitude) {
      message.warning('Выберите локацию на карте');
      return;
    }
    let start = userLocation ?? mapCenter;
    const end: [number, number] = [target.latitude, target.longitude];
    const close = (a: [number, number], b: [number, number]) =>
      Math.abs(a[0] - b[0]) < 0.0001 && Math.abs(a[1] - b[1]) < 0.0001;
    if (close(start, end)) {
      start = [end[0] + 0.0005, end[1] + 0.0005];
    }
    setRouteLoading(true);
    try {
      const result = await (async () => {
        if (routeMode === 'transit') {
          const transit = await buildTransitViaBackend(start, end);
          if (transit) return transit;
          message.error('Транспортный провайдер не настроен на сервере');
          return null;
        }
        // Пытаемся через backend-прокси (OSRM). При сбое - прямой OSRM.
        const backend = await buildRouteViaBackend(start, end, routeMode);
        if (backend) return backend;
        return await buildRoute(start, end, routeMode === 'driving' ? 'driving' : routeMode === 'walking' ? 'walking' : 'cycling');
      })();
      if (result && result.geometry?.length) {
        setRoutePath(result.geometry);
        setRouteInfo({
          distance: formatDistance(result.distance),
          duration: formatDuration(result.duration),
        });
        setMapCenter(end);
        setMapZoom(14);
        message.success('Маршрут построен');
      } else {
        setRoutePath([]);
        setRouteInfo(null);
        message.error('Не удалось построить маршрут');
      }
    } finally {
      setRouteLoading(false);
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
    {
      title: 'Действие',
      key: 'actions',
      width: 120,
      render: (_: any, record: Location) => (
        <Space size="small" wrap>
          <Tooltip title="Как добраться">
            <Button
              type="text"
              icon={<AimOutlined />}
              style={{ color: '#689071' }}
              loading={routeLoading && selectedLocation?.id === record.id}
              onClick={() => {
                setSelectedLocation(record);
                buildRouteToLocation(record);
              }}
            />
          </Tooltip>
          {record.latitude && record.longitude ? (
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'gmaps',
                    label: 'Открыть в Google Maps',
                    onClick: () => window.open(`https://www.google.com/maps/dir/?api=1&destination=${record.latitude},${record.longitude}`, '_blank'),
                  },
                  {
                    key: 'yandex',
                    label: 'Открыть в Яндекс.Картах',
                    onClick: () => window.open(`https://yandex.ru/maps/?rtext=~${record.latitude},${record.longitude}`, '_blank'),
                  },
                ],
              }}
              trigger={['click']}
            >
              <Button type="text" style={{ color: '#689071' }}>
                Навигатор <DownOutlined />
              </Button>
            </Dropdown>
          ) : null}
        </Space>
      ),
    },
  ];

  // Экспорт данных
  const handleExport = (format: 'csv' | 'excel' | 'json' = 'csv') => {
    const dataToExport = filteredLocations.length > 0 ? filteredLocations : allLocations;
    
    if (!dataToExport || dataToExport.length === 0) {
      message.warning('Нет данных для экспорта');
      return;
    }

    const exportColumns = [
      { key: 'id', title: 'ID' },
      { key: 'name', title: 'Название' },
      { key: 'address', title: 'Адрес' },
      { key: 'status', title: 'Статус', render: (val: string) => val === 'open' ? 'Открыто' : 'Закрыто' },
      { key: 'phone', title: 'Телефон' },
      { key: 'email', title: 'Email' },
    ];

    try {
      if (format === 'csv') {
        exportToCSV(dataToExport, exportColumns, 'locations');
        message.success('Файл успешно загружен');
      } else if (format === 'excel') {
        exportToExcel(dataToExport, exportColumns, 'locations');
        message.success('Файл успешно загружен');
      } else {
        exportToJSON(dataToExport, 'locations');
        message.success('Файл успешно загружен');
      }
    } catch (error) {
      console.error('Export error:', error);
      message.error('Ошибка при экспорте данных');
    }
  };

  const exportMenuItems = [
    { key: 'csv', label: 'Экспорт в CSV', onClick: () => handleExport('csv') },
    { key: 'excel', label: 'Экспорт в Excel', onClick: () => handleExport('excel') },
    { key: 'json', label: 'Экспорт в JSON', onClick: () => handleExport('json') },
  ];

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0, color: '#0F2A1D', background: 'linear-gradient(135deg, #0F2A1D 0%, #689071 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            🏪 Локации партнёра
          </h1>
          <p style={{ color: '#689071', margin: '8px 0 0 0', fontSize: 14, fontWeight: 500 }}>
            Управляйте информацией о вашем бизнесе и локациях
          </p>
        </div>
        <Dropdown
          menu={{ items: exportMenuItems }}
          trigger={['click']}
        >
          <Button
            type="default"
            icon={<ExportOutlined />}
            style={{
              borderRadius: 12,
              borderColor: '#689071',
              color: '#689071',
              height: 40,
              fontWeight: 600,
            }}
          >
            Экспорт
          </Button>
        </Dropdown>
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
            <AddressAutocomplete
              placeholder="Поиск по адресу"
              onSelectAddress={(opt) => {
                setSearchText(opt.value);
                setMapCenter([opt.lat, opt.lon]);
                setMapZoom(15);
              }}
              style={{ width: '100%' }}
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
              userLocation={userLocation}
              routePath={routePath}
              routeMode={routeMode}
              onMapClick={async (lat, lng) => {
                setMapCenter([lat, lng]);
                message.success('Точка выбрана на карте');
              }}
            />
          </Suspense>
        </div>
      </Card>

      {/* Панель маршрута */}
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
        <Space wrap>
          <Segmented
            value={routeMode}
            onChange={(v) => setRouteMode(v as any)}
            options={(() => {
              const base = [
                { label: 'Авто', value: 'driving' },
                { label: 'Пешком', value: 'walking' },
                { label: 'Вело', value: 'cycling' },
              ];
              const transitEnabled = (import.meta as any).env?.VITE_TRANSIT_ENABLED !== 'false';
              return transitEnabled ? [...base, { label: 'Транспорт', value: 'transit' }] : base;
            })()}
          />
          <Button
            type="primary"
            loading={routeLoading}
            disabled={!selectedLocation}
            onClick={() => buildRouteToLocation()}
            style={{ background: 'linear-gradient(135deg, #689071 0%, #AEC380 100%)', border: 'none' }}
          >
            Построить маршрут
          </Button>
          {routeInfo && (
            <Space size="large" style={{ marginLeft: 16 }}>
              <Space>
                <ClockCircleOutlined style={{ color: '#689071' }} />
                <span style={{ color: '#0F2A1D' }}>{routeInfo.duration}</span>
              </Space>
              <Space>
                <SwapRightOutlined style={{ color: '#689071' }} />
                <span style={{ color: '#0F2A1D' }}>{routeInfo.distance}</span>
              </Space>
              <Tag color="green">{routeMode === 'transit' ? 'Транспорт' : routeMode === 'walking' ? 'Пешком' : routeMode === 'cycling' ? 'Вело' : 'Авто'}</Tag>
            </Space>
          )}
        </Space>
      </Card>

      {/* Таблица локаций */}
      <Card
        title={<span style={{ color: '#0F2A1D', fontSize: 16, fontWeight: 700 }}>📍 Мои локации</span>}
        extra={
          <div style={{
            backgroundColor: '#FFF3CD',
            border: '1px solid #FFECB5',
            borderRadius: 12,
            padding: '12px 16px',
            color: '#856404',
            fontSize: '14px',
            fontWeight: 500
          }}>
            <strong>ℹ️ Управление локациями:</strong><br/>
            Для добавления или изменения локаций обратитесь к администратору
          </div>
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

      {/* В партнёрской панели управление локациями — только просмотр */}

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
