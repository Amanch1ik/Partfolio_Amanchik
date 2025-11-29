import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nProvider, useI18nContext } from '../i18nGatewayContext';

const LangConsumer: React.FC = () => {
  const { language, setLanguage } = useI18nContext();
  return (
    <div>
      <span data-testid="lang">{language}</span>
      <button data-testid="btn-en" onClick={() => setLanguage('en')}>en</button>
    </div>
  );
};

describe('partner i18n context', () => {
  test('language changes via context', async () => {
    render(
      <I18nProvider>
        <LangConsumer />
      </I18nProvider>
    );
    expect(screen.getByTestId('lang').textContent).toBe('ru');
    fireEvent.click(screen.getByTestId('btn-en'));
    await waitFor(() => expect(screen.getByTestId('lang').textContent).toBe('en'));
  });
});


