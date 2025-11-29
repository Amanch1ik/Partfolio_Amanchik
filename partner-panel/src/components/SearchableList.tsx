import React, { useState, useEffect, useRef } from 'react';
import { Input, Avatar, Empty } from 'antd';
import { SearchOutlined, UserOutlined } from '@ant-design/icons';
import './SearchableList.css';

interface ListItem {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  [key: string]: any;
}

interface SearchableListProps {
  title?: string;
  subtitle?: string;
  items: ListItem[];
  onItemClick?: (item: ListItem) => void;
  onSearch?: (searchTerm: string) => void; // Callback для поиска через API
  searchPlaceholder?: string;
  emptyText?: string;
  maxHeight?: number;
}

export const SearchableList: React.FC<SearchableListProps> = ({
  title = 'Поиск',
  subtitle = 'Найдите нужный элемент',
  items = [],
  onItemClick,
  onSearch,
  searchPlaceholder = 'Поиск...',
  emptyText = 'Ничего не найдено',
  maxHeight = 400,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredItems, setFilteredItems] = useState<ListItem[]>(items);
  const inputRef = useRef<any>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSearchRef = useRef<string>(''); // Запоминаем последний поисковый запрос

  // Если есть onSearch callback, используем его для поиска через API
  // Иначе фильтруем локально
  useEffect(() => {
    if (onSearch) {
      // Предотвращаем зацикливание - не вызываем onSearch если поиск не изменился
      if (searchTerm === lastSearchRef.current) {
        return;
      }
      
      // Очищаем предыдущий таймаут
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      // Устанавливаем новый таймаут для debounce (500ms)
      searchTimeoutRef.current = setTimeout(() => {
        // Проверяем еще раз перед вызовом
        if (searchTerm !== lastSearchRef.current) {
          lastSearchRef.current = searchTerm;
          onSearch(searchTerm);
        }
      }, 500);
      
      return () => {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }
      };
    } else {
      // Локальная фильтрация
      if (searchTerm.trim() === '') {
        setFilteredItems(items);
      } else {
        const filtered = items.filter((item) => {
          const searchLower = searchTerm.toLowerCase();
          return (
            item.name?.toLowerCase().includes(searchLower) ||
            item.description?.toLowerCase().includes(searchLower) ||
            Object.values(item).some(
              (val) =>
                typeof val === 'string' &&
                val.toLowerCase().includes(searchLower)
            )
          );
        });
        setFilteredItems(filtered);
      }
    }
  }, [searchTerm, items, onSearch]);

  // Обновляем filteredItems когда items меняются (при использовании API)
  useEffect(() => {
    if (onSearch) {
      setFilteredItems(items);
    }
  }, [items, onSearch]);

  const handleItemClick = (item: ListItem) => {
    if (onItemClick) {
      onItemClick(item);
    }
  };

  return (
    <div className="searchable-list-container">
      <div className="searchable-list-header">
        <h3 className="searchable-list-title">{title}</h3>
        <p className="searchable-list-subtitle">{subtitle}</p>
        <div className="searchable-list-input-wrapper">
          <Input
            ref={inputRef}
            className="searchable-list-input"
            placeholder={searchPlaceholder}
            prefix={<SearchOutlined />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
          />
        </div>
      </div>
      <ul
        className="searchable-list"
        style={{ maxHeight: `${maxHeight}px` }}
      >
        {filteredItems.length === 0 ? (
          <li className="searchable-list-empty">
            <Empty
              description={emptyText}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </li>
        ) : (
          filteredItems.map((item) => (
            <li
              key={item.id}
              className="searchable-list-item"
              onClick={() => handleItemClick(item)}
            >
              <Avatar
                src={item.avatar}
                icon={<UserOutlined />}
                size={50}
                className="searchable-list-avatar"
              />
              <div className="searchable-list-user-info">
                <h4 className="searchable-list-user-name">{item.name}</h4>
                <p className="searchable-list-user-description">
                  {item.description}
                </p>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

