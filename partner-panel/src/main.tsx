import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { I18nProvider } from './i18nGatewayContext';
import { I18nGateway } from './i18nGateway';
import 'antd/dist/reset.css';
import './styles/colors.css';
import './styles/global.css';
import './styles/theme.css';
import './i18n'; // Инициализация i18n

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
      <I18nGateway>
        <App />
      </I18nGateway>
    </I18nProvider>
  </React.StrictMode>,
);

