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

describe('i18n context integration', () => {
  test('language starts with default and can be changed through context', async () => {
    render(
      <I18nProvider>
        <LangConsumer />
      </I18nProvider>
    );
    // initial language
    expect(screen.getByTestId('lang').textContent).toBe('ru');
    // switch language
    fireEvent.click(screen.getByTestId('btn-en'));
    await waitFor(() => expect(screen.getByTestId('lang').textContent).toBe('en'));
  });
});


