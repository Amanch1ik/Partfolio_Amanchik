import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, Select, Input, Space, Button, Tag, message, Modal, Descriptions, List, Typography, Empty, Segmented, Switch, Slider, Statistic, Row, Col } from 'antd';
import { SearchOutlined, EnvironmentOutlined, PhoneOutlined, MailOutlined, CarOutlined, ClockCircleOutlined, SwapRightOutlined, TeamOutlined, UserOutlined, StarOutlined, StarFilled, DownloadOutlined, FileImageOutlined, FilePdfOutlined, BarChartOutlined, EyeOutlined, WifiOutlined } from '@ant-design/icons';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, CircleMarker, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { t } from '@/i18n';
import { api, adminApi } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import '../styles/animations.css';
import { buildOsrmRoute, buildTransitRouteGraphHopper, buildTransitViaBackend, formatDistance, formatDuration, RouteResult } from '@/services/mapService';
import { Link } from 'react-router-dom';

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
  const [selectedPartnerFilter, setSelectedPartnerFilter] = useState<number | 'all'>('all'); // Фильтр по партнеру
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [showRoute, setShowRoute] = useState(false);
  const [routePath, setRoutePath] = useState<[number, number][]>([]);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [routeMode, setRouteMode] = useState<'driving' | 'walking' | 'cycling' | 'transit'>('driving');
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeOptions, setRouteOptions] = useState<RouteOption[]>([]);
  const [showRouteModal, setShowRouteModal] = useState(false);
  // Кластеризацию временно отключаем логически (на карте), но оставляем переключатель,
  // чтобы UI не ломать. Значение сейчас ни на что не влияет.
  const [clusteringEnabled, setClusteringEnabled] = useState(false);
  const [radiusSearchEnabled, setRadiusSearchEnabled] = useState(false);
  const [searchRadius, setSearchRadius] = useState(5); // в км
  const [favorites, setFavorites] = useState<number[]>([]);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapLayer, setHeatmapLayer] = useState<any>(null);
  const mapRef = useRef<any>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationRadius, setNotificationRadius] = useState(2); // км для уведомлений
  const [lastPartnersCount, setLastPartnersCount] = useState(0);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineMode, setOfflineMode] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any>({
    partnerViews: {},
    routeRequests: 0,
    totalClicks: 0,
    sessionStart: Date.now(),
    dailyStats: {}
  });

  // Загрузка партнеров с поддержкой offline режима
  const { data: partnersResponse, isError } = useQuery({
    queryKey: ['partners', 'map'],
    queryFn: async () => {
      try {
        const response = await api.partnersApi.getAll();
        // Обработка PaginatedResponse
        let partners = [];
        if (response?.data?.items) {
          partners = response.data.items;
        } else if (Array.isArray(response?.data)) {
          partners = response.data;
        }

        // Сохраняем в localStorage для offline режима
        localStorage.setItem('cached_partners', JSON.stringify(partners));
        return partners;
      } catch (error) {
        // При ошибке сети пытаемся загрузить из кеша
        const cached = localStorage.getItem('cached_partners');
        if (cached) {
          console.log('Loading partners from cache (offline mode)');
          return JSON.parse(cached);
        }
        throw error;
      }
    },
    retry: (failureCount, error) => {
      // Повторяем запрос только при сетевых ошибках
      return failureCount < 2 && error?.message?.includes('network');
    },
  });

  const partners: Partner[] = (partnersResponse || []).map((p: any) => ({
    id: p.id,
    name: p.name || t('partners.defaultName', 'Глобус'),
    email: p.email,
    phone: p.phone,
    category: p.category || 'general',
    status: p.status || 'active',
    latitude: typeof p.latitude === 'number' ? p.latitude : undefined,
    longitude: typeof p.longitude === 'number' ? p.longitude : undefined,
    address: p.address || t('partners.defaultName', 'Глобус'),
  }));

  // Локации партнеров (для отображения на карте) с поддержкой offline
  const { data: partnerLocationsResponse } = useQuery({
    queryKey: ['partners', 'locations'],
    queryFn: async () => {
      try {
        const resp = await adminApi.getPartnerLocations();
        const locations = Array.isArray(resp?.data) ? resp.data : [];

        // Сохраняем в localStorage для offline режима
        localStorage.setItem('cached_partner_locations', JSON.stringify(locations));
        return locations;
      } catch (error) {
        // При ошибке сети пытаемся загрузить из кеша
        const cached = localStorage.getItem('cached_partner_locations');
        if (cached) {
          console.log('Loading partner locations from cache (offline mode)');
          return JSON.parse(cached);
        }
        return [];
      }
    },
    retry: (failureCount, error) => {
      // Повторяем запрос только при сетевых ошибках
      return failureCount < 2 && error?.message?.includes('network');
    },
  });

  const partnerLocations: any[] = useMemo(() => {
    return Array.isArray(partnerLocationsResponse) ? partnerLocationsResponse : [];
  }, [partnerLocationsResponse]);

  // Фильтрация партнеров
  const filteredPartners = useMemo(() => {
    return partners.filter((partner) => {
      const matchesCategory = !selectedCategory || partner.category === selectedCategory;
      const matchesSearch = !searchText ||
        partner.name.toLowerCase().includes(searchText.toLowerCase()) ||
        partner.address?.toLowerCase().includes(searchText.toLowerCase());
      const matchesPartnerFilter = selectedPartnerFilter === 'all' || partner.id === selectedPartnerFilter;

      // Фильтр по радиусу поиска
      let matchesRadius = true;
      if (radiusSearchEnabled && userLocation && partner.latitude && partner.longitude) {
        const distance = calculateDistance(
          userLocation[0], userLocation[1],
          partner.latitude, partner.longitude
        );
        matchesRadius = distance <= searchRadius;
      }

      // Фильтр по избранным
      const matchesFavorites = !showOnlyFavorites || isFavorite(partner.id);

      return matchesCategory && matchesSearch && matchesPartnerFilter && matchesRadius && matchesFavorites;
    });
  }, [partners, selectedCategory, searchText, selectedPartnerFilter, radiusSearchEnabled, searchRadius, userLocation, showOnlyFavorites, favorites]);

  // Фильтрация локаций по выбранному партнеру
  const filteredLocations = useMemo(() => {
    return selectedPartnerFilter === 'all' 
      ? partnerLocations 
      : partnerLocations.filter((loc: any) => loc.partner_id === selectedPartnerFilter);
  }, [partnerLocations, selectedPartnerFilter]);

  // Уникальные категории
  const categories = Array.from(new Set(partners.map(p => p.category).filter(Boolean)));

  // Функция расчета расстояния между двумя точками (в км)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Радиус Земли в км
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleMarkerClick = (partner: Partner) => {
    setSelectedPartner(partner);
    trackPartnerView(partner.id, partner.name);
    if (partner.latitude && partner.longitude) {
      setMapCenter([partner.latitude, partner.longitude]);
      setMapZoom(15);
      setShowRoute(false);
      setRoutePath([]);
      setRouteInfo(null);
      setRouteResult(null);
    }
  };

  const handlePartnerSelect = (partnerId: number) => {
    const partner = partners.find(p => p.id === partnerId);
    if (partner) {
      handleMarkerClick(partner);
    }
  };

  // Загрузка избранных и аналитики из localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('partner_favorites');
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch (error) {
        console.error('Error loading favorites:', error);
      }
    }

    loadAnalyticsFromStorage();
  }, []);

  // Сохранение аналитики перед уходом
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveAnalyticsToStorage();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [analyticsData]);

  // Сохранение избранных в localStorage
  const saveFavorites = (newFavorites: number[]) => {
    localStorage.setItem('partner_favorites', JSON.stringify(newFavorites));
    setFavorites(newFavorites);
  };

  // Функции управления избранными
  const toggleFavorite = (partnerId: number) => {
    const isCurrentlyFavorite = favorites.includes(partnerId);
    const newFavorites = isCurrentlyFavorite
      ? favorites.filter(id => id !== partnerId)
      : [...favorites, partnerId];

    // Отслеживаем изменение статуса избранного
    trackFavoriteToggle(partnerId, !isCurrentlyFavorite);
    saveFavorites(newFavorites);
  };

  const isFavorite = (partnerId: number) => favorites.includes(partnerId);

  // Функции экспорта карты
  const exportMapAsImage = async () => {
    setExporting(true);
    try {
      const mapElement = document.querySelector('.leaflet-container') as HTMLElement;
      if (!mapElement) {
        message.error(t('partners.exportError', 'Не удалось найти карту для экспорта'));
        return;
      }

      const canvas = await html2canvas(mapElement, {
        useCORS: true,
        allowTaint: false,
        scale: 2,
        width: mapElement.offsetWidth,
        height: mapElement.offsetHeight,
      });

      const link = document.createElement('a');
      link.download = `partners-map-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      message.success(t('partners.exportSuccess', 'Карта успешно экспортирована'));
    } catch (error) {
      console.error('Export error:', error);
      message.error(t('partners.exportError', 'Ошибка при экспорте карты'));
    } finally {
      setExporting(false);
    }
  };

  const exportMapAsPDF = async () => {
    setExporting(true);
    try {
      const mapElement = document.querySelector('.leaflet-container') as HTMLElement;
      if (!mapElement) {
        message.error(t('partners.exportError', 'Не удалось найти карту для экспорта'));
        return;
      }

      const canvas = await html2canvas(mapElement, {
        useCORS: true,
        allowTaint: false,
        scale: 1.5,
        width: mapElement.offsetWidth,
        height: mapElement.offsetHeight,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`partners-map-${new Date().toISOString().split('T')[0]}.pdf`);

      message.success(t('partners.exportSuccess', 'Карта успешно экспортирована в PDF'));
    } catch (error) {
      console.error('PDF export error:', error);
      message.error(t('partners.exportError', 'Ошибка при экспорте карты'));
    } finally {
      setExporting(false);
    }
  };

  // Функции для push-уведомлений
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      message.warning(t('partners.notificationsNotSupported', 'Уведомления не поддерживаются в этом браузере'));
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      message.error(t('partners.notificationsDenied', 'Уведомления заблокированы. Разрешите их в настройках браузера'));
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      message.success(t('partners.notificationsEnabled', 'Уведомления включены'));
      return true;
    } else {
      message.error(t('partners.notificationsDenied', 'Уведомления отклонены'));
      return false;
    }
  };

  const sendNotification = (title: string, body: string, icon?: string) => {
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: icon || '/app-icon.svg',
        tag: 'partner-notification', // группировка уведомлений
      });

      // Автоматически закрываем уведомление через 5 секунд
      setTimeout(() => {
        notification.close();
      }, 5000);
    }
  };

  const checkForNewNearbyPartners = (partners: any[]) => {
    if (!notificationsEnabled || !userLocation) return;

    const currentCount = partners.length;
    const newPartners = currentCount - lastPartnersCount;

    if (newPartners > 0 && lastPartnersCount > 0) {
      // Находим новых партнеров поблизости
      const nearbyNewPartners = partners
        .filter(partner => {
          if (!partner.latitude || !partner.longitude) return false;
          const distance = calculateDistance(
            userLocation[0], userLocation[1],
            partner.latitude, partner.longitude
          );
          return distance <= notificationRadius;
        })
        .slice(-newPartners); // берем только новых

      if (nearbyNewPartners.length > 0) {
        const partnerNames = nearbyNewPartners.map(p => p.name).join(', ');
        sendNotification(
          t('partners.newPartnersNearby', 'Новые партнеры поблизости'),
          `${nearbyNewPartners.length} ${t('partners.newPartnersFound', 'новых партнеров в радиусе')} ${notificationRadius} ${t('partners.km', 'км')}: ${partnerNames}`,
          '/favicon.ico'
        );
      }
    }

    setLastPartnersCount(currentCount);
  };

  // Функции аналитики посещаемости
  const trackPartnerView = (partnerId: number, partnerName: string) => {
    if (!analyticsEnabled) return;

    setAnalyticsData(prev => ({
      ...prev,
      partnerViews: {
        ...prev.partnerViews,
        [partnerId]: {
          name: partnerName,
          views: (prev.partnerViews[partnerId]?.views || 0) + 1,
          lastViewed: Date.now(),
          coordinates: partners.find(p => p.id === partnerId)?.latitude && partners.find(p => p.id === partnerId)?.longitude
            ? [partners.find(p => p.id === partnerId)?.latitude, partners.find(p => p.id === partnerId)?.longitude]
            : null
        }
      },
      totalClicks: prev.totalClicks + 1
    }));
  };

  const trackRouteRequest = (partnerId: number, partnerName: string) => {
    if (!analyticsEnabled) return;

    setAnalyticsData(prev => ({
      ...prev,
      routeRequests: prev.routeRequests + 1,
      partnerViews: {
        ...prev.partnerViews,
        [partnerId]: {
          ...prev.partnerViews[partnerId],
          routes: (prev.partnerViews[partnerId]?.routes || 0) + 1,
          lastRoute: Date.now()
        }
      }
    }));
  };

  const trackFavoriteToggle = (partnerId: number, isFavorite: boolean) => {
    if (!analyticsEnabled) return;

    setAnalyticsData(prev => ({
      ...prev,
      partnerViews: {
        ...prev.partnerViews,
        [partnerId]: {
          ...prev.partnerViews[partnerId],
          favorited: isFavorite,
          favoriteTime: isFavorite ? Date.now() : null
        }
      }
    }));
  };

  const saveAnalyticsToStorage = () => {
    const dataToSave = {
      ...analyticsData,
      sessionEnd: Date.now(),
      sessionDuration: Date.now() - analyticsData.sessionStart
    };
    localStorage.setItem('partner_analytics', JSON.stringify(dataToSave));
  };

  const loadAnalyticsFromStorage = () => {
    const saved = localStorage.getItem('partner_analytics');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setAnalyticsData(prev => ({
          ...prev,
          ...data,
          sessionStart: Date.now() // новый сеанс
        }));
      } catch (error) {
        console.error('Error loading analytics:', error);
      }
    }
  };

  const getAnalyticsSummary = () => {
    const views = Object.values(analyticsData.partnerViews) as any[];
    const totalViews = views.reduce((sum, p) => sum + (p.views || 0), 0);
    const uniquePartners = views.length;
    const mostViewed = views.sort((a, b) => (b.views || 0) - (a.views || 0))[0];
    const routesRequested = analyticsData.routeRequests;

    return {
      totalViews,
      uniquePartners,
      routesRequested,
      mostViewed: mostViewed ? { name: mostViewed.name, views: mostViewed.views } : null,
      sessionDuration: Math.round((Date.now() - analyticsData.sessionStart) / 1000 / 60) // в минутах
    };
  };

  // Функции offline режима
  const clearCache = () => {
    localStorage.removeItem('cached_partners');
    localStorage.removeItem('cached_partner_locations');
    localStorage.removeItem('partner_favorites');
    localStorage.removeItem('partner_analytics');
    message.success(t('partners.cacheCleared', 'Кеш очищен'));
  };

  const getCacheInfo = () => {
    const partnersCache = localStorage.getItem('cached_partners');
    const locationsCache = localStorage.getItem('cached_partner_locations');
    const favoritesCache = localStorage.getItem('partner_favorites');
    const analyticsCache = localStorage.getItem('partner_analytics');

    return {
      partnersCount: partnersCache ? JSON.parse(partnersCache).length : 0,
      locationsCount: locationsCache ? JSON.parse(locationsCache).length : 0,
      hasFavorites: !!favoritesCache,
      hasAnalytics: !!analyticsCache,
    };
  };

  // Геолокация пользователя
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        if (!selectedPartner) {
          setMapCenter(coords);
          setMapZoom(14);
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, [selectedPartner]);

  // Управление heatmap слоем
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    if (showHeatmap) {
      // Создаем данные для heatmap из координат партнеров
      const heatmapData = filteredPartners
        .filter(partner => partner.latitude && partner.longitude)
        .map(partner => [partner.latitude!, partner.longitude!, 0.5]); // [lat, lng, intensity]

      // Добавляем локации партнеров для большей плотности
      filteredLocations.forEach((loc: any) => {
        if (loc.latitude && loc.longitude) {
          heatmapData.push([loc.latitude, loc.longitude, 0.3]);
        }
      });

      if (heatmapData.length > 0) {
        const heatLayer = (L as any).heatLayer(heatmapData, {
          radius: 25,
          blur: 15,
          maxZoom: 18,
          max: 1.0,
          gradient: {
            0.2: '#00ff00',
            0.4: '#ffff00',
            0.6: '#ff8000',
            0.8: '#ff4000',
            1.0: '#ff0000'
          }
        });

        heatLayer.addTo(map);
        setHeatmapLayer(heatLayer);
      }
    } else {
      // Удаляем heatmap слой
      if (heatmapLayer) {
        map.removeLayer(heatmapLayer);
        setHeatmapLayer(null);
      }
    }

    return () => {
      if (heatmapLayer) {
        map.removeLayer(heatmapLayer);
      }
    };
  }, [showHeatmap, filteredPartners, filteredLocations]);

  // Отслеживание новых партнеров для уведомлений
  useEffect(() => {
    checkForNewNearbyPartners(filteredPartners);
  }, [filteredPartners, notificationsEnabled, userLocation, notificationRadius]);

  // Отслеживание статуса подключения к интернету
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      message.success(t('partners.onlineBack', 'Подключение восстановлено'));
    };

    const handleOffline = () => {
      setIsOnline(false);
      message.warning(t('partners.offlineMode', 'Работа в offline режиме'));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Построение маршрута
  const buildRouteToPartner = async () => {
    if (!selectedPartner?.latitude || !selectedPartner?.longitude) {
      message.warning(t('partners.selectPartnerFirst', 'Выберите партнера на карте'));
      return;
    }

    // Отслеживаем запрос маршрута
    if (selectedPartner) {
      trackRouteRequest(selectedPartner.id, selectedPartner.name);
    }
    let start = userLocation ?? mapCenter;
    const end: [number, number] = [selectedPartner.latitude, selectedPartner.longitude];
    // Если старт и финиш совпадают (или очень близко), слегка сместим старт,
    // чтобы провайдер маршрутов вернул линию, а не пустой результат
    const close = (a: [number, number], b: [number, number]) =>
      Math.abs(a[0] - b[0]) < 0.0001 && Math.abs(a[1] - b[1]) < 0.0001;
    if (close(start, end)) {
      start = [end[0] + 0.0005, end[1] + 0.0005];
    }
    setRouteLoading(true);
    try {
      let result: RouteResult | null = null;
      if (routeMode === 'transit') {
        // Сначала пробуем через backend-прокси
        result = await buildTransitViaBackend(start, end);
        if (!result) {
          // Фоллбек на прямой GraphHopper если задан ключ на клиенте
          result = await buildTransitRouteGraphHopper(start, end, 'ru');
          if (!result) {
            message.warning(t('partners.noTransitKey', 'Транспорт недоступен: провайдер не настроен'));
          }
        }
      } else {
        result = await buildOsrmRoute(start, end, routeMode);
      }
      if (result && result.geometry?.length) {
        setRoutePath(result.geometry);
        setShowRoute(true);
        setMapCenter(end);
        setMapZoom(14);
        setRouteInfo({
          distance: formatDistance(result.distance),
          duration: formatDuration(result.duration),
        });
        setRouteResult(result);
        message.success(t('partners.routeShown', 'Маршрут показан на карте'));
      } else {
        setShowRoute(false);
        setRoutePath([]);
        setRouteInfo(null);
        message.error(t('partners.routeBuildFailed', 'Не удалось построить маршрут'));
      }
    } finally {
      setRouteLoading(false);
    }
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
              {t('partners.map', 'Карта партнеров')}
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', margin: '8px 0 0 0' }}>
              {t('partners.mapDescription', 'Просмотр партнеров на карте и построение маршрутов')}
            </p>
          </div>
          <Space>
            <Tag
              color={isOnline ? 'success' : 'error'}
              icon={isOnline ? <WifiOutlined /> : <WifiOutlined style={{ color: 'var(--color-error)' }} />}
            >
              {isOnline ? t('partners.online', 'Онлайн') : t('partners.offline', 'Оффлайн')}
            </Tag>
            {!isOnline && (
              <Button
                size="small"
                type="primary"
                onClick={() => window.location.reload()}
              >
                {t('partners.retry', 'Повторить')}
              </Button>
            )}
          </Space>
        </div>
      </div>

      {/* Фильтры */}
      <Card
        style={{
          borderRadius: 16,
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          boxShadow: 'var(--card-shadow)',
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
            filterOption={(input, option) => {
              const children = option?.children;
              const text = typeof children === 'string' ? children : String(children || '');
              return text.toLowerCase().includes(input.toLowerCase());
            }}
          >
            {partners.map(partner => (
              <Select.Option key={partner.id} value={partner.id}>
                {partner.name}
              </Select.Option>
            ))}
          </Select>
          <Select
            placeholder={t('partners.filterByPartner', 'Фильтр по партнеру')}
            value={selectedPartnerFilter}
            onChange={(value) => {
              setSelectedPartnerFilter(value);
              setSelectedPartner(null);
              if (value === 'all') {
                setMapCenter(DEFAULT_CENTER);
                setMapZoom(DEFAULT_ZOOM);
              } else {
                const partner = partners.find(p => p.id === value);
                if (partner?.latitude && partner?.longitude) {
                  setMapCenter([partner.latitude, partner.longitude]);
                  setMapZoom(14);
                }
              }
            }}
            style={{ width: 250 }}
          >
            <Select.Option value="all">{t('partners.showAll', 'Показать всех партнеров')}</Select.Option>
            {partners.map(partner => (
              <Select.Option key={partner.id} value={partner.id}>
                {partner.name}
              </Select.Option>
            ))}
          </Select>
          <div style={{ flex: 1 }} />
          <Segmented
            value={routeMode}
            onChange={(v) => setRouteMode(v as any)}
            options={(() => {
              const base = [
                { label: t('route.drive', 'Авто'), value: 'driving' },
                { label: t('route.walk', 'Пешком'), value: 'walking' },
                { label: t('route.bike', 'Вело'), value: 'cycling' },
              ];
              const transitEnabled = (import.meta as any).env?.VITE_TRANSIT_ENABLED !== 'false';
              return transitEnabled ? [...base, { label: t('route.transit', 'Транспорт'), value: 'transit' }] : base;
            })()}
          />
          <Button
            type="primary"
            loading={routeLoading}
            onClick={buildRouteToPartner}
            disabled={!selectedPartner}
            style={{ background: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
          >
            {t('partners.buildRoute', 'Построить маршрут')}
          </Button>
          <Link to="/partners/locations">
            <Button>
              {t('partners.manageLocations', 'Управление точками')}
            </Button>
          </Link>
          <Space.Compact>
            <Button
              icon={<FileImageOutlined />}
              loading={exporting}
              onClick={exportMapAsImage}
              title={t('partners.exportImage', 'Экспорт в PNG')}
            >
              PNG
            </Button>
            <Button
              icon={<FilePdfOutlined />}
              loading={exporting}
              onClick={exportMapAsPDF}
              title={t('partners.exportPDF', 'Экспорт в PDF')}
            >
              PDF
            </Button>
          </Space.Compact>
          <Button
            icon={<BarChartOutlined />}
            onClick={() => setShowAnalytics(true)}
            title={t('partners.showAnalytics', 'Показать аналитику')}
          >
            {t('partners.analytics', 'Аналитика')}
          </Button>
          <Space>
            <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
              {t('partners.offlineMode', 'Offline режим')}:
            </span>
            <Switch
              checked={offlineMode}
              onChange={setOfflineMode}
              checkedChildren={t('common.on', 'Вкл')}
              unCheckedChildren={t('common.off', 'Выкл')}
            />
          </Space>
          <Space>
            <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
              {t('partners.clustering', 'Кластеризация')}:
            </span>
            <Switch
              checked={clusteringEnabled}
              onChange={setClusteringEnabled}
              checkedChildren={t('common.on', 'Вкл')}
              unCheckedChildren={t('common.off', 'Выкл')}
            />
          </Space>
          <Space>
            <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
              {t('partners.radiusSearch', 'Радиус поиска')}:
            </span>
            <Switch
              checked={radiusSearchEnabled}
              onChange={(checked) => {
                setRadiusSearchEnabled(checked);
                if (checked && userLocation) {
                  setMapCenter(userLocation);
                  setMapZoom(13);
                }
              }}
              checkedChildren={t('common.on', 'Вкл')}
              unCheckedChildren={t('common.off', 'Выкл')}
            />
          </Space>
          {radiusSearchEnabled && (
            <Space direction="vertical" size={0}>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                {searchRadius} км
              </span>
              <Slider
                min={1}
                max={20}
                value={searchRadius}
                onChange={setSearchRadius}
                style={{ width: 120 }}
                tooltip={{ open: false }}
              />
            </Space>
          )}
          <Space>
            <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
              {t('partners.showFavorites', 'Избранные')}:
            </span>
            <Switch
              checked={showOnlyFavorites}
              onChange={setShowOnlyFavorites}
              checkedChildren={t('common.on', 'Вкл')}
              unCheckedChildren={t('common.off', 'Выкл')}
            />
          </Space>
          <Space>
            <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
              {t('partners.showHeatmap', 'Тепловая карта')}:
            </span>
            <Switch
              checked={showHeatmap}
              onChange={setShowHeatmap}
              checkedChildren={t('common.on', 'Вкл')}
              unCheckedChildren={t('common.off', 'Выкл')}
            />
          </Space>
          <Space>
            <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
              {t('partners.notifications', 'Уведомления')}:
            </span>
            <Switch
              checked={notificationsEnabled}
              onChange={async (checked) => {
                if (checked) {
                  const granted = await requestNotificationPermission();
                  setNotificationsEnabled(granted);
                } else {
                  setNotificationsEnabled(false);
                }
              }}
              checkedChildren={t('common.on', 'Вкл')}
              unCheckedChildren={t('common.off', 'Выкл')}
            />
          </Space>
          {notificationsEnabled && (
            <Space direction="vertical" size={0}>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                {t('partners.notificationRadius', 'Радиус уведомлений')}: {notificationRadius} км
              </span>
              <Slider
                min={1}
                max={10}
                value={notificationRadius}
                onChange={setNotificationRadius}
                style={{ width: 120 }}
                tooltip={{ open: false }}
              />
            </Space>
          )}
          <Tag color="green" style={{ fontSize: 14, padding: '4px 12px' }}>
            {t('partners.found', 'Найдено')}: {filteredPartners.length}
          </Tag>
        </Space>
      </Card>

      {/* Карта */}
      <Card
        style={{
          borderRadius: 16,
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          boxShadow: 'var(--card-shadow)',
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
            ref={mapRef}
          >
            <ChangeMapView center={mapCenter} zoom={mapZoom} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {userLocation && (
              <CircleMarker
                center={userLocation}
                radius={8}
                pathOptions={{ color: '#1890ff', fillColor: '#1890ff', fillOpacity: 0.8 }}
              />
            )}

            {/* Круг радиуса поиска */}
            {radiusSearchEnabled && userLocation && (
              <Circle
                center={userLocation}
                radius={searchRadius * 1000} // переводим км в метры
                pathOptions={{
                  color: '#689071',
                  fillColor: '#689071',
                  fillOpacity: 0.1,
                  weight: 2,
                  dashArray: '10, 10'
                }}
              />
            )}
            {/* Маршрут */}
            {showRoute && routePath.length > 0 && (
              <Polyline
                positions={routePath}
                pathOptions={{
                  color: routeMode === 'walking' ? '#AEC380' : routeMode === 'cycling' ? '#ff9800' : routeMode === 'transit' ? '#7C4DFF' : '#689071',
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
            
            {/* Маркеры партнеров */}
            <>
                {/* Локации партнеров - четко видны на карте */}
                {filteredLocations.map((loc: any) => {
                  if (!loc.latitude || !loc.longitude) return null;
                  const partner = partners.find(p => p.id === loc.partner_id);
                  return (
                    <Marker
                      key={`loc-${loc.id}`}
                      position={[loc.latitude, loc.longitude]}
                      icon={L.divIcon({
                        className: 'partner-location-marker',
                        html: `<div style="
                          width: 24px;
                          height: 24px;
                          background: ${loc.is_active ? '#52c41a' : '#d9d9d9'};
                          border: 3px solid white;
                          border-radius: 50%;
                          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                          display: flex;
                          align-items: center;
                          justify-content: center;
                        ">
                          <div style="
                            width: 8px;
                            height: 8px;
                            background: white;
                            border-radius: 50%;
                          "></div>
                        </div>`,
                        iconSize: [24, 24],
                        iconAnchor: [12, 12],
                      })}
                    >
                      <Popup>
                        <div style={{ minWidth: 200 }}>
                          <h3 style={{ margin: '0 0 8px 0', color: 'var(--color-text-primary)', fontWeight: 600 }}>
                            {partner?.name || t('partners.locationPoint', 'Точка партнера')}
                          </h3>
                          <p style={{ margin: '4px 0', color: 'var(--color-primary)', fontSize: 12 }}>
                            <EnvironmentOutlined /> {loc.address}
                          </p>
                          {loc.phone_number && (
                            <p style={{ margin: '4px 0', color: 'var(--color-primary)', fontSize: 12 }}>
                              <PhoneOutlined /> {loc.phone_number}
                            </p>
                          )}
                          <Tag color={loc.is_active ? 'green' : 'default'} style={{ marginTop: 8 }}>
                            {loc.is_active ? t('partners.locationActive', 'Активна') : t('partners.locationInactive', 'Неактивна')}
                          </Tag>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

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
                          <h3 style={{ margin: '0 0 8px 0', color: 'var(--color-text-primary)' }}>{partner.name}</h3>
                          {partner.address && (
                            <p style={{ margin: '4px 0', color: 'var(--color-primary)', fontSize: 12 }}>
                              <EnvironmentOutlined /> {partner.address}
                            </p>
                          )}
                          {partner.phone && (
                            <p style={{ margin: '4px 0', color: 'var(--color-primary)', fontSize: 12 }}>
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
              </>
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
          selectedPartner?.latitude && selectedPartner?.longitude ? (
            <Button
              key="gmaps"
              onClick={() => {
                const lat = selectedPartner.latitude!;
                const lon = selectedPartner.longitude!;
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`, '_blank');
              }}
            >
              Google Maps
            </Button>
          ) : null,
          selectedPartner?.latitude && selectedPartner?.longitude ? (
            <Button
              key="yandex"
              onClick={() => {
                const lat = selectedPartner.latitude!;
                const lon = selectedPartner.longitude!;
                window.open(`https://yandex.ru/maps/?rtext=~${lat},${lon}`, '_blank');
              }}
            >
              Yandex Maps
            </Button>
          ) : null,
          selectedPartner?.latitude && selectedPartner?.longitude ? (
            <Button
              key="2gis"
              onClick={() => {
                const lat = selectedPartner.latitude!;
                const lon = selectedPartner.longitude!;
                // Открываем 2GIS с координатами
                window.open(`https://2gis.kg/bishkek/search/${lat},${lon}`, '_blank');
              }}
              style={{ backgroundColor: '#4CAF50', borderColor: '#4CAF50', color: '#fff' }}
            >
              2GIS
            </Button>
          ) : null,
          <Button
            key="favorite"
            icon={selectedPartner && isFavorite(selectedPartner.id) ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
            onClick={() => selectedPartner && toggleFavorite(selectedPartner.id)}
            style={{ borderColor: '#faad14', color: '#faad14' }}
          >
            {selectedPartner && isFavorite(selectedPartner.id) ? t('partners.removeFavorite', 'Убрать из избранного') : t('partners.addFavorite', 'В избранное')}
          </Button>,
          <Button key="route" type="primary" icon={<TeamOutlined />} onClick={buildRouteToPartner} style={{ backgroundColor: '#689071', borderColor: '#689071' }}>
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

      {/* Информация по маршруту */}
      {showRoute && routeInfo && (
        <Card
          style={{
            marginTop: 16,
            borderRadius: 16,
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <Space size="large" wrap>
            <Space>
              <ClockCircleOutlined style={{ color: '#689071' }} />
              <span style={{ color: 'var(--color-text-primary)' }}>{routeInfo.duration}</span>
            </Space>
            <Space>
              <SwapRightOutlined style={{ color: '#689071' }} />
              <span style={{ color: 'var(--color-text-primary)' }}>{routeInfo.distance}</span>
            </Space>
            <Tag color="green">
              {routeMode === 'transit'
                ? t('route.transit', 'Транспорт')
                : routeMode === 'walking'
                  ? t('route.walk', 'Пешком')
                  : routeMode === 'cycling'
                    ? t('route.bike', 'Вело')
                    : t('route.drive', 'Авто')}
            </Tag>
            {routeResult?.provider && <Tag>{routeResult.provider}</Tag>}
          </Space>
        </Card>
      )}

      {/* Модальное окно аналитики */}
      <Modal
        title={t('partners.analytics', 'Аналитика посещаемости')}
        open={showAnalytics}
        onCancel={() => setShowAnalytics(false)}
        footer={[
          <Button key="close" onClick={() => setShowAnalytics(false)}>
            {t('common.close', 'Закрыть')}
          </Button>,
          <Button key="export" onClick={saveAnalyticsToStorage}>
            {t('common.export', 'Экспорт')}
          </Button>
        ]}
        width={800}
      >
        <div style={{ padding: '20px 0' }}>
          {(() => {
            const summary = getAnalyticsSummary();
            const topPartners = Object.values(analyticsData.partnerViews)
              .sort((a: any, b: any) => (b.views || 0) - (a.views || 0))
              .slice(0, 5);

            return (
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                {/* Общая статистика */}
                <Card size="small" title={t('partners.analyticsSummary', 'Общая статистика')}>
                  <Row gutter={16}>
                    <Col span={6}>
                      <Statistic
                        title={t('partners.totalViews', 'Просмотры')}
                        value={summary.totalViews}
                        prefix={<EyeOutlined />}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title={t('partners.uniquePartners', 'Уникальных партнеров')}
                        value={summary.uniquePartners}
                        prefix={<TeamOutlined />}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title={t('partners.routeRequests', 'Запросов маршрутов')}
                        value={summary.routesRequested}
                        prefix={<EnvironmentOutlined />}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title={t('partners.sessionTime', 'Время сессии')}
                        value={summary.sessionDuration}
                        suffix={t('partners.minutes', 'мин')}
                        prefix={<ClockCircleOutlined />}
                      />
                    </Col>
                  </Row>
                </Card>

                {/* Популярные партнеры */}
                {topPartners.length > 0 && (
                  <Card size="small" title={t('partners.popularPartners', 'Популярные партнеры')}>
                    <List
                      size="small"
                      dataSource={topPartners}
                      renderItem={(partner: any, index) => (
                        <List.Item>
                          <Space>
                            <Tag color={index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : 'blue'}>
                              #{index + 1}
                            </Tag>
                            <span>{partner.name}</span>
                            <Tag>{partner.views} {t('partners.views', 'просмотров')}</Tag>
                            {partner.favorited && <StarFilled style={{ color: '#faad14' }} />}
                          </Space>
                        </List.Item>
                      )}
                    />
                  </Card>
                )}

                {/* Настройки аналитики */}
                <Card size="small" title={t('partners.analyticsSettings', 'Настройки аналитики')}>
                  <Space>
                    <span>{t('partners.analyticsEnabled', 'Сбор статистики')}:</span>
                    <Switch
                      checked={analyticsEnabled}
                      onChange={setAnalyticsEnabled}
                      checkedChildren={t('common.on', 'Вкл')}
                      unCheckedChildren={t('common.off', 'Выкл')}
                    />
                  </Space>
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                    {t('partners.analyticsDescription', 'Отслеживание просмотров партнеров, запросов маршрутов и избранных')}
                  </div>
                </Card>

                {/* Offline режим */}
                <Card size="small" title={t('partners.offlineSettings', 'Offline режим')}>
                  {(() => {
                    const cacheInfo = getCacheInfo();
                    return (
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <div>
                          <strong>{t('partners.cacheStatus', 'Статус кеша')}:</strong>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                          • {t('partners.partners', 'Партнеры')}: {cacheInfo.partnersCount}<br/>
                          • {t('partners.locations', 'Локации')}: {cacheInfo.locationsCount}<br/>
                          • {t('partners.favorites', 'Избранные')}: {cacheInfo.hasFavorites ? '✅' : '❌'}<br/>
                          • {t('partners.analytics', 'Аналитика')}: {cacheInfo.hasAnalytics ? '✅' : '❌'}
                        </div>
                        <Space>
                          <Button size="small" onClick={clearCache}>
                            {t('partners.clearCache', 'Очистить кеш')}
                          </Button>
                          <Button size="small" type="primary" onClick={() => window.location.reload()}>
                            {t('partners.refreshData', 'Обновить данные')}
                          </Button>
                        </Space>
                        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 8 }}>
                          {t('partners.offlineDescription', 'При отключении интернета приложение будет работать с кешированными данными')}
                        </div>
                      </Space>
                    );
                  })()}
                </Card>
              </Space>
            );
          })()}
        </div>
      </Modal>
    </div>
  );
};

