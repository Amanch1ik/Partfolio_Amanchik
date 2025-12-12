import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import i18n, { t } from '@/i18n';
import { I18nProvider } from '../i18nGatewayContext';

// Simple test component that uses translation key
const TranslationTest: React.FC = () => {
  const translated = t('settings.title', 'Настройки');
  return <span data-testid="translated">{translated}</span>;
};

describe('i18n gateway contextual translations', () => {
  test('translates via context across language switch', async () => {
    render(
      <I18nProvider>
        <TranslationTest />
      </I18nProvider>
    );
    // default ru
    expect(screen.getByTestId('translated').textContent).toBe(i18n.t('settings.title', 'Настройки'));
    // switch to english
    i18n.setLanguage('en');
    await waitFor(() => {
      const el = screen.getByTestId('translated');
      expect(el.textContent).toBe(i18n.t('settings.title', 'Настройки'));
    });
  });
});


