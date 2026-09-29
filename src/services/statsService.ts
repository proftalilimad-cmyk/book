// ============================================================
// إحصائيات لوحة التحكم
// ============================================================

import { supabase, dataMode } from '@/lib/supabaseClient';
import { loadDB } from '@/lib/store';
import type { AdminStats } from '@/types';

export async function getAdminStats(): Promise<AdminStats> {
  if (dataMode === 'supabase' && supabase) {
    const sb = supabase;
    const count = async (table: string, fn?: (q: any) => any) => {
      let q = sb.from(table).select('*', { count: 'exact', head: true });
      if (fn) q = fn(q);
      const { count: c } = await q;
      return c ?? 0;
    };
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data: viewsData } = await supabase.from('articles').select('views');
    const totalViews = (viewsData ?? []).reduce((s: number, r: any) => s + (r.views ?? 0), 0);
    return {
      totalArticles: await count('articles'),
      todayArticles: await count('articles', (q) => q.gte('created_at', todayStart.toISOString())),
      publishedArticles: await count('articles', (q) => q.eq('status', 'published')),
      pendingReview: await count('articles', (q) => q.eq('status', 'pending_review')),
      breakingArticles: await count('articles', (q) => q.eq('is_breaking', true).eq('status', 'published')),
      totalSources: await count('sources'),
      activeSources: await count('sources', (q) => q.eq('status', 'active')),
      totalViews,
      pendingComments: await count('comments', (q) => q.eq('status', 'pending')),
    };
  }

  const db = loadDB();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return {
    totalArticles: db.articles.length,
    todayArticles: db.articles.filter((a) => new Date(a.created_at) >= todayStart).length,
    publishedArticles: db.articles.filter((a) => a.status === 'published').length,
    pendingReview: db.articles.filter((a) => a.status === 'pending_review').length,
    breakingArticles: db.articles.filter((a) => a.is_breaking && a.status === 'published').length,
    totalSources: db.sources.length,
    activeSources: db.sources.filter((s) => s.status === 'active').length,
    totalViews: db.articles.reduce((s, a) => s + a.views, 0),
    pendingComments: db.comments.filter((c) => c.status === 'pending').length,
  };
}
