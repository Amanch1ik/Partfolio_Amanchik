import { useState, useEffect } from 'react';
import { Card, Select, Input, Space, Button, Tag, message, Modal, Descriptions, List, Divider, Typography, Empty } from 'antd';
import { SearchOutlined, EnvironmentOutlined, PhoneOutlined, MailOutlined, ShopOutlined, CarOutlined, ClockCircleOutlined, SwapRightOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { t } from '@/i18n';
import { api } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import '../styles/animations.css';

// Исправление иконок для Leaflet
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

// Центр карты - Бишкек
const DEFAULT_CENTER: [number, number] = [42.8746, 74.5698];
const DEFAULT_ZOOM = 13;

interface Partner {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  category?: string;
  status: string;
  latitude?: number;
  longitude?: number;
  address?: string;
}

// Компонент для изменения центра карты
function ChangeMapView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

interface RouteOption {
  id: number;
  type: 'bus' | 'walk' | 'taxi';
  name: string;
  duration: number; // в минутах
  distance: number; // в км
  buses?: string[]; // номера автобусов
  transfers?: number; // количество пересадок
  cost?: number; // стоимость в сомах
}

export const PartnersMapPage = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [searchText, setSearchText] = useState('');
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const [showRoute, setShowRoute] = useState(false);
  const [routePath, setRoutePath] = useState<[number, number][]>([]);
  const [routeOptions, setRouteOptions] = useState<RouteOption[]>([]);
  const [showRouteModal, setShowRouteModal] = useState(false);

  // Загрузка партнеров
  const { data: partnersResponse, isLoading } = useQuery({
    queryKey: ['partners', 'map'],
    queryFn: async () => {
      const response = await api.partnersApi.getAll();
      return response?.data?.items || response?.items || [];
    },
  });

  const partners: Partner[] = (partnersResponse || []).map((p: any) => ({
    id: p.id,
    name: p.name || t('partners.defaultName', 'Глобус'),
    email: p.email,
    phone: p.phone,
    category: p.category || 'general',
    status: p.status || 'active',
    latitude: p.latitude || (42.8746 + (Math.random() - 0.5) * 0.1),
    longitude: p.longitude || (74.5698 + (Math.random() - 0.5) * 0.1),
    address: p.address || t('partners.defaultName', 'Глобус'),
  }));

  // Фильтрация партнеров
  const filteredPartners = partners.filter((partner) => {
    const matchesCategory = !selectedCategory || partner.category === selectedCategory;
    const matchesSearch = !searchText || 
      partner.name.toLowerCase().includes(searchText.toLowerCase()) ||
      partner.address?.toLowerCase().includes(searchText.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Уникальные категории
  const categories = Array.from(new Set(partners.map(p => p.category).filter(Boolean)));

  const handleMarkerClick = (partner: Partner) => {
    setSelectedPartner(partner);
    if (partner.latitude && partner.longitude) {
      setMapCenter([partner.latitude, partner.longitude]);
      setMapZoom(15);
      setShowRoute(false);
      setRoutePath([]);
    }
  };

  const handlePartnerSelect = (partnerId: number) => {
    const partner = partners.find(p => p.id === partnerId);
    if (partner) {
      handleMarkerClick(partner);
    }
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0F2A1D', margin: 0 }}>
          {t('partners.map', 'Карта партнеров')}
        </h1>
        <p style={{ color: '#689071', margin: '8px 0 0 0' }}>
          {t('partners.mapDescription', 'Просмотр партнеров на карте и построение маршрутов')}
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
        <Space wrap style={{ width: '100%' }}>
          <Input
            placeholder={t('partners.searchOnMap', 'Поиск по названию или адресу')}
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ width: 300 }}
          />
          <Select
            placeholder={t('partners.filterCategory', 'Фильтр по категории')}
            value={selectedCategory}
            onChange={setSelectedCategory}
            allowClear
            style={{ width: 200 }}
          >
            {categories.map(cat => (
              <Select.Option key={cat} value={cat}>
                {cat}
              </Select.Option>
            ))}
          </Select>
          <Select
            placeholder={t('partners.selectPartner', 'Выбрать партнера')}
            showSearch
            optionFilterProp="children"
            onChange={handlePartnerSelect}
            style={{ width: 250 }}
            filterOption={(input, option) =>
              (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
            }
          >
            {partners.map(partner => (
              <Select.Option key={partner.id} value={partner.id}>
                {partner.name}
              </Select.Option>
            ))}
          </Select>
          <div style={{ flex: 1 }} />
          <Tag color="green" style={{ fontSize: 14, padding: '4px 12px' }}>
            {t('partners.found', 'Найдено')}: {filteredPartners.length}
          </Tag>
        </Space>
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
        }}
        className="hover-lift-green"
      >
        <div style={{ height: '600px', width: '100%', position: 'relative' }}>
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%', zIndex: 1 }}
            scrollWheelZoom={true}
          >
            <ChangeMapView center={mapCenter} zoom={mapZoom} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {/* Маршрут */}
            {showRoute && routePath.length > 0 && (
              <Polyline
                positions={routePath}
                pathOptions={{
                  color: '#689071',
                  weight: 4,
                  opacity: 0.7,
                  dashArray: '10, 10'
                }}
              />
            )}
            
            {/* Маркер начала маршрута (если маршрут активен) */}
            {showRoute && routePath.length > 0 && (
              <Marker
                position={routePath[0]}
                icon={L.divIcon({
                  className: 'route-start-marker',
                  html: '<div style="width: 20px; height: 20px; background: #689071; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
                  iconSize: [20, 20],
                  iconAnchor: [10, 10],
                })}
              />
            )}
            
            {filteredPartners.map((partner) => {
              if (!partner.latitude || !partner.longitude) return null;
              return (
                <Marker
                  key={partner.id}
                  position={[partner.latitude, partner.longitude]}
                  eventHandlers={{
                    click: () => handleMarkerClick(partner),
                  }}
                >
                  <Popup>
                    <div style={{ minWidth: 200 }}>
                      <h3 style={{ margin: '0 0 8px 0', color: '#0F2A1D' }}>{partner.name}</h3>
                      {partner.address && (
                        <p style={{ margin: '4px 0', color: '#689071', fontSize: 12 }}>
                          <EnvironmentOutlined /> {partner.address}
                        </p>
                      )}
                      {partner.phone && (
                        <p style={{ margin: '4px 0', color: '#689071', fontSize: 12 }}>
                          <PhoneOutlined /> {partner.phone}
                        </p>
                      )}
                      {partner.category && (
                        <Tag color="green" style={{ marginTop: 8 }}>
                          {partner.category}
                        </Tag>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </Card>

      {/* Модальное окно с деталями партнера */}
      <Modal
        title={selectedPartner?.name || t('partners.details', 'Детали партнера')}
        open={!!selectedPartner}
        onCancel={() => setSelectedPartner(null)}
        footer={[
          <Button key="close" onClick={() => setSelectedPartner(null)}>
            {t('common.close', 'Закрыть')}
          </Button>,
          <Button
            key="route"
            type="primary"
            icon={<TeamOutlined />}
            onClick={() => {
              if (selectedPartner?.latitude && selectedPartner?.longitude) {
                // Генерируем варианты маршрутов
                const startPoint: [number, number] = mapCenter;
                const endPoint: [number, number] = [selectedPartner.latitude, selectedPartner.longitude];
                
                // Вычисляем расстояние (упрощенная формула)
                const latDiff = endPoint[0] - startPoint[0];
                const lonDiff = endPoint[1] - startPoint[1];
                const distance = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff) * 111; // примерное расстояние в км
                
                // Генерируем варианты маршрутов
                const options: RouteOption[] = [
                  {
                    id: 1,
                    type: 'bus',
                    name: 'На автобусе',
                    duration: Math.round(distance * 3 + Math.random() * 10), // 3 минуты на км + случайность
                    distance: Math.round(distance * 10) / 10,
                    buses: ['15', '28', '107'],
                    transfers: 0,
                    cost: 15,
                  },
                  {
                    id: 2,
                    type: 'bus',
                    name: 'На автобусе с пересадкой',
                    duration: Math.round(distance * 4 + Math.random() * 15),
                    distance: Math.round(distance * 10) / 10,
                    buses: ['5', '12'],
                    transfers: 1,
                    cost: 30,
                  },
                  {
                    id: 3,
                    type: 'walk',
                    name: 'Пешком',
                    duration: Math.round(distance * 12), // 12 минут на км
                    distance: Math.round(distance * 10) / 10,
                    cost: 0,
                  },
                  {
                    id: 4,
                    type: 'taxi',
                    name: 'На такси',
                    duration: Math.round(distance * 2 + Math.random() * 5),
                    distance: Math.round(distance * 10) / 10,
                    cost: Math.round(distance * 50 + Math.random() * 100),
                  },
                ];
                
                setRouteOptions(options);
                setShowRouteModal(true);
              }
            }}
            style={{ backgroundColor: '#689071', borderColor: '#689071' }}
          >
            {t('partners.buildRoute', 'Построить маршрут')}
          </Button>,
        ]}
        width={600}
      >
        {selectedPartner && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label={t('partners.name', 'Название')}>
              {selectedPartner.name}
            </Descriptions.Item>
            {selectedPartner.address && (
              <Descriptions.Item label={t('partners.address', 'Адрес')}>
                <Space>
                  <EnvironmentOutlined />
                  {selectedPartner.address}
                </Space>
              </Descriptions.Item>
            )}
            {selectedPartner.phone && (
              <Descriptions.Item label={t('partners.phone', 'Телефон')}>
                <Space>
                  <PhoneOutlined />
                  {selectedPartner.phone}
                </Space>
              </Descriptions.Item>
            )}
            {selectedPartner.email && (
              <Descriptions.Item label={t('partners.email', 'Email')}>
                <Space>
                  <MailOutlined />
                  {selectedPartner.email}
                </Space>
              </Descriptions.Item>
            )}
            {selectedPartner.category && (
              <Descriptions.Item label={t('partners.category', 'Категория')}>
                <Tag color="green">{selectedPartner.category}</Tag>
              </Descriptions.Item>
            )}
            <Descriptions.Item label={t('partners.status', 'Статус')}>
              <Tag color={selectedPartner.status === 'active' ? 'green' : 'orange'}>
                {selectedPartner.status === 'active' 
                  ? t('partners.approved', 'Активен')
                  : t('partners.pending', 'На проверке')}
              </Tag>
            </Descriptions.Item>
            {selectedPartner.latitude && selectedPartner.longitude && (
              <Descriptions.Item label={t('partners.coordinates', 'Координаты')}>
                {selectedPartner.latitude.toFixed(6)}, {selectedPartner.longitude.toFixed(6)}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      {/* Модальное окно с вариантами маршрутов */}
      <Modal
        title={
          <Space>
            <TeamOutlined style={{ color: '#689071' }} />
            <span>{t('partners.routeOptions', 'Варианты маршрута')}</span>
          </Space>
        }
        open={showRouteModal}
        onCancel={() => {
          setShowRouteModal(false);
          setRouteOptions([]);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setShowRouteModal(false);
            setRouteOptions([]);
          }}>
            {t('common.close', 'Закрыть')}
          </Button>,
        ]}
        width={600}
      >
        {routeOptions.length > 0 ? (
          <List
            dataSource={routeOptions}
            renderItem={(option) => (
              <List.Item
                style={{
                  cursor: 'pointer',
                  padding: '16px',
                  borderRadius: 8,
                  marginBottom: 12,
                  border: '1px solid #E3EED4',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#F0F7EB';
                  e.currentTarget.style.borderColor = '#689071';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = '#E3EED4';
                }}
                onClick={() => {
                  // Применяем выбранный маршрут
                  if (selectedPartner?.latitude && selectedPartner?.longitude) {
                    const startPoint: [number, number] = mapCenter;
                    const endPoint: [number, number] = [selectedPartner.latitude, selectedPartner.longitude];
                    
                    // Создаем путь маршрута
                    const path: [number, number][] = [
                      startPoint,
                      [startPoint[0] + (endPoint[0] - startPoint[0]) * 0.3, startPoint[1] + (endPoint[1] - startPoint[1]) * 0.3],
                      [startPoint[0] + (endPoint[0] - startPoint[0]) * 0.7, startPoint[1] + (endPoint[1] - startPoint[1]) * 0.7],
                      endPoint
                    ];
                    
                    setRoutePath(path);
                    setShowRoute(true);
                    setMapCenter(endPoint);
                    setMapZoom(14);
                    setShowRouteModal(false);
                    message.success(t('partners.routeShown', 'Маршрут показан на карте'));
                  }
                }}
              >
                <List.Item.Meta
                  avatar={
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: option.type === 'bus' ? '#689071' : option.type === 'walk' ? '#AEC380' : '#ff9800',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: 20,
                    }}>
                      {option.type === 'bus' ? <TeamOutlined /> : option.type === 'walk' ? <UserOutlined /> : <CarOutlined />}
                    </div>
                  }
                  title={
                    <Space>
                      <Typography.Text strong style={{ color: '#0F2A1D' }}>
                        {option.name}
                      </Typography.Text>
                      {option.transfers !== undefined && option.transfers > 0 && (
                        <Tag color="orange">
                          {option.transfers} {t('partners.transfer', 'пересадка')}
                        </Tag>
                      )}
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <Space>
                        <ClockCircleOutlined style={{ color: '#689071' }} />
                        <span style={{ color: '#0F2A1D' }}>
                          {option.duration} {t('partners.minutes', 'мин')}
                        </span>
                        <SwapRightOutlined style={{ color: '#689071', margin: '0 8px' }} />
                        <span style={{ color: '#0F2A1D' }}>
                          {option.distance} {t('partners.km', 'км')}
                        </span>
                      </Space>
                      {option.buses && option.buses.length > 0 && (
                        <Space wrap>
                          <TeamOutlined style={{ color: '#689071' }} />
                          {option.buses.map((bus, idx) => (
                            <Tag key={idx} color="green" style={{ margin: 0 }}>
                              {bus}
                            </Tag>
                          ))}
                        </Space>
                      )}
                      {option.cost !== undefined && (
                        <span style={{ color: '#689071', fontWeight: 500 }}>
                          {option.cost > 0 ? `${option.cost} ${t('partners.som', 'сом')}` : t('partners.free', 'Бесплатно')}
                        </span>
                      )}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty description={t('partners.noRoutes', 'Маршруты не найдены')} />
        )}
      </Modal>
    </div>
  );
};

