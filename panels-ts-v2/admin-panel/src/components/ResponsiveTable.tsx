import { Table, Card, Space, Button } from 'antd';
import { TableProps } from 'antd/es/table';
import { useState, useEffect } from 'react';
import { EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

interface ResponsiveTableProps<T> extends TableProps<T> {
  mobileCardRender?: (record: T) => React.ReactNode;
  showActions?: boolean;
  onView?: (record: T) => void;
  onEdit?: (record: T) => void;
  onDelete?: (record: T) => void;
  mobileBreakpoint?: number;
}

export function ResponsiveTable<T extends Record<string, any>>({
  mobileCardRender,
  showActions = false,
  onView,
  onEdit,
  onDelete,
  mobileBreakpoint = 768,
  ...tableProps
}: ResponsiveTableProps<T>) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < mobileBreakpoint);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [mobileBreakpoint]);

  if (isMobile && mobileCardRender) {
    return (
      <div style={{ padding: '0 8px' }}>
        {tableProps.dataSource?.map((record, index) => (
          <Card
            key={tableProps.rowKey ? String(record[tableProps.rowKey as string]) : index}
            style={{ marginBottom: 16, borderRadius: 8 }}
            styles={{ body: { padding: 16 } }}
          >
            {mobileCardRender(record)}
            {showActions && (
              <Space style={{ marginTop: 12, width: '100%', justifyContent: 'flex-end' }}>
                {onView && (
                  <Button
                    type="text"
                    icon={<EyeOutlined />}
                    onClick={() => onView(record)}
                    size="small"
                  >
                    Просмотр
                  </Button>
                )}
                {onEdit && (
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => onEdit(record)}
                    size="small"
                  >
                    Редактировать
                  </Button>
                )}
                {onDelete && (
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => onDelete(record)}
                    size="small"
                  >
                    Удалить
                  </Button>
                )}
              </Space>
            )}
          </Card>
        ))}
      </div>
    );
  }

  // Desktop view - обычная таблица
  return (
    <div style={{ overflowX: 'auto' }}>
      <Table<T> {...tableProps} scroll={{ x: 'max-content' }} />
    </div>
  );
}

