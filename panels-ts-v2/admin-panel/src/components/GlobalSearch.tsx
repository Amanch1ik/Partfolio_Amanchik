import { Input, AutoComplete, Card, Tag, Space, Typography } from 'antd';
import { SearchOutlined, UserOutlined, ShopOutlined, TransactionOutlined, GiftOutlined } from '@ant-design/icons';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User, Partner, Transaction, Promotion } from '@/types';

const { Text } = Typography;

interface SearchResult {
  type: 'user' | 'partner' | 'transaction' | 'promotion';
  id: number;
  title: string;
  description?: string;
  url: string;
}

interface GlobalSearchProps {
  users?: User[];
  partners?: Partner[];
  transactions?: Transaction[];
  promotions?: Promotion[];
  onSearch?: (query: string) => void;
}

const typeIcons = {
  user: <UserOutlined style={{ color: 'var(--color-info)' }} />,
  partner: <ShopOutlined style={{ color: 'var(--color-success)' }} />,
  transaction: <TransactionOutlined style={{ color: 'var(--color-warning)' }} />,
  promotion: <GiftOutlined style={{ color: 'var(--color-primary)' }} />,
};

const typeLabels = {
  user: 'Пользователь',
  partner: 'Партнер',
  transaction: 'Транзакция',
  promotion: 'Промо-акция',
};

export const GlobalSearch = ({
  users = [],
  partners = [],
  transactions = [],
  promotions = [],
  onSearch,
}: GlobalSearchProps) => {
  const [searchValue, setSearchValue] = useState('');
  const navigate = useNavigate();

  const searchResults = useMemo<SearchResult[]>(() => {
    if (!searchValue.trim()) return [];

    const query = searchValue.toLowerCase();
    const results: SearchResult[] = [];

    // Поиск пользователей
    users.forEach((user) => {
      const matches =
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.phone?.toLowerCase().includes(query);
      
      if (matches) {
        results.push({
          type: 'user',
          id: user.id,
          title: user.name || user.email || user.phone,
          description: user.email || user.phone,
          url: `/users/${user.id}`,
        });
      }
    });

    // Поиск партнеров
    partners.forEach((partner) => {
      const matches =
        partner.name?.toLowerCase().includes(query) ||
        partner.description?.toLowerCase().includes(query) ||
        partner.category?.toLowerCase().includes(query);
      
      if (matches) {
        results.push({
          type: 'partner',
          id: partner.id,
          title: partner.name,
          description: partner.category,
          url: `/partners/${partner.id}`,
        });
      }
    });

    // Поиск транзакций
    transactions.forEach((transaction) => {
      const matches = transaction.id.toString().includes(query);
      
      if (matches) {
        results.push({
          type: 'transaction',
          id: transaction.id,
          title: `Транзакция #${transaction.id}`,
          description: `${transaction.amount} ${transaction.type}`,
          url: `/transactions/${transaction.id}`,
        });
      }
    });

    // Поиск промо-акций
    promotions.forEach((promotion) => {
      const matches =
        promotion.title?.toLowerCase().includes(query) ||
        promotion.description?.toLowerCase().includes(query);
      
      if (matches) {
        results.push({
          type: 'promotion',
          id: promotion.id,
          title: promotion.title,
          description: promotion.category,
          url: `/promotions/${promotion.id}`,
        });
      }
    });

    return results.slice(0, 10); // Ограничиваем 10 результатами
  }, [searchValue, users, partners, transactions, promotions]);

  const options = searchResults.map((result) => ({
    value: result.title,
    label: (
      <Card
        size="small"
        hoverable
        onClick={() => {
          navigate(result.url);
          setSearchValue('');
        }}
        style={{ margin: -12, cursor: 'pointer' }}
        styles={{ body: { padding: 12 } }}
      >
        <Space>
          {typeIcons[result.type]}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500 }}>{result.title}</div>
            {result.description && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {result.description}
              </Text>
            )}
          </div>
          <Tag color="blue">{typeLabels[result.type]}</Tag>
        </Space>
      </Card>
    ),
  }));

  const handleSearch = (value: string) => {
    setSearchValue(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  return (
    <AutoComplete
      value={searchValue}
      options={options}
      onSearch={handleSearch}
      style={{ width: '100%', maxWidth: 400 }}
      placeholder="Поиск по всем разделам..."
      filterOption={false}
    >
      <Input
        size="large"
        prefix={<SearchOutlined />}
        placeholder="Поиск пользователей, партнеров, транзакций..."
        allowClear
      />
    </AutoComplete>
  );
};
