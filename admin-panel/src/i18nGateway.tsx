import React, { useState, useEffect } from 'react';
import i18n from './i18n';

// Lightweight gateway to force re-renders on language changes
export const I18nGateway: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Local toggle to trigger re-render on language change
  const [, forceRender] = useState(0);

  useEffect(() => {
    const unsubscribe = i18n.subscribe(() => {
      // Trigger a re-render whenever language changes
      forceRender(n => n + 1);
    });
    return unsubscribe;
  }, []);

  return <>{children}</>;
};

export default I18nGateway;


