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
      const partnerApi = await import('./partnerApi');
      const response = await partnerApi.default.getWalletBalance(userId);
      return response.data;
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
      const partnerApi = await import('./partnerApi');
      const response = await partnerApi.default.syncWallet(userId, deviceId);
      const result: SyncResult = response.data;
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

