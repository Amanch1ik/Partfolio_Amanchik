import { Card, Row, Col, Statistic } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

interface AnalyticsWidgetProps {
  title: string;
  value: number | string;
  suffix?: string;
  trend?: number;
  trendLabel?: string;
  icon?: React.ReactNode;
  color?: string;
}

export const AnalyticsWidget = ({ 
  title, 
  value, 
  suffix, 
  trend, 
  trendLabel, 
  icon,
  color = '#689071'
}: AnalyticsWidgetProps) => {
  const isPositive = trend !== undefined && trend >= 0;
  
  return (
    <Card
      hoverable
      className="hover-lift-green scale-in"
      style={{
        borderRadius: 16,
        background: 'linear-gradient(135deg, #ffffff 0%, #F0F7EB 100%)',
        border: '1px solid #E3EED4',
        boxShadow: '0 2px 12px rgba(15, 42, 29, 0.08)',
        transition: 'all 0.3s',
      }}
    >
      <Statistic
        title={<span style={{ color: '#689071', fontWeight: 500 }}>{icon} {title}</span>}
        value={value}
        suffix={suffix}
        valueStyle={{ color: '#0F2A1D', fontWeight: 700, fontSize: 28 }}
        prefix={icon}
      />
      {trend !== undefined && (
        <div style={{ fontSize: 12, color: isPositive ? '#689071' : '#ff4d4f', marginTop: 8, fontWeight: 500 }}>
          {isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {Math.abs(trend)}% {trendLabel || 'vs прошлый период'}
        </div>
      )}
    </Card>
  );
};

