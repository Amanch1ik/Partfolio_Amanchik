import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Button, Tag, Space, message, Divider } from 'antd';
import { 
  ApiOutlined, 
  BugOutlined, 
  DashboardOutlined, 
  DownloadOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { 
  getMonitoringReport, 
  exportMonitoringData,
  apiMetricsCollector,
  errorLogger,
  performanceMonitor,
} from '@shared/monitoring';
import type { ColumnsType } from 'antd/es/table';

interface MonitoringReport {
  api: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageDuration: number;
    requestsByStatus: Record<number, number>;
    requestsByEndpoint: Record<string, number>;
    errors: Array<{ url: string; error: string; timestamp: number }>;
  };
  errors: {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsBySource: Record<string, number>;
    recentErrors: Array<{
      id: string;
      message: string;
      source: string;
      timestamp: number;
    }>;
  };
  performance: {
    metrics: {
      fcp?: number;
      lcp?: number;
      fid?: number;
      cls?: number;
      pageLoadTime?: number;
    };
    score: 'good' | 'needs-improvement' | 'poor';
  };
  timestamp: number;
}

export const MonitoringPage = () => {
  const [report, setReport] = useState<MonitoringReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadReport = () => {
    try {
      const newReport = getMonitoringReport() as MonitoringReport;
      setReport(newReport);
    } catch (error) {
      console.error('Failed to load monitoring report:', error);
      message.error('Не удалось загрузить отчет');
    }
  };

  useEffect(() => {
    loadReport();

    if (autoRefresh) {
      const interval = setInterval(loadReport, 5000); // Обновление каждые 5 секунд
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const handleExport = () => {
    try {
      const data = exportMonitoringData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `monitoring-report-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      message.success('Отчет экспортирован');
    } catch (error) {
      console.error('Failed to export report:', error);
      message.error('Не удалось экспортировать отчет');
    }
  };

  const handleClear = () => {
    apiMetricsCollector.clear();
    errorLogger.clear();
    loadReport();
    message.success('Данные очищены');
  };

  const getStatusColor = (status?: number) => {
    if (!status) return 'default';
    if (status >= 200 && status < 300) return 'success';
    if (status >= 400 && status < 500) return 'warning';
    return 'error';
  };

  const getScoreColor = (score: string) => {
    switch (score) {
      case 'good':
        return 'success';
      case 'needs-improvement':
        return 'warning';
      case 'poor':
        return 'error';
      default:
        return 'default';
    }
  };

  const getScoreLabel = (score: string) => {
    switch (score) {
      case 'good':
        return 'Хорошо';
      case 'needs-improvement':
        return 'Требует улучшения';
      case 'poor':
        return 'Плохо';
      default:
        return 'Неизвестно';
    }
  };

  const apiErrorColumns: ColumnsType<any> = [
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      ellipsis: true,
    },
    {
      title: 'Ошибка',
      dataIndex: 'error',
      key: 'error',
      ellipsis: true,
    },
    {
      title: 'Время',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp: number) => new Date(timestamp).toLocaleString('ru-RU'),
      width: 180,
    },
  ];

  const errorColumns: ColumnsType<any> = [
    {
      title: 'Сообщение',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
    },
    {
      title: 'Источник',
      dataIndex: 'source',
      key: 'source',
      render: (source: string) => (
        <Tag color={source === 'api' ? 'red' : source === 'react' ? 'orange' : 'blue'}>
          {source}
        </Tag>
      ),
      width: 100,
    },
    {
      title: 'Время',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp: number) => new Date(timestamp).toLocaleString('ru-RU'),
      width: 180,
    },
  ];

  if (!report) {
    return <div>Загрузка...</div>;
  }

  const successRate: string = report.api.totalRequests > 0
    ? ((report.api.successfulRequests / report.api.totalRequests) * 100).toFixed(1)
    : '0';

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Мониторинг системы</h1>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadReport}
            loading={loading}
          >
            Обновить
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
          >
            Экспорт
          </Button>
          <Button
            danger
            onClick={handleClear}
          >
            Очистить
          </Button>
        </Space>
      </div>

      {/* API Метрики */}
      <Card title={<><ApiOutlined /> API Метрики</>} style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Всего запросов"
              value={report.api.totalRequests}
              prefix={<ApiOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Успешных"
              value={report.api.successfulRequests}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Ошибок"
              value={report.api.failedRequests}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Успешность"
              value={`${successRate}%`}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ 
                color: parseFloat(String(successRate || 0)) >= 95 ? '#3f8600' : parseFloat(String(successRate || 0)) >= 80 ? '#faad14' : '#cf1322' 
              }}
            />
          </Col>
        </Row>
        <Divider />
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Statistic
              title="Среднее время ответа"
              value={Math.round(report.api.averageDuration)}
              suffix="мс"
            />
          </Col>
          <Col xs={24} sm={12}>
            <div>
              <strong>Запросы по статусам:</strong>
              <div style={{ marginTop: 8 }}>
                {Object.entries(report.api.requestsByStatus).map(([status, count]) => (
                  <Tag key={status} color={getStatusColor(parseInt(status))} style={{ marginBottom: 4 }}>
                    {status}: {count}
                  </Tag>
                ))}
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Ошибки */}
      <Card title={<><BugOutlined /> Ошибки</>} style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col xs={24} sm={12} md={8}>
            <Statistic
              title="Всего ошибок"
              value={report.errors.totalErrors}
              prefix={<BugOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <div>
              <strong>По типам:</strong>
              <div style={{ marginTop: 8 }}>
                {Object.entries(report.errors.errorsByType).map(([type, count]) => (
                  <Tag key={type} color="red" style={{ marginBottom: 4 }}>
                    {type}: {count}
                  </Tag>
                ))}
              </div>
            </div>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <div>
              <strong>По источникам:</strong>
              <div style={{ marginTop: 8 }}>
                {Object.entries(report.errors.errorsBySource).map(([source, count]) => (
                  <Tag key={source} color="orange" style={{ marginBottom: 4 }}>
                    {source}: {count}
                  </Tag>
                ))}
              </div>
            </div>
          </Col>
        </Row>
        {report.errors.recentErrors.length > 0 && (
          <>
            <Divider />
            <Table
              columns={errorColumns}
              dataSource={report.errors.recentErrors}
              rowKey="id"
              pagination={{ pageSize: 5 }}
              size="small"
            />
          </>
        )}
      </Card>

      {/* Производительность */}
      <Card title={<><DashboardOutlined /> Производительность</>} style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="FCP"
              value={report.performance.metrics.fcp || 0}
              suffix="мс"
              formatter={(value) => {
                const val = Number(value);
                return val < 1800 ? value : <span style={{ color: '#faad14' }}>{value}</span>;
              }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="LCP"
              value={report.performance.metrics.lcp || 0}
              suffix="мс"
              formatter={(value) => {
                const val = Number(value);
                return val < 2500 ? value : <span style={{ color: '#faad14' }}>{value}</span>;
              }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="FID"
              value={report.performance.metrics.fid || 0}
              suffix="мс"
              formatter={(value) => {
                const val = Number(value);
                return val < 100 ? value : <span style={{ color: '#faad14' }}>{value}</span>;
              }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div>
              <strong>Оценка производительности:</strong>
              <div style={{ marginTop: 8 }}>
                <Tag color={getScoreColor(report.performance.score)}>
                  {getScoreLabel(report.performance.score)}
                </Tag>
              </div>
            </div>
          </Col>
        </Row>
        {report.performance.metrics.pageLoadTime && (
          <>
            <Divider />
            <Row>
              <Col xs={24}>
                <Statistic
                  title="Время загрузки страницы"
                  value={report.performance.metrics.pageLoadTime}
                  suffix="мс"
                />
              </Col>
            </Row>
          </>
        )}
      </Card>

      {/* API Ошибки */}
      {report.api.errors.length > 0 && (
        <Card title="Последние API ошибки" style={{ marginBottom: 24 }}>
          <Table
            columns={apiErrorColumns}
            dataSource={report.api.errors.map((error, index) => ({ ...error, key: index }))}
            pagination={{ pageSize: 10 }}
            size="small"
          />
        </Card>
      )}

      <div style={{ textAlign: 'center', color: '#999', marginTop: 24 }}>
        Последнее обновление: {new Date(report.timestamp).toLocaleString('ru-RU')}
      </div>
    </div>
  );
};

