import { useState } from 'react';
import { Card, Table, Button, Space, Select, Tag, message, Modal, Form } from 'antd';
import { DeleteButton } from '@/components/DeleteButton';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { toArray } from '../utils/arrayUtils';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { t } from '@/i18n';

// Fix Leaflet default icon
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

const DEFAULT_CENTER: [number, number] = [42.8746, 74.5698];

function ChangeMapView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useMapEvents({}); // ensure hook usage
  map.setView(center, zoom);
  return null;
}

export const PartnerLocationsPage = () => {
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | undefined>();
  const [address, setAddress] = useState<string>('');
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [zoom, setZoom] = useState<number>(13);
  const [form] = Form.useForm();

  // Load partners for selector
  const { data: partnersResp } = useQuery({
    queryKey: ['admin', 'partners', 'all'],
    queryFn: async () => {
      const resp = await api.partnersApi.getAll(1, 200);
      return resp?.data?.items || [];
    },
  });
  const partners = toArray<any>(partnersResp, []);

  // Load partner locations (all), filter client-side by selected partner
  const { data: locationsResp, refetch } = useQuery({
    queryKey: ['admin', 'partner-locations'],
    queryFn: async () => {
      try {
        const resp = await api.adminApi.getPartnerLocations();
        return toArray<any>(resp?.data, []);
      } catch {
        return [];
      }
    },
  });
  const allLocations: any[] = toArray<any>(locationsResp, []);
  const locations = selectedPartnerId ? allLocations.filter(l => l.partner_id === selectedPartnerId) : allLocations;

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 70 },
    { title: t('partners.name', 'Партнёр'), key: 'partner', render: (_: any, r: any) => partners.find((p: any) => p.id === r.partner_id)?.name || r.partner_id },
    { title: t('partners.address', 'Адрес'), dataIndex: 'address', key: 'address' },
    { title: 'Координаты', key: 'coords', render: (_: any, r: any) => r.latitude && r.longitude ? `${r.latitude.toFixed?.(6) || r.latitude}, ${r.longitude.toFixed?.(6) || r.longitude}` : '-' },
    { title: t('common.status', 'Статус'), key: 'is_active', render: (_: any, r: any) => <Tag color={r.is_active ? 'green' : 'default'}>{r.is_active ? t('common.active', 'Активна') : t('common.inactive', 'Неактивна')}</Tag> },
    {
      title: t('common.actions', 'Действие'),
      key: 'actions',
      width: 120,
      render: (_: any, r: any) => (
        <Space>
          <DeleteButton
            onDelete={async () => {
              try {
                await api.adminApi.deletePartnerLocation(r.id);
                message.success(t('common.deleted', 'Удалено'));
                refetch();
              } catch (e: any) {
                message.error(e?.response?.data?.detail || t('common.error', 'Ошибка'));
              }
            }}
            text=""
            className="danger compact icon-only"
            confirmTitle={t('common.deleteConfirm', 'Удалить?')}
            confirmContent={t('common.deleteWarning', 'Это действие нельзя отменить')}
            confirmOkText={t('common.delete', 'Удалить')}
            confirmCancelText={t('common.cancel', 'Отменить')}
          />
        </Space>
      )
    }
  ];

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
          {t('partners.locations', 'Локации партнёров')}
        </h1>
      </div>

      <Card
        style={{
          borderRadius: 16,
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          marginBottom: 16,
        }}
        className="hover-lift-green"
      >
        <Space wrap style={{ width: '100%' }}>
          <Select
            placeholder={t('partners.selectPartner', 'Выбрать партнёра')}
            value={selectedPartnerId}
            onChange={setSelectedPartnerId}
            style={{ width: 260 }}
            allowClear
          >
            {partners.map((p: any) => (
              <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
            ))}
          </Select>
          <div style={{ width: 400 }}>
            <AddressAutocomplete
              value={address}
              onSelectAddress={(opt) => {
                setAddress(opt.value);
                setCoords([opt.lat, opt.lon]);
              }}
              placeholder={t('partners.addressPlaceholder', 'Начните вводить адрес')}
            />
          </div>
          <Button
            type="primary"
            onClick={async () => {
              if (!selectedPartnerId) {
                message.warning(t('partners.selectPartnerFirst', 'Выберите партнёра'));
                return;
              }
              if (!coords) {
                message.warning(t('partners.enterAddress', 'Укажите адрес'));
                return;
              }
              try {
                await api.adminApi.createPartnerLocation(selectedPartnerId, {
                  address: address || 'Без адреса',
                  latitude: coords[0],
                  longitude: coords[1],
                } as any);
                message.success(t('partners.locationCreated', 'Точка добавлена'));
                setAddress('');
                setCoords(null);
                refetch();
              } catch (e: any) {
                message.error(e?.response?.data?.detail || t('common.error', 'Ошибка'));
              }
            }}
            style={{ backgroundColor: '#689071', borderColor: '#689071' }}
          >
            {t('partners.addPoint', 'Добавить точку')}
          </Button>
        </Space>
      </Card>

      <Card
        style={{
          borderRadius: 16,
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          marginBottom: 16,
        }}
        className="hover-lift-green"
      >
        <div style={{ height: 360, width: '100%' }}>
          <MapContainer
            center={coords || DEFAULT_CENTER}
            zoom={coords ? 15 : zoom}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom
          >
            <ChangeMapView center={coords || DEFAULT_CENTER} zoom={coords ? 15 : zoom} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {coords && (
              <Marker position={coords} />
            )}
          </MapContainer>
        </div>
      </Card>

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
            columns={columns as any}
            dataSource={locations}
            rowKey="id"
            pagination={{ pageSize: 20 }}
          />
        </Card>
    </div>
  );
};


