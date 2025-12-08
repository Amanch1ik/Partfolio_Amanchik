/**
 * Сервис для синхронизации баланса кошелька между сайтом и приложением
 * Использует реальные API payments из backend (см. Swagger https://yessgo.org/docs/index.html)
 * и поддерживает demo‑режим без запросов к серверу.
 */

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

const ENV_API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || '';
const API_ROOT = ENV_API_BASE
  ? `${ENV_API_BASE.replace(/\/$/, '')}/api/v1`
  : '/api/v1';

interface WalletBalance {
  id: number;
  user_id: number;
  balance: number;
  yescoin_balance: number;
  total_earned: number;
  total_spent: number;
  last_updated: string;
}

interface SyncResult {
  success: boolean;
  yescoin_balance: number;
  last_updated: string;
  has_changes: boolean;
}

class WalletSyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private lastSyncTime: number = 0;
  private isSyncing: boolean = false;

  /**
   * Получить баланс кошелька
   */
  async getBalance(userId: number): Promise<WalletBalance | null> {
    // В demo‑режиме возвращаем фиктивный баланс без обращения к серверу
    if (DEMO_MODE) {
      return {
        id: 1,
        user_id: userId,
        balance: 1500,
        yescoin_balance: 320,
        total_earned: 5000,
        total_spent: 3500,
        last_updated: new Date().toISOString(),
      };
    }
    try {
      // Реальный backend: /api/v1/payments/balance (см. ApiEndpoints.WalletEndpoints.Balance)
      const response = await fetch(`${API_ROOT}/payments/balance?user_id=${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('partner_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch balance');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching balance:', error);
      return null;
    }
  }

  /**
   * Синхронизировать баланс
   */
  async syncBalance(userId: number, deviceId?: string): Promise<SyncResult | null> {
    if (this.isSyncing) {
      return null; // Предотвращаем параллельные синхронизации
    }

    this.isSyncing = true;

    // В demo‑режиме просто эмулируем успешную синхронизацию
    if (DEMO_MODE) {
      this.lastSyncTime = Date.now();
      return {
        success: true,
        yescoin_balance: 320,
        last_updated: new Date().toISOString(),
        has_changes: false,
      };
    }

    try {
      const response = await fetch(`${API_ROOT}/wallet/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('partner_token')}`,
        },
        body: JSON.stringify({
          user_id: userId,
          device_id: deviceId,
        }),
      });

      if (!response.ok) {
        throw new Error('Sync failed');
      }

      const result: SyncResult = await response.json();
      this.lastSyncTime = Date.now();
      
      return result;
    } catch (error) {
      console.error('Error syncing balance:', error);
      return null;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Начать автоматическую синхронизацию
   */
  startAutoSync(userId: number, interval: number = 30000): void {
    this.stopAutoSync(); // Останавливаем предыдущую синхронизацию

    // Синхронизируем сразу
    this.syncBalance(userId);

    // Затем каждые interval миллисекунд
    this.syncInterval = setInterval(() => {
      this.syncBalance(userId);
    }, interval);
  }

  /**
   * Остановить автоматическую синхронизацию
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Получить время последней синхронизации
   */
  getLastSyncTime(): number {
    return this.lastSyncTime;
  }
}

export const walletSyncService = new WalletSyncService();

