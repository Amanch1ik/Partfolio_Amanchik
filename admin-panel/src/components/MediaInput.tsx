import { useState, useEffect } from 'react';
import { Upload, Input, Segmented, Space, Typography } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import { InboxOutlined, LinkOutlined, PictureOutlined } from '@ant-design/icons';
import { t } from '@/i18n';
import type { MediaInputValue } from '@/utils/media';

interface MediaInputProps {
  value?: MediaInputValue;
  onChange?: (value: MediaInputValue) => void;
  label?: string;
  placeholderUrl?: string;
  accept?: string;
  maxCount?: number;
}

const defaultValue: MediaInputValue = { mode: 'url', url: '', fileList: [] };

export const MediaInput = ({
  value,
  onChange,
  label,
  placeholderUrl,
  accept = 'image/*',
  maxCount = 1,
}: MediaInputProps) => {
  const [internalValue, setInternalValue] = useState<MediaInputValue>(value || defaultValue);

  useEffect(() => {
    if (value) setInternalValue(value);
  }, [value]);

  const triggerChange = (changed: Partial<MediaInputValue>) => {
    const newValue = { ...internalValue, ...changed };
    setInternalValue(newValue);
    onChange?.(newValue);
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {label && (
        <Typography.Text strong style={{ marginBottom: 4 }}>
          {label}
        </Typography.Text>
      )}

      <Segmented
        value={internalValue.mode}
        onChange={(mode) => triggerChange({ mode: mode as 'url' | 'file' })}
        options={[
          { label: t('media.url', 'Ссылка'), value: 'url', icon: <LinkOutlined /> },
          { label: t('media.file', 'Файл'), value: 'file', icon: <PictureOutlined /> },
        ]}
        style={{ width: '100%' }}
      />

      {internalValue.mode === 'url' ? (
        <Input
          placeholder={placeholderUrl || t('media.urlPlaceholder', 'https://example.com/image.png')}
          value={internalValue.url}
          onChange={(e) => triggerChange({ url: e.target.value })}
          allowClear
        />
      ) : (
        <Upload.Dragger
          beforeUpload={() => false}
          fileList={internalValue.fileList as UploadFile[]}
          onChange={({ fileList }) => triggerChange({ fileList })}
          accept={accept}
          maxCount={maxCount}
          listType="picture"
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">{t('media.uploadText', 'Перетащите файл или кликните для выбора')}</p>
          <p className="ant-upload-hint">{t('media.uploadHint', 'Поддерживаются изображения и ссылки')}</p>
        </Upload.Dragger>
      )}
    </Space>
  );
};

export default MediaInput;

