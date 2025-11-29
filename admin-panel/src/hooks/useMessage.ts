import { App } from 'antd';
import { useCallback } from 'react';

/**
 * Хук для использования message из контекста Ant Design App
 * Решает проблему статических вызовов message.success/error/warning
 */
export const useMessage = () => {
  const { message } = App.useApp();

  const showSuccess = useCallback((content: string) => {
    message.success(content);
  }, [message]);

  const showError = useCallback((content: string) => {
    message.error(content);
  }, [message]);

  const showWarning = useCallback((content: string) => {
    message.warning(content);
  }, [message]);

  const showInfo = useCallback((content: string) => {
    message.info(content);
  }, [message]);

  return {
    success: showSuccess,
    error: showError,
    warning: showWarning,
    info: showInfo,
  };
};
