import { useState } from 'react';
import { AutoComplete, Input, Spin } from 'antd';
import { searchAddress } from '../services/mapService';

interface AddressAutocompleteProps {
  value?: string;
  onSelectAddress?: (address: { label: string; value: string; lat: number; lon: number }) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}

export const AddressAutocomplete = ({ value, onSelectAddress, placeholder = 'Начните вводить адрес', style }: AddressAutocompleteProps) => {
  const [searching, setSearching] = useState(false);
  const [options, setOptions] = useState<{ label: string; value: string; lat: number; lon: number }[]>([]);

  const handleSearch = async (q: string) => {
    if (!q || q.length < 3) {
      setOptions([]);
      return;
    }
    setSearching(true);
    try {
      const results = await searchAddress(q);
      const items = results.slice(0, 8).map((r) => ({
        label: r.display_name,
        value: r.display_name,
        lat: r.lat,
        lon: r.lon,
      }));
      setOptions(items);
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
    >
      <Input
        placeholder={placeholder}
        allowClear
        suffix={searching ? <Spin size="small" /> : null}
      />
    </AutoComplete>
  );
};


