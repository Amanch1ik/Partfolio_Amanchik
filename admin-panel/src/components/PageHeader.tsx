import { FC, ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  extra?: ReactNode;
}

const PageHeader: FC<PageHeaderProps> = ({ title, subtitle, extra }) => {
  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: subtitle ? 8 : 0,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, color: '#000' }}>
          {title}
        </h1>
        {extra}
      </div>
      {subtitle && (
        <p style={{ margin: 0, color: '#666', fontSize: 14 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default PageHeader;
