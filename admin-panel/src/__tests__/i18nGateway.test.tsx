import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nGateway } from '../i18nGateway';

// Simple smoke test to ensure gateway renders children without crashing
describe('I18nGateway', () => {
  test('renders children correctly', () => {
    render(
      <I18nGateway>
        <div data-testid="gateway-child">Hello</div>
      </I18nGateway>
    );
    expect(screen.getByTestId('gateway-child')).toBeInTheDocument();
  });
});


