import { Card, Statistic } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

interface StatCardProps {
  title: string;
  value: number | string;
  prefix?: React.ReactNode;
  suffix?: string;
  trend?: number;
  loading?: boolean;
}

export const StatCard = ({ title, value, prefix, suffix, trend, loading }: StatCardProps) => {
  const trendColor = trend && trend > 0 ? '#52c41a' : trend && trend < 0 ? '#ff4d4f' : undefined;
  const TrendIcon = trend && trend > 0 ? ArrowUpOutlined : ArrowDownOutlined;

  return (
    <Card loading={loading}>
      <Statistic
        title={title}
        value={value}
        prefix={prefix}
        suffix={
          trend !== undefined ? (
            <span style={{ fontSize: 14, color: trendColor }}>
              <TrendIcon /> {Math.abs(trend)}%
            </span>
          ) : (
            suffix
          )
        }
      />
    </Card>
  );
};
