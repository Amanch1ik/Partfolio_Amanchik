import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Исправление иконок для Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { EnvironmentOutlined, PhoneOutlined, MailOutlined } from '@ant-design/icons';
import { Tag } from 'antd';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Компонент для изменения центра карты
function ChangeMapView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

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

interface LocationMapProps {
  locations: Location[];
  center: [number, number];
  zoom: number;
  onMarkerClick: (location: Location) => void;
}

export const LocationMap = ({ locations, center, zoom, onMarkerClick }: LocationMapProps) => {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%', zIndex: 1 }}
      scrollWheelZoom={true}
      key={`${center[0]}-${center[1]}-${zoom}`}
    >
      <ChangeMapView center={center} zoom={zoom} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {locations.map((location) => {
        if (!location.latitude || !location.longitude) return null;
        return (
          <Marker
            key={location.id}
            position={[location.latitude, location.longitude]}
            eventHandlers={{
              click: () => onMarkerClick(location),
            }}
          >
            <Popup>
              <div style={{ minWidth: 200 }}>
                <h3 style={{ margin: '0 0 8px 0', color: '#0F2A1D' }}>{location.name}</h3>
                {location.address && (
                  <p style={{ margin: '4px 0', color: '#689071', fontSize: 12 }}>
                    <EnvironmentOutlined /> {location.address}
                  </p>
                )}
                {location.phone && (
                  <p style={{ margin: '4px 0', color: '#689071', fontSize: 12 }}>
                    <PhoneOutlined /> {location.phone}
                  </p>
                )}
                {location.email && (
                  <p style={{ margin: '4px 0', color: '#689071', fontSize: 12 }}>
                    <MailOutlined /> {location.email}
                  </p>
                )}
                <Tag color={location.status === 'open' ? 'green' : 'default'} style={{ marginTop: 8 }}>
                  {location.status === 'open' ? '🟢 Открыто' : '🔴 Закрыто'}
                </Tag>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
};

