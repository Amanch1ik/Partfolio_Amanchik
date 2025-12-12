export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  avatar_url?: string;
  phone_verified: boolean;
  email_verified: boolean;
  is_active: boolean;
  is_blocked: boolean;
  created_at: string;
  last_login_at?: string;
  // Баланс кошелька пользователя (используется в UsersPage)
  balance?: number;
}

export interface Partner {
  id: number;
  name: string;
  description?: string;
  category: string;
  logo_url?: string;
  cover_image_url?: string;
  phone?: string;
  email?: string;
  max_discount_percent: number;
  cashback_rate: number;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  // Дополнительные поля, используемые на странице партнёров
  status?: 'active' | 'inactive' | 'pending' | 'rejected' | string;
  latitude?: number;
  longitude?: number;
}

export interface Transaction {
  id: number;
  user_id: number;
  type: 'topup' | 'discount' | 'bonus' | 'refund';
  amount: number;
  balance_before: number;
  balance_after: number;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
}

export interface Order {
  id: number;
  user_id: number;
  partner_id: number;
  order_total: number | string;
  discount: number | string;
  final_amount: number | string;
  status?: 'pending' | 'completed' | 'cancelled' | 'refunded';
  payment_method?: string;
  currency?: string;
  created_at: string;
  updated_at?: string;
}

export interface Wallet {
  id: number;
  user_id: number;
  balance: number;
  last_updated: string;
}

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  notification_type: 'push' | 'sms' | 'email' | 'in_app';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'sent' | 'failed' | 'delivered' | 'read';
  created_at: string;
  sent_at?: string;
}

export interface Achievement {
  id: number;
  name: string;
  description: string;
  category: 'transaction' | 'referral' | 'loyalty' | 'social' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
  icon?: string;
  is_active: boolean;
  created_at: string;
}

export interface AchievementStats {
  total_achievements: number;
  active_achievements: number;
  by_category: Record<string, number>;
  by_rarity: Record<string, number>;
}

export interface Promotion {
  id: number;
  title: string;
  description?: string;
  category: string;
  promotion_type: string;
  partner_id?: number;
  discount_percent?: number;
  discount_amount?: number;
  start_date: string;
  end_date: string;
  status: 'draft' | 'active' | 'paused' | 'expired' | 'cancelled';
  usage_count: number;
  created_at: string;
}

export interface DashboardStats {
  total_users: number;
  active_users?: number;
  active_partners: number;
  total_transactions: number;
  total_revenue: number;
  total_yess_coin?: number;
  users_growth: number;
  revenue_growth: number;
  active_users_by_hour?: Array<{ hour: number; count: number }>;
  revenue_by_day?: Array<{ date: string; amount: number }>;
  transactions_by_status?: Array<{ status: string; count: number }>;
  // Дополнительные поля для расширенной аналитики дашборда
  users_by_city?: Array<{ city: string; count: number }>;
  transaction_types?: Array<{ type: string; count: number }>;
  revenue_trend?: Array<{ date: string; amount: number }>;
  partner_performance?: Array<{ partner_id: number; name?: string; revenue?: number }>;
  average_order?: number;
  conversion_rate?: number;
  retention_rate?: number;
  lifetime_value?: number;
  total_partners?: number;
}

export interface AdminUser {
  id: string;
  email: string;
  username?: string;
  avatar_url?: string;
  role: 'admin' | 'partner_admin';
}

export interface AdminNotification {
  id: number;
  title: string;
  message: string;
  type: string;
  segment: string;
  scheduled_for?: string;
  sent_at?: string;
  created_at: string;
  is_read?: boolean;
}

export interface Referral {
  id: number;
  referrer_id: number;
  referred_id: number;
  bonus_amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_id: number;
  action: string;
  resource_type: string;
  resource_id: number;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface SettingsData {
  categories: any[];
  cities: any[];
  limits: Record<string, any>;
  api_keys: any[];
  [key: string]: any;
}