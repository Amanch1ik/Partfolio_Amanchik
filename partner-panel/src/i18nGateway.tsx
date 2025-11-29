import React, { useState, useEffect } from 'react';
import i18n from './i18n';

export const I18nGateway: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [, forceRender] = useState(0);
  useEffect(() => {
    const unsub = i18n.subscribe(() => {
      forceRender(n => n + 1);
    });
    return unsub;
  }, []);
  return <>{children}</>;
};

export default I18nGateway;


