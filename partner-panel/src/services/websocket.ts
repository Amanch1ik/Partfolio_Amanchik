/**
 * WebSocket сервис для реал-тайм уведомлений
 * Используется для получения обновлений в реальном времени
 */

type MessageHandler = (data: any) => void;
type EventType = 'notification' | 'transaction' | 'promotion_update' | 'location_update' | 'system';

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string = '';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3; // Уменьшено с 5 до 3
  private reconnectDelay = 5000; // Увеличено с 3 до 5 секунд
  private reconnectTimer: NodeJS.Timeout | null = null;
  private handlers: Map<EventType, Set<MessageHandler>> = new Map();
  private isConnecting = false;
  private isEnabled = true; // Флаг для отключения WebSocket
  private hasFailed = false; // Флаг для отслеживания неудачных попыток

  /**
   * Подключиться к WebSocket серверу
   */
  connect(wsUrl: string, token?: string): void {
    if (!this.isEnabled || this.hasFailed) {
      return; // WebSocket отключен или уже провалился
    }

    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return; // Уже подключен или подключается
    }

    this.url = wsUrl;
    this.isConnecting = true;

    try {
      // Добавляем токен в URL если есть
      const urlWithToken = token ? `${wsUrl}?token=${token}` : wsUrl;
      this.ws = new WebSocket(urlWithToken);

      this.ws.onopen = () => {
        // Логируем только в development
        if (import.meta.env.DEV) {
          console.log('WebSocket connected');
        }
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        this.hasFailed = false;
        // Удаляем флаг отключения, если подключение успешно
        if (import.meta.env.DEV) {
          localStorage.removeItem('ws_disabled');
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          // Логируем только в development
          if (import.meta.env.DEV) {
            console.error('Error parsing WebSocket message:', error);
          }
        }
      };

      this.ws.onerror = () => {
        // Не логируем ошибки, чтобы не засорять консоль
        // Браузер сам логирует ошибки WebSocket, мы не можем это предотвратить
        this.isConnecting = false;
        // Ошибка будет обработана в onclose
      };

      this.ws.onclose = (event) => {
        this.isConnecting = false;
        this.ws = null;
        
        // Если это не нормальное закрытие (код 1000), пытаемся переподключиться
        if (event.code !== 1000 && this.isEnabled && !this.hasFailed) {
          this.reconnect();
        } else if (event.code !== 1000) {
          // Если это ошибка и мы уже пытались переподключиться, отключаем WebSocket
          this.hasFailed = true;
          // Сохраняем флаг в localStorage, чтобы не пытаться подключаться при следующей загрузке
          if (import.meta.env.DEV) {
            localStorage.setItem('ws_disabled', 'true');
          }
        }
      };
    } catch (error) {
      // Не логируем ошибки в production
      if (import.meta.env.DEV) {
        console.error('WebSocket connection error:', error);
      }
      this.isConnecting = false;
      this.hasFailed = true;
    }
  }

  /**
   * Переподключение
   */
  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.hasFailed = true;
      // Не логируем в production
      if (import.meta.env.DEV) {
        console.warn('WebSocket: Max reconnection attempts reached. Real-time updates disabled.');
      }
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;
    // Логируем только в development
    if (import.meta.env.DEV) {
      console.log(`WebSocket: Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    }

    this.reconnectTimer = setTimeout(() => {
      const token = localStorage.getItem('partner_token');
      this.connect(this.url, token || undefined);
    }, this.reconnectDelay);
  }

  /**
   * Обработка входящих сообщений
   */
  private handleMessage(data: any): void {
    const type = data.type as EventType;
    
    if (!type) {
      console.warn('WebSocket message without type:', data);
      return;
    }

    // Вызываем все обработчики для этого типа события
    const handlers = this.handlers.get(type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error('Error in WebSocket handler:', error);
        }
      });
    }

    // Также вызываем обработчики для 'system' типа
    const allHandlers = this.handlers.get('system' as EventType);
    if (allHandlers) {
      allHandlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error('Error in WebSocket all handler:', error);
        }
      });
    }
  }

  /**
   * Подписаться на события определенного типа
   */
  on(eventType: EventType, handler: MessageHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    
    this.handlers.get(eventType)!.add(handler);

    // Возвращаем функцию для отписки
    return () => {
      const handlers = this.handlers.get(eventType);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  /**
   * Отписаться от событий
   */
  off(eventType: EventType, handler: MessageHandler): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Отправить сообщение на сервер
   */
  send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket is not connected. Message not sent:', data);
    }
  }

  /**
   * Отключиться от сервера
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.handlers.clear();
    this.reconnectAttempts = 0;
  }

  /**
   * Проверить статус подключения
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Включить/отключить WebSocket
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled && this.ws) {
      this.disconnect();
    }
  }

  /**
   * Сбросить флаг ошибки и попробовать подключиться снова
   */
  reset(): void {
    this.hasFailed = false;
    this.reconnectAttempts = 0;
  }

  /**
   * Проверить, был ли WebSocket отключен из-за ошибок
   */
  hasConnectionFailed(): boolean {
    return this.hasFailed;
  }
}

// Экспортируем singleton экземпляр
export const wsService = new WebSocketService();

// Хелпер для подключения с токеном из localStorage
export const connectWebSocket = (baseUrl: string = 'ws://localhost:8000/ws'): void => {
  // Проверяем, доступен ли WebSocket (только в браузере)
  if (typeof WebSocket === 'undefined') {
    return;
  }

  // Проверяем, не был ли WebSocket уже отключен из-за ошибок
  if (wsService.isConnected() || wsService.hasConnectionFailed()) {
    return;
  }

  // Проверяем переменную окружения для отключения WebSocket
  const wsEnabled = import.meta.env.VITE_WS_ENABLED !== 'false';
  if (!wsEnabled) {
    return;
  }

  // В development режиме проверяем доступность сервера перед подключением
  if (import.meta.env.DEV) {
    // Проверяем, не был ли уже установлен флаг недоступности
    const wsDisabledKey = 'ws_disabled';
    if (localStorage.getItem(wsDisabledKey) === 'true') {
      return;
    }
  }

  const token = localStorage.getItem('partner_token');
  wsService.connect(baseUrl, token || undefined);
};

