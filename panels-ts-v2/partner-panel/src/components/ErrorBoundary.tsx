import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Result, Button } from 'antd';
import { HomeOutlined, ReloadOutlined } from '@ant-design/icons';
import { errorLogger } from '@shared/monitoring';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    console.error('Error stack:', error.stack);
    console.error('Component stack:', errorInfo.componentStack);
    
    // Логируем ошибку в систему мониторинга
    errorLogger.logReactError(error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <Result
          status="500"
          title="500"
          subTitle="Извините, произошла ошибка."
          extra={[
            <Button
              type="primary"
              key="home"
              icon={<HomeOutlined />}
              onClick={() => (window.location.href = '/')}
            >
              На главную
            </Button>,
            <Button
              key="reload"
              icon={<ReloadOutlined />}
              onClick={this.handleReset}
            >
              Попробовать снова
            </Button>,
          ]}
        >
          {this.state.error && (
            <div style={{ marginTop: 20, textAlign: 'left', padding: '20px', background: '#fff', borderRadius: '8px' }}>
              <details open>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '10px' }}>Детали ошибки</summary>
                <pre style={{ marginTop: 10, color: '#ff4d4f', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {this.state.error.toString()}
                  {this.state.error.stack && (
                    <>
                      {'\n\nStack trace:\n'}
                      {this.state.error.stack}
                    </>
                  )}
                </pre>
              </details>
            </div>
          )}
        </Result>
      );
    }

    return this.props.children;
  }
}

