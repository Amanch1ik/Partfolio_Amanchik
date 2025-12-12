/**
 * Сервис для синхронизации баланса кошелька между сайтом и приложением
 */

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
    try {
      // TODO: Добавить endpoint в partnerApi
      // В production используем относительный путь
      const IS_PROD = import.meta.env.PROD;
      const apiBase = IS_PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:8000');
      const response = await fetch(`${apiBase}/api/v1/wallet/balance?user_id=${userId}`, {
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

    try {
      // В production используем относительный путь
      const IS_PROD = import.meta.env.PROD;
      const apiBase = IS_PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:8000');
      const response = await fetch(`${apiBase}/api/v1/wallet/sync`, {
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

