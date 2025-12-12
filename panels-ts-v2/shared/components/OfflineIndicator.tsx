// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Alert } from 'antd';
import { WifiOutlined, CloseCircleOutlined } from '@ant-design/icons';

interface OfflineIndicatorProps {
  onReconnect?: () => void;
}

/**
 * Компонент для отображения статуса подключения к интернету
 */
export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ onReconnect }) => {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      return navigator.onLine;
    }
    return true; // По умолчанию считаем, что онлайн
  });

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (onReconnect) {
        onReconnect();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Проверяем статус при монтировании
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      setIsOnline(navigator.onLine);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onReconnect]);

  if (isOnline) {
    return null;
  }

  return (
    <Alert
      message="Нет подключения к интернету"
      description="Проверьте ваше интернет-соединение. Некоторые функции могут быть недоступны."
      type="warning"
      icon={<CloseCircleOutlined />}
      showIcon
      closable
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        borderRadius: 0,
      }}
    />
  );
};

/**
 * Хук для отслеживания статуса подключения
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      return navigator.onLine;
    }
    return true;
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

