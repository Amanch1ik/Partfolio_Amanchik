import { useState, useEffect, useRef } from 'react';
import { List, Avatar, Tag, Empty, Spin } from 'antd';
import { EnvironmentOutlined, ShoppingOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import partnerApi from '@/services/partnerApi';

interface SearchResult {
  id: number;
  type: 'location' | 'promotion';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  path: string;
}

interface SearchResultsProps {
  query: string;
  visible: boolean;
  onClose: () => void;
}

export const SearchResults = ({ query, visible, onClose }: SearchResultsProps) => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [visible, onClose]);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }

    const search = async () => {
      setLoading(true);
      try {
        // Поиск локаций и промо-акций партнера
        const [locationsResp, promotionsResp] = await Promise.allSettled([
          partnerApi.getLocations(),
          partnerApi.getPromotions(),
        ]);

        const items: SearchResult[] = [];

        if (locationsResp.status === 'fulfilled') {
          const responseData = locationsResp.value?.data || locationsResp.value;
          const locations = Array.isArray(responseData) ? responseData : responseData?.items || [];
          locations
            .filter((loc: any) => 
              loc.name?.toLowerCase().includes(query.trim().toLowerCase()) ||
              loc.address?.toLowerCase().includes(query.trim().toLowerCase())
            )
            .slice(0, 5)
            .forEach((loc: any) => {
              items.push({
                id: loc.id,
                type: 'location',
                title: loc.name || `Location #${loc.id}`,
                subtitle: loc.address,
                icon: <Avatar icon={<EnvironmentOutlined />} style={{ backgroundColor: '#689071' }} />,
                path: '/locations',
              });
            });
        }

        if (promotionsResp.status === 'fulfilled') {
          const responseData = promotionsResp.value?.data || promotionsResp.value;
          const promotions = Array.isArray(responseData) ? responseData : responseData?.items || [];
          promotions
            .filter((promo: any) =>
              promo.title?.toLowerCase().includes(query.trim().toLowerCase()) ||
              promo.description?.toLowerCase().includes(query.trim().toLowerCase())
            )
            .slice(0, 5)
            .forEach((promo: any) => {
              items.push({
                id: promo.id,
                type: 'promotion',
                title: promo.title || `Promotion #${promo.id}`,
                subtitle: promo.description,
                icon: <Avatar icon={<ShoppingOutlined />} style={{ backgroundColor: '#52c41a' }} />,
                path: '/promotions',
              });
            });
        }

        setResults(items);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(search, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  if (!visible || !query || query.trim().length < 2) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        marginTop: 8,
        width: '400px',
        maxHeight: '500px',
        zIndex: 1000,
        background: '#ffffff',
        borderRadius: 12,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        border: '1px solid #E3EED4',
        overflow: 'hidden',
      }}
    >
      {loading ? (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <Spin />
        </div>
      ) : results.length === 0 ? (
        <Empty
          image={<SearchOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
          description="Ничего не найдено"
          style={{ padding: 24 }}
        />
      ) : (
        <List
          dataSource={results}
          renderItem={(item) => (
            <List.Item
              style={{
                cursor: 'pointer',
                padding: '12px 16px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#F0F7EB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
              onClick={() => {
                navigate(item.path);
                onClose();
              }}
            >
              <List.Item.Meta
                avatar={item.icon}
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{item.title}</span>
                    <Tag color={item.type === 'location' ? 'blue' : 'green'}>
                      {item.type === 'location' ? 'Локация' : 'Акция'}
                    </Tag>
                  </div>
                }
                description={item.subtitle}
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );
};

