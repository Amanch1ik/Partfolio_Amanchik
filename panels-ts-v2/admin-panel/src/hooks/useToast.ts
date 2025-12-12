import { message, App } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, InfoCircleOutlined, WarningOutlined } from '@ant-design/icons';
import React from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  duration?: number;
  placement?: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
  description?: string;
}

const getIcon = (type: ToastType) => {
  switch (type) {
    case 'success':
      return React.createElement(CheckCircleOutlined, { style: { color: 'var(--color-success)' } });
    case 'error':
      return React.createElement(CloseCircleOutlined, { style: { color: 'var(--color-error)' } });
    case 'info':
      return React.createElement(InfoCircleOutlined, { style: { color: 'var(--color-info)' } });
    case 'warning':
      return React.createElement(WarningOutlined, { style: { color: 'var(--color-warning)' } });
    default:
      return null;
  }
};

export const useToast = () => {
  const { message: messageApi, notification: notificationApi } = App.useApp();

  const showToast = (
    type: ToastType,
    content: string,
    options: ToastOptions = {}
  ) => {
    const { duration = 3, placement = 'topRight', description } = options;

    if (description) {
      notificationApi[type]({
        message: content,
        description,
        duration,
        placement,
        icon: getIcon(type),
        style: {
          borderRadius: 8,
        },
      });
    } else {
      messageApi[type](content, duration);
    }
  };

  return {
    success: (content: string, options?: ToastOptions) => showToast('success', content, options),
    error: (content: string, options?: ToastOptions) => showToast('error', content, options),
    info: (content: string, options?: ToastOptions) => showToast('info', content, options),
    warning: (content: string, options?: ToastOptions) => showToast('warning', content, options),
  };
};

