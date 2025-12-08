import { Result, Button, Card } from 'antd';
import { ReloadOutlined, HomeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

interface ErrorDisplayProps {
  error?: Error | string;
  title?: string;
  subTitle?: string;
  onRetry?: () => void;
  showHomeButton?: boolean;
}

export const ErrorDisplay = ({
  error,
  title = 'Произошла ошибка',
  subTitle,
  onRetry,
  showHomeButton = true,
}: ErrorDisplayProps) => {
  const navigate = useNavigate();
  
  const errorMessage = error instanceof Error ? error.message : error || 'Неизвестная ошибка';
  const displaySubTitle = subTitle || errorMessage;

  return (
    <Card style={{ margin: '24px 0' }}>
      <Result
        status="error"
        title={title}
        subTitle={displaySubTitle}
        extra={[
          onRetry && (
            <Button
              key="retry"
              type="primary"
              icon={<ReloadOutlined />}
              onClick={onRetry}
              style={{
                backgroundColor: '#689071',
                borderColor: '#689071',
              }}
            >
              Попробовать снова
            </Button>
          ),
          showHomeButton && (
            <Button
              key="home"
              icon={<HomeOutlined />}
              onClick={() => navigate('/')}
            >
              На главную
            </Button>
          ),
        ].filter(Boolean)}
      />
    </Card>
  );
};

