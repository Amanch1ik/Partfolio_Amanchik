import { useState, useEffect } from 'react';
import { AutoComplete, Input, Spin } from 'antd';
import { api } from '@/services/api';

interface AddressAutocompleteProps {
  value?: string;
  onSelectAddress?: (address: { label: string; value: string; lat: number; lon: number }) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  showExisting?: boolean; // Показывать существующие адреса из базы
}

export const AddressAutocomplete = ({ 
  value, 
  onSelectAddress, 
  placeholder = 'Начните вводить адрес', 
  style,
  showExisting = true 
}: AddressAutocompleteProps) => {
  const [searching, setSearching] = useState(false);
  const [options, setOptions] = useState<{ label: string; value: string; lat: number; lon: number }[]>([]);
  const [existingAddresses, setExistingAddresses] = useState<{ label: string; value: string; lat: number; lon: number }[]>([]);

  // Загружаем существующие адреса из базы
  useEffect(() => {
    if (showExisting) {
      const loadExisting = async () => {
        try {
          const resp = await api.adminApi.getPartnerLocations();
          const locations = Array.isArray(resp?.data) ? resp.data : [];
          const addresses = locations
            .filter((loc: any) => loc.address && loc.latitude && loc.longitude)
            .map((loc: any) => ({
              label: `${loc.address} (существующий)`,
              value: loc.address,
              lat: parseFloat(loc.latitude),
              lon: parseFloat(loc.longitude),
            }));
          setExistingAddresses(addresses);
        } catch (error) {
          console.error('Failed to load existing addresses:', error);
        }
      };
      loadExisting();
    }
  }, [showExisting]);

  const handleSearch = async (q: string) => {
    if (!q || q.length < 2) {
      // Показываем существующие адреса если запрос короткий
      if (q.length > 0 && existingAddresses.length > 0) {
        const filtered = existingAddresses.filter(addr => 
          addr.value.toLowerCase().includes(q.toLowerCase())
        );
        setOptions(filtered.slice(0, 5));
      } else {
        setOptions([]);
      }
      return;
    }
    
    setSearching(true);
    try {
      // Сначала ищем в существующих адресах
      const existingMatches = existingAddresses.filter(addr => 
        addr.value.toLowerCase().includes(q.toLowerCase())
      );

      // Затем ищем через OpenStreetMap
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=8&countrycodes=kg`,
        {
          headers: { 'User-Agent': 'YESS-AdminPanel/1.0' },
        }
      );
      const data = await response.json();
      const osmItems = data.map((item: any) => ({
        label: item.display_name,
        value: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
      }));

      // Объединяем: сначала существующие, потом новые
      setOptions([...existingMatches, ...osmItems].slice(0, 10));
    } catch (error) {
      console.error('Address search error:', error);
      // Показываем только существующие если ошибка
      const existingMatches = existingAddresses.filter(addr => 
        addr.value.toLowerCase().includes(q.toLowerCase())
      );
      setOptions(existingMatches.slice(0, 5));
    } finally {
      setSearching(false);
    }
  };

  return (
    <AutoComplete
      defaultActiveFirstOption
      value={value}
      options={options}
      onSearch={handleSearch}
      onSelect={(_, option: any) => {
        if (onSelectAddress) {
          onSelectAddress(option);
        }
      }}
      style={style}
      filterOption={false} // Отключаем локальную фильтрацию, используем серверную
    >
      <Input
        placeholder={placeholder}
        allowClear
        suffix={searching ? <Spin size="small" /> : null}
      />
    </AutoComplete>
  );
};


