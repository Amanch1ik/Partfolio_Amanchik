import { Card, Statistic } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface AnalyticsWidgetProps {
  title: string;
  value: number | string;
  change?: number;
  trend?: 'up' | 'down';
  chartData?: Array<{ date: string; value: number }>;
  suffix?: string;
  prefix?: string;
}

export const AnalyticsWidget = ({
  title,
  value,
  change,
  trend,
  chartData,
  suffix,
  prefix,
}: AnalyticsWidgetProps) => {
  return (
    <Card
      hoverable
      style={{
        borderRadius: 16,
        background: 'linear-gradient(135deg, #ffffff 0%, #F0F7EB 100%)',
        border: '1px solid #E3EED4',
        boxShadow: '0 4px 12px rgba(15, 42, 29, 0.08)',
        transition: 'all 0.3s',
        height: '100%',
      }}
      className="hover-lift-green"
    >
      <Statistic
        title={<span style={{ color: '#689071', fontWeight: 600 }}>{title}</span>}
        value={value}
        prefix={prefix}
        suffix={suffix}
        valueStyle={{ color: '#0F2A1D', fontWeight: 700, fontSize: 28 }}
      />
      {change !== undefined && (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          {trend === 'up' ? (
            <ArrowUpOutlined style={{ color: '#689071' }} />
          ) : (
            <ArrowDownOutlined style={{ color: '#ff4d4f' }} />
          )}
          <span style={{ color: trend === 'up' ? '#689071' : '#ff4d4f', fontSize: 12, fontWeight: 500 }}>
            {Math.abs(change)}% vs прошлый месяц
          </span>
        </div>
      )}
      {chartData && chartData.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <ResponsiveContainer width="100%" height={80}>
            <LineChart data={chartData}>
              <Line
                type="monotone"
                dataKey="value"
                stroke="#689071"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};

