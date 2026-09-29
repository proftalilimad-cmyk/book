// ============================================================
// إعدادات الموقع + سجل الأحداث
// ============================================================

import { supabase, dataMode } from '@/lib/supabaseClient';
import { loadDB, mutate } from '@/lib/store';
import { DEFAULT_SETTINGS } from '@/lib/demoData';
import type { NewsLog, SiteSettings } from '@/types';
import { uid } from '@/lib/utils';

export async function getSettings(): Promise<SiteSettings> {
  if (dataMode === 'supabase' && supabase) {
    const { data, error } = await supabase.from('settings').select('value').eq('key', 'site').maybeSingle();
    if (error) throw new Error(error.message);
    if (data?.value) return { ...structuredClone(DEFAULT_SETTINGS), ...(data.value as SiteSettings) };
    return structuredClone(DEFAULT_SETTINGS);
  }
  return loadDB().settings;
}

export async function saveSettings(settings: SiteSettings): Promise<void> {
  if (dataMode === 'supabase' && supabase) {
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'site', value: settings }, { onConflict: 'key' });
    if (error) throw new Error(error.message);
    return;
  }
  mutate((db) => {
    db.settings = settings;
  });
}

export async function addLog(level: NewsLog['level'], action: string, message: string, meta?: Record<string, unknown>): Promise<void> {
  const entry: NewsLog = { id: uid(), at: new Date().toISOString(), level, action, message, meta };
  if (dataMode === 'supabase' && supabase) {
    await supabase.from('news_logs').insert(entry);
    return;
  }
  mutate((db) => {
    db.logs.unshift(entry);
    if (db.logs.length > 500) db.logs.splice(500);
  });
}

export async function listLogs(limit = 100): Promise<NewsLog[]> {
  if (dataMode === 'supabase' && supabase) {
    const { data, error } = await supabase
      .from('news_logs')
      .select('*')
      .order('at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []) as NewsLog[];
  }
  return loadDB().logs.slice(0, limit);
}
