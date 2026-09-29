import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const env = import.meta.env as ImportMetaEnv | undefined;
const url = env?.VITE_SUPABASE_URL?.trim();
const anonKey = env?.VITE_SUPABASE_ANON_KEY?.trim();

/**
 * إذا تم ضبط متغيرات Supabase نعمل بوضع «الإنتاج الحقيقي»،
 * وإلا يعمل الموقع محلياً بوضع العرض التجريبي (DEMO) مع بيانات موسومة بوضوح.
 */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

export const isSupabase = supabase !== null;
export const dataMode: 'supabase' | 'demo' = isSupabase ? 'supabase' : 'demo';
