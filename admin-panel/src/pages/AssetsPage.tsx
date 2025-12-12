import { useState } from 'react';
import { Card, Typography, Upload, Tabs, message, Space, Tag, Button, List, Divider, Tooltip } from 'antd';
import { InboxOutlined, CopyOutlined, CheckCircleTwoTone } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { assetsApi } from '@/services/api';

const { Dragger } = Upload;
const { Title, Paragraph, Text } = Typography;

type AssetFolder = 'images' | 'appicon' | 'splash' | 'fonts' | 'video' | 'audio' | 'documents' | 'archives' | 'misc';

const FOLDER_META: Record<AssetFolder, { title: string; description: string; accept: string }> = {
  images: { title: 'Изображения', description: 'PNG, JPG, WEBP, SVG, ICO, BMP, AVIF, HEIC', accept: '.png,.jpg,.jpeg,.gif,.webp,.svg,.ico,.bmp,.avif,.heic' },
  appicon: { title: 'Иконки приложений', description: 'PNG, WEBP, SVG, ICO', accept: '.png,.webp,.svg,.ico' },
  splash: { title: 'Splash / заставки', description: 'PNG, WEBP, SVG', accept: '.png,.webp,.svg' },
  fonts: { title: 'Шрифты', description: 'TTF, OTF, WOFF, WOFF2, EOT', accept: '.ttf,.otf,.woff,.woff2,.eot' },
  video: { title: 'Видео', description: 'MP4, MOV, WEBM, AVI, MKV', accept: '.mp4,.mov,.webm,.avi,.mkv' },
  audio: { title: 'Аудио', description: 'MP3, WAV, OGG, M4A, AAC, FLAC', accept: '.mp3,.wav,.ogg,.m4a,.aac,.flac' },
  documents: { title: 'Документы/данные', description: 'PDF, DOCX, XLSX, CSV, JSON, TXT', accept: '.pdf,.doc,.docx,.xls,.xlsx,.csv,.json,.txt' },
  archives: { title: 'Архивы', description: 'ZIP, TAR, GZ, RAR, 7Z', accept: '.zip,.tar,.gz,.rar,.7z' },
  misc: { title: 'Прочее', description: 'Любые разрешённые типы', accept: '' },
};

export const AssetsPage = () => {
  const [folder, setFolder] = useState<AssetFolder>('images');
  const [lastUploaded, setLastUploaded] = useState<Array<{ url: string; absolute?: string; name?: string; folder: string }>>([]);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const res = await assetsApi.upload(folder, file);
      return res;
    },
    onSuccess: (res) => {
      const url = res?.url || res?.data?.url;
      const absolute = res?.absolute_url || res?.data?.absolute_url;
      const name = res?.filename || res?.data?.filename;
      setLastUploaded((prev) => [{ url, absolute, name, folder }, ...prev].slice(0, 10));
      message.success('Файл загружен');
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail || err?.message || 'Не удалось загрузить файл';
      message.error(detail);
    },
  });

  const props = {
    name: 'file',
    multiple: false,
    accept: FOLDER_META[folder].accept,
    customRequest: (options: any) => {
      const { file, onSuccess, onError } = options;
      uploadMutation.mutate(file as File, {
        onSuccess: () => onSuccess('ok'),
        onError: onError,
      });
    },
  };

  return (
    <div className="fade-in">
      <Title level={2} style={{ marginBottom: 8 }}>Ресурсы приложения</Title>
      <Paragraph type="secondary" style={{ marginBottom: 24 }}>
        Загружайте изображения, иконки, splash-экраны, шрифты и прочие файлы. После загрузки копируйте URL и вставляйте в мобильное приложение или веб.
      </Paragraph>

      <Tabs
        activeKey={folder}
        onChange={(key) => setFolder(key as AssetFolder)}
        items={(Object.keys(FOLDER_META) as AssetFolder[]).map((key) => ({
          key,
          label: FOLDER_META[key].title,
        }))}
      />

      <Card
        style={{ borderRadius: 16, marginBottom: 24 }}
        title={FOLDER_META[folder].title}
        extra={<Tag color="green">{FOLDER_META[folder].description}</Tag>}
      >
        <Dragger
          {...props}
          showUploadList={false}
          disabled={uploadMutation.isPending}
          style={{ padding: 20 }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Кликните или перетащите файл сюда</p>
          <p className="ant-upload-hint">
            Форматы: {FOLDER_META[folder].description}. Максимальный размер: 10MB.
          </p>
        </Dragger>
      </Card>

      <Card
        title="Последние загрузки"
        style={{ borderRadius: 16 }}
        bodyStyle={{ padding: lastUploaded.length ? 16 : 24 }}
      >
        {lastUploaded.length === 0 ? (
          <Text type="secondary">Пока ничего не загружено</Text>
        ) : (
          <List
            dataSource={lastUploaded}
            renderItem={(item) => (
              <List.Item>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
                    <Space>
                      <CheckCircleTwoTone twoToneColor="#52c41a" />
                      <Text strong>{item.name || 'Файл'}</Text>
                      <Tag>{item.folder}</Tag>
                    </Space>
                    <Space>
                      {item.url && (
                        <Tooltip title="Скопировать относительный URL">
                          <Button
                            size="small"
                            icon={<CopyOutlined />}
                            onClick={() => {
                              navigator.clipboard.writeText(item.url);
                              message.success('Скопировано');
                            }}
                          >
                            URL
                          </Button>
                        </Tooltip>
                      )}
                      {item.absolute && (
                        <Tooltip title="Скопировать абсолютный URL">
                          <Button
                            size="small"
                            icon={<CopyOutlined />}
                            onClick={() => {
                              navigator.clipboard.writeText(item.absolute);
                              message.success('Скопировано');
                            }}
                          >
                            Абсолютный
                          </Button>
                        </Tooltip>
                      )}
                    </Space>
                  </Space>
                  <Divider style={{ margin: '8px 0' }} />
                  {item.url && (
                    <Text type="secondary" style={{ wordBreak: 'break-all' }}>
                      {item.url}
                    </Text>
                  )}
                  {item.absolute && (
                    <Text type="secondary" style={{ wordBreak: 'break-all' }}>
                      {item.absolute}
                    </Text>
                  )}
                </Space>
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
};

