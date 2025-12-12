import { Empty, Button } from 'antd';
import { 
  InboxOutlined, 
  SearchOutlined, 
  FileOutlined,
  UserOutlined,
  ShopOutlined,
  TransactionOutlined,
  GiftOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

interface EmptyStateProps {
  type?: 'default' | 'users' | 'partners' | 'transactions' | 'promotions' | 'search' | 'no-data';
  title?: string;
  description?: string;
  actionLabel?: string;
  actionPath?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

const typeConfig = {
  users: {
    icon: <UserOutlined style={{ fontSize: 64, color: 'var(--color-primary)' }} />,
    title: 'Нет пользователей',
    description: 'Пока нет зарегистрированных пользователей в системе',
  },
  partners: {
    icon: <ShopOutlined style={{ fontSize: 64, color: 'var(--color-primary)' }} />,
    title: 'Нет партнеров',
    description: 'Добавьте первого партнера в систему',
  },
  transactions: {
    icon: <TransactionOutlined style={{ fontSize: 64, color: 'var(--color-primary)' }} />,
    title: 'Нет транзакций',
    description: 'Транзакции появятся здесь после первых операций',
  },
  promotions: {
    icon: <GiftOutlined style={{ fontSize: 64, color: 'var(--color-primary)' }} />,
    title: 'Нет промо-акций',
    description: 'Создайте первую промо-акцию для привлечения клиентов',
  },
  search: {
    icon: <SearchOutlined style={{ fontSize: 64, color: 'var(--color-primary)' }} />,
    title: 'Ничего не найдено',
    description: 'Попробуйте изменить параметры поиска',
  },
  'no-data': {
    icon: <FileOutlined style={{ fontSize: 64, color: 'var(--color-primary)' }} />,
    title: 'Нет данных',
    description: 'Данные появятся здесь после их добавления',
  },
  default: {
    icon: <InboxOutlined style={{ fontSize: 64, color: 'var(--color-primary)' }} />,
    title: 'Пусто',
    description: 'Здесь пока ничего нет',
  },
};

export const EmptyState = ({
  type = 'default',
  title,
  description,
  actionLabel,
  actionPath,
  onAction,
  icon,
}: EmptyStateProps) => {
  const navigate = useNavigate();
  const config = typeConfig[type] || typeConfig.default;

  const handleAction = () => {
    if (onAction) {
      onAction();
    } else if (actionPath) {
      navigate(actionPath);
    }
  };

  return (
    <Empty
      image={icon || config.icon}
      imageStyle={{
        height: 120,
      }}
      description={
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--color-text-primary)' }}>
            {title || config.title}
          </div>
          <div style={{ color: 'var(--color-text-tertiary)', fontSize: 14 }}>
            {description || config.description}
          </div>
        </div>
      }
    >
      {(actionLabel || actionPath || onAction) && (
        <Button 
          type="primary" 
          size="large"
          onClick={handleAction}
          style={{
            backgroundColor: 'var(--color-primary)',
            borderColor: 'var(--color-primary)',
            borderRadius: 8,
            height: 40,
            paddingLeft: 24,
            paddingRight: 24,
          }}
        >
          {actionLabel || 'Добавить'}
        </Button>
      )}
    </Empty>
  );
};

