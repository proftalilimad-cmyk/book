// ============================================================
// إدارة مصادر الأخبار
// ============================================================

import { supabase, dataMode } from '@/lib/supabaseClient';
import { loadDB, mutate } from '@/lib/store';
import type { Source, SourceStatus } from '@/types';
import { uid } from '@/lib/utils';

export async function listSources(): Promise<Source[]> {
  if (dataMode === 'supabase' && supabase) {
    const { data, error } = await supabase.from('sources').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Source[];
  }
  return loadDB().sources;
}

export async function getSourceById(id: string): Promise<Source | null> {
  if (dataMode === 'supabase' && supabase) {
    const { data, error } = await supabase.from('sources').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return (data ?? null) as Source | null;
  }
  return loadDB().sources.find((s) => s.id === id) ?? null;
}

export async function createSource(input: Omit<Source, 'id' | 'created_at'>): Promise<Source> {
  const source: Source = { ...input, id: uid(), created_at: new Date().toISOString() };
  if (dataMode === 'supabase' && supabase) {
    const { data, error } = await supabase.from('sources').insert(source).select().single();
    if (error) throw new Error(error.message);
    return data as Source;
  }
  mutate((db) => {
    db.sources.unshift(source);
  });
  return source;
}

export async function updateSource(id: string, patch: Partial<Source>): Promise<void> {
  if (dataMode === 'supabase' && supabase) {
    const { error } = await supabase.from('sources').update(patch).eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }
  mutate((db) => {
    const s = db.sources.find((x) => x.id === id);
    if (s) Object.assign(s, patch);
  });
}

export async function setSourceStatus(id: string, status: SourceStatus): Promise<void> {
  await updateSource(id, { status });
}

export async function deleteSource(id: string): Promise<void> {
  if (dataMode === 'supabase' && supabase) {
    const { error } = await supabase.from('sources').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }
  mutate((db) => {
    db.sources = db.sources.filter((s) => s.id !== id);
  });
}

// ------------------------------------------------------------
// إحصاءات وحدة التجميع للوحة المصادر
// ------------------------------------------------------------
export interface AggregationStats {
  totalSources: number;
  activeSources: number;
  errorSources: number; // fetch_status = error أو status = error
  lastFetchAt?: string;
  fetchedArticles: number; // مواد مُدخلة عبر التجميع (لها source_references)
  duplicates: number;
  published: number;
  needsReview: number; // pending_review + review_required
}

export async function getAggregationStats(): Promise<AggregationStats> {
  if (dataMode === 'supabase' && supabase) {
    const sb = supabase;
    const { data: sources } = await sb.from('sources').select('id, status, fetch_status, last_fetched_at');
    const list = (sources ?? []) as Source[];
    const lastFetchAt = list
      .map((s) => s.last_fetched_at)
      .filter((x): x is string => Boolean(x))
      .sort()
      .pop();
    const count = async (filter: (q: ReturnType<typeof sb.from>) => unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const q: any = filter(sb.from('articles'));
      const { count: c } = await q;
      return c ?? 0;
    };
    const [fetchedArticles, duplicates, published, needsReview] = await Promise.all([
      count((t) => t.select('id', { count: 'exact', head: true }).not('source_references', 'is', null)),
      count((t) => t.select('id', { count: 'exact', head: true }).eq('status', 'duplicate')),
      count((t) => t.select('id', { count: 'exact', head: true }).eq('status', 'published')),
      count((t) => t.select('id', { count: 'exact', head: true }).in('status', ['pending_review', 'review_required'])),
    ]);
    return {
      totalSources: list.length,
      activeSources: list.filter((s) => s.status === 'active').length,
      errorSources: list.filter((s) => s.status === 'error' || s.fetch_status === 'error').length,
      lastFetchAt,
      fetchedArticles,
      duplicates,
      published,
      needsReview,
    };
  }

  const db = loadDB();
  const lastFetchAt = db.sources
    .map((s) => s.last_fetched_at)
    .filter((x): x is string => Boolean(x))
    .sort()
    .pop();
  return {
    totalSources: db.sources.length,
    activeSources: db.sources.filter((s) => s.status === 'active').length,
    errorSources: db.sources.filter((s) => s.status === 'error' || s.fetch_status === 'error').length,
    lastFetchAt,
    fetchedArticles: db.articles.filter((a) => (a.source_references ?? []).length > 0 && a.status !== 'duplicate').length,
    duplicates: db.articles.filter((a) => a.status === 'duplicate').length,
    published: db.articles.filter((a) => a.status === 'published').length,
    needsReview: db.articles.filter((a) => a.status === 'pending_review' || a.status === 'review_required').length,
  };
}
