import { useState, useEffect, useRef } from 'react';
import { Card, List, Avatar, Tag, Empty, Spin } from 'antd';
import { UserOutlined, ShopOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { usersApi, partnersApi } from '@/services/api';
import { t } from '@/i18n';

interface SearchResult {
  id: number;
  type: 'user' | 'partner';
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
        const [usersResp, partnersResp] = await Promise.allSettled([
          usersApi.getAll(1, 5, query.trim()),
          partnersApi.getAll(1, 5, query.trim()),
        ]);

        const items: SearchResult[] = [];

        if (usersResp.status === 'fulfilled') {
          const users = usersResp.value?.data?.items || [];
          users.forEach((u: any) => {
            items.push({
              id: u.id,
              type: 'user',
              title: u.name || u.email || u.phone || `User #${u.id}`,
              subtitle: u.email || u.phone,
              icon: <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#689071' }} />,
              path: '/users',
            });
          });
        }

        if (partnersResp.status === 'fulfilled') {
          const partners = partnersResp.value?.data?.items || [];
          partners.forEach((p: any) => {
            items.push({
              id: p.id,
              type: 'partner',
              title: p.name || `Partner #${p.id}`,
              subtitle: p.category || p.email,
              icon: <Avatar icon={<ShopOutlined />} style={{ backgroundColor: '#52c41a' }} />,
              path: '/partners',
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
          description={t('common.noResults', 'Ничего не найдено')}
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
                    <Tag color={item.type === 'user' ? 'blue' : 'green'}>
                      {item.type === 'user' ? t('common.user', 'Пользователь') : t('partners.title', 'Партнер')}
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

