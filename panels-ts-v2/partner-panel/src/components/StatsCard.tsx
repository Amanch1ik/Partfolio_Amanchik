import { Card, Statistic } from 'antd';
import { ReactNode } from 'react';

interface StatsCardProps {
  title: string;
  value: number | string;
  suffix?: string;
  prefix?: ReactNode;
  change?: number;
  trend?: 'up' | 'down';
  icon?: ReactNode;
}

export const StatsCard = ({
  title,
  value,
  suffix,
  prefix,
  change,
  trend,
  icon,
}: StatsCardProps) => {
  return (
    <Card
      hoverable
      style={{
        borderRadius: 16,
        background: 'linear-gradient(135deg, #ffffff 0%, #F0F7EB 100%)',
        border: '1px solid #E3EED4',
        boxShadow: '0 4px 12px rgba(15, 42, 29, 0.08)',
        transition: 'all 0.3s',
      }}
      className="hover-lift-green"
    >
      <Statistic
        title={<span style={{ color: '#689071', fontWeight: 600 }}>{icon} {title}</span>}
        value={value}
        prefix={prefix}
        suffix={suffix}
        valueStyle={{ color: '#0F2A1D', fontWeight: 700, fontSize: 28 }}
      />
      {change !== undefined && (
        <div style={{ fontSize: 12, color: trend === 'up' ? '#689071' : '#ff4d4f', marginTop: 8, fontWeight: 500 }}>
          {trend === 'up' ? '↑' : '↓'} {Math.abs(change)}% vs прошлый месяц
        </div>
      )}
    </Card>
  );
};

