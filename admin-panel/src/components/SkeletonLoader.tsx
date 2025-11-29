import { Skeleton, Card, Row, Col } from 'antd';

interface SkeletonLoaderProps {
  type?: 'card' | 'table' | 'list' | 'dashboard' | 'form';
  count?: number;
  rows?: number;
}

export const SkeletonLoader = ({ type = 'card', count = 1, rows = 3 }: SkeletonLoaderProps) => {
  if (type === 'dashboard') {
    return (
      <Row gutter={[16, 16]}>
        {[1, 2, 3, 4].map((i) => (
          <Col xs={24} sm={12} lg={6} key={i}>
            <Card>
              <Skeleton active paragraph={{ rows: 1 }} />
            </Card>
          </Col>
        ))}
        <Col xs={24} lg={12}>
          <Card>
            <Skeleton active paragraph={{ rows: 4 }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card>
            <Skeleton active paragraph={{ rows: 4 }} />
          </Card>
        </Col>
      </Row>
    );
  }

  if (type === 'table') {
    return (
      <Card>
        <Skeleton active paragraph={{ rows: 0 }} />
        <Skeleton active paragraph={{ rows: 0 }} />
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} active paragraph={{ rows: 1 }} style={{ marginTop: 16 }} />
        ))}
      </Card>
    );
  }

  if (type === 'list') {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i} style={{ marginBottom: 16 }}>
            <Skeleton active avatar paragraph={{ rows: 2 }} />
          </Card>
        ))}
      </>
    );
  }

  if (type === 'form') {
    return (
      <Card>
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} active paragraph={{ rows: 1 }} style={{ marginBottom: 24 }} />
        ))}
      </Card>
    );
  }

  // Default: card
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} style={{ marginBottom: 16 }}>
          <Skeleton active paragraph={{ rows: rows }} />
        </Card>
      ))}
    </>
  );
};

