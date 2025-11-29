import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Создаем Supabase клиент только если переменные окружения установлены
// Иначе возвращаем null, чтобы не блокировать запуск приложения
export const supabase: SupabaseClient | null = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Предупреждение в консоли, если Supabase не настроен (только в development)
if (import.meta.env.DEV && !supabase) {
  console.warn('Supabase не настроен. Переменные окружения VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY не установлены.');
}
