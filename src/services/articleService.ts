// ============================================================
// خدمة الأخبار — تعمل على Supabase عند الربط، وعلى المخزن المحلي (DEMO) بدونه.
// ============================================================

import { supabase, dataMode } from '@/lib/supabaseClient';
import { loadDB, mutate } from '@/lib/store';
import type { Article, ArticleFilter, ArticleStatus, Paged } from '@/types';
import { seededRandom, slugifyAr, uid } from '@/lib/utils';

// ---------- تحويل صفوف Supabase ----------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToArticle(r: any): Article {
  return {
    id: r.id,
    title: r.title,
    subtitle: r.subtitle ?? undefined,
    slug: r.slug,
    summary: r.summary ?? '',
    content: r.content ?? '',
    category: r.category ?? 'maroc',
    region: r.region ?? undefined,
    tags: r.tags ?? [],
    featured_image: r.featured_image ?? '',
    gallery: r.gallery ?? undefined,
    source_name: r.source_name ?? undefined,
    source_url: r.source_url ?? undefined,
    source_published_at: r.source_published_at ?? undefined,
    canonical_url: r.canonical_url ?? undefined,
    normalized_title: r.normalized_title ?? undefined,
    content_hash: r.content_hash ?? undefined,
    duplicate_group_id: r.duplicate_group_id ?? undefined,
    source_references: r.source_references ?? undefined,
    image_url: r.image_url ?? undefined,
    image_source_url: r.image_source_url ?? undefined,
    image_alt: r.image_alt ?? undefined,
    image_width: r.image_width ?? undefined,
    image_height: r.image_height ?? undefined,
    image_source_name: r.image_source_name ?? undefined,
    image_license: r.image_license ?? undefined,
    image_attribution: r.image_attribution ?? undefined,
    image_rights: r.image_rights ?? undefined,
    image_status: r.image_status ?? undefined,
    author_name: r.author_name ?? undefined,
    status: r.status as ArticleStatus,
    is_breaking: Boolean(r.is_breaking),
    is_demo: Boolean(r.is_demo),
    views: r.views ?? 0,
    published_at: r.published_at ?? r.created_at,
    created_at: r.created_at,
    updated_at: r.updated_at,
    meta_title: r.meta_title ?? undefined,
    meta_description: r.meta_description ?? undefined,
    keywords: r.keywords ?? undefined,
    agent_log: r.agent_log ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function articleToRow(a: Partial<Article>): Record<string, any> {
  const r: Record<string, unknown> = { ...a };
  delete r.id;
  delete r.agent_log;
  return r;
}

function applyDemoFilter(articles: Article[], f: ArticleFilter): Article[] {
  let out = [...articles];
  if (f.status) {
    const statuses = Array.isArray(f.status) ? f.status : [f.status];
    out = out.filter((a) => statuses.includes(a.status));
  }
  if (f.category) out = out.filter((a) => a.category === f.category);
  if (f.region) out = out.filter((a) => a.region === f.region);
  if (f.tag) out = out.filter((a) => a.tags.includes(f.tag!));
  if (f.breaking !== undefined) out = out.filter((a) => a.is_breaking === f.breaking);
  if (f.excludeId) out = out.filter((a) => a.id !== f.excludeId);
  if (f.search) {
    const q = f.search.trim();
    const nq = q.toLowerCase();
    out = out.filter(
      (a) =>
        a.title.toLowerCase().includes(nq) ||
        a.summary.toLowerCase().includes(nq) ||
        a.content.toLowerCase().includes(nq) ||
        a.tags.some((t) => t.toLowerCase().includes(nq)) ||
        (a.source_name ?? '').toLowerCase().includes(nq) ||
        (a.keywords ?? []).some((k) => k.toLowerCase().includes(nq)) ||
        a.category.includes(nq),
    );
  }
  return out;
}

export async function listArticles(filter: ArticleFilter = {}): Promise<Paged<Article>> {
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(60, Math.max(1, filter.pageSize ?? 10));

  if (dataMode === 'supabase' && supabase) {
    let q = supabase.from('articles').select('*', { count: 'exact' });
    if (filter.status) {
      Array.isArray(filter.status)
        ? (q = q.in('status', filter.status))
        : (q = q.eq('status', filter.status));
    }
    if (filter.category) q = q.eq('category', filter.category);
    if (filter.region) q = q.eq('region', filter.region);
    if (filter.tag) q = q.contains('tags', [filter.tag]);
    if (filter.breaking !== undefined) q = q.eq('is_breaking', filter.breaking);
    if (filter.excludeId) q = q.neq('id', filter.excludeId);
    if (filter.search) {
      const s = filter.search.replace(/[%_]/g, '');
      q = q.or(
        `title.ilike.%${s}%,summary.ilike.%${s}%,content.ilike.%${s}%,source_name.ilike.%${s}%`,
      );
    }
    q = q
      .order(filter.sort === 'views' ? 'views' : 'published_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
    const { data, count, error } = await q;
    if (error) throw new Error(error.message);
    const total = count ?? 0;
    return {
      items: (data ?? []).map(rowToArticle),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  // DEMO MODE
  const db = loadDB();
  const filtered = applyDemoFilter(db.articles, filter);
  filtered.sort((a, b) =>
    filter.sort === 'views'
      ? b.views - a.views
      : new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
  );
  const total = filtered.length;
  const items = filtered.slice((page - 1) * pageSize, page * pageSize);
  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  if (dataMode === 'supabase' && supabase) {
    const { data, error } = await supabase.from('articles').select('*').eq('slug', slug).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? rowToArticle(data) : null;
  }
  return loadDB().articles.find((a) => a.slug === slug) ?? null;
}

export async function getArticleById(id: string): Promise<Article | null> {
  if (dataMode === 'supabase' && supabase) {
    const { data, error } = await supabase.from('articles').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? rowToArticle(data) : null;
  }
  return loadDB().articles.find((a) => a.id === id) ?? null;
}

export async function getRelatedArticles(article: Article, limit = 4): Promise<Article[]> {
  const res = await listArticles({
    category: article.category,
    status: 'published',
    excludeId: article.id,
    pageSize: limit,
  });
  if (res.items.length >= limit) return res.items;
  const extra = await listArticles({ status: 'published', excludeId: article.id, pageSize: limit });
  const merged = [...res.items];
  for (const a of extra.items) {
    if (merged.length >= limit) break;
    if (!merged.some((m) => m.id === a.id)) merged.push(a);
  }
  return merged;
}

export async function getBreakingArticles(limit = 8): Promise<Article[]> {
  const res = await listArticles({ status: 'published', breaking: true, pageSize: limit });
  return res.items;
}

export type MostReadPeriod = 'today' | 'week' | 'month';

export async function getMostRead(period: MostReadPeriod, limit = 5): Promise<Array<Article & { period_views: number }>> {
  if (dataMode === 'supabase' && supabase) {
    const { data, error } = await supabase.rpc('most_read', { p_period: period, p_limit: limit });
    if (error) {
      const res = await listArticles({ status: 'published', sort: 'views', pageSize: limit });
      return res.items.map((a) => ({ ...a, period_views: a.views }));
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((r: any) => ({ ...rowToArticle(r), period_views: r.period_views ?? 0 }));
  }
  const db = loadDB();
  const nowMs = Date.now();
  const spanMs = period === 'today' ? 86_400_000 : period === 'week' ? 7 * 86_400_000 : 30 * 86_400_000;
  const factors = { today: [0.015, 0.06], week: [0.08, 0.25], month: [0.25, 0.85] } as const;
  const [lo, hi] = factors[period];
  const scored = db.articles
    .filter((a) => a.status === 'published')
    .map((a) => {
      const base = Math.floor(a.views * (lo + seededRandom(a.id + period) * (hi - lo)));
      const events = db.views.filter(
        (v) => v.article_id === a.id && nowMs - new Date(v.at).getTime() <= spanMs,
      ).length;
      return { ...a, period_views: base + events };
    })
    .sort((a, b) => b.period_views - a.period_views)
    .slice(0, limit);
  return scored;
}

export async function incrementView(id: string): Promise<void> {
  if (dataMode === 'supabase' && supabase) {
    await supabase.rpc('increment_view', { p_article: id });
    return;
  }
  mutate((db) => {
    const a = db.articles.find((x) => x.id === id);
    if (a) {
      a.views += 1;
      db.views.push({ article_id: id, at: new Date().toISOString() });
      if (db.views.length > 5000) db.views.splice(0, db.views.length - 5000);
    }
  });
}

// ------------------------------------------------------------
// إدارة الأخبار (CRUD)
// ------------------------------------------------------------
export async function createArticle(input: Partial<Article>): Promise<Article> {
  const now = new Date().toISOString();
  const base: Article = {
    id: uid(),
    title: input.title ?? 'بدون عنوان',
    subtitle: input.subtitle,
    slug: input.slug || `${slugifyAr(input.title ?? 'article')}-${Math.random().toString(36).slice(2, 6)}`,
    summary: input.summary ?? '',
    content: input.content ?? '',
    category: input.category ?? 'maroc',
    region: input.region,
    tags: input.tags ?? [],
    featured_image: input.featured_image ?? '/demo-images/maroc-0.svg',
    gallery: input.gallery,
    source_name: input.source_name,
    source_url: input.source_url,
    source_published_at: input.source_published_at,
    canonical_url: input.canonical_url,
    normalized_title: input.normalized_title,
    content_hash: input.content_hash,
    duplicate_group_id: input.duplicate_group_id,
    source_references: input.source_references,
    image_url: input.image_url,
    image_source_url: input.image_source_url,
    image_alt: input.image_alt,
    image_width: input.image_width,
    image_height: input.image_height,
    image_source_name: input.image_source_name,
    image_license: input.image_license,
    image_attribution: input.image_attribution,
    image_rights: input.image_rights,
    image_status: input.image_status,
    author_name: input.author_name,
    status: input.status ?? 'draft',
    is_breaking: input.is_breaking ?? false,
    is_demo: input.is_demo ?? (dataMode === 'demo'),
    views: input.views ?? 0,
    published_at: input.published_at ?? now,
    created_at: now,
    updated_at: now,
    meta_title: input.meta_title,
    meta_description: input.meta_description,
    keywords: input.keywords,
    agent_log: input.agent_log,
  };

  if (dataMode === 'supabase' && supabase) {
    const { data, error } = await supabase
      .from('articles')
      .insert({ ...articleToRow(base), agent_log: base.agent_log ?? null })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return rowToArticle(data);
  }
  mutate((db) => {
    if (db.articles.some((a) => a.slug === base.slug)) {
      base.slug = `${base.slug}-${Math.random().toString(36).slice(2, 4)}`;
    }
    db.articles.unshift(base);
  });
  return base;
}

export async function updateArticle(id: string, patch: Partial<Article>): Promise<Article> {
  const updated = { ...patch, updated_at: new Date().toISOString() };
  if (dataMode === 'supabase' && supabase) {
    const { data, error } = await supabase
      .from('articles')
      .update({ ...articleToRow(updated), agent_log: patch.agent_log })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return rowToArticle(data);
  }
  let result: Article | undefined;
  mutate((db) => {
    const a = db.articles.find((x) => x.id === id);
    if (a) {
      Object.assign(a, updated);
      result = a;
    }
  });
  if (!result) throw new Error('المقال غير موجود');
  return result;
}

export async function deleteArticle(id: string): Promise<void> {
  if (dataMode === 'supabase' && supabase) {
    const { error } = await supabase.from('articles').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }
  mutate((db) => {
    db.articles = db.articles.filter((a) => a.id !== id);
    db.comments = db.comments.filter((c) => c.article_id !== id);
    db.views = db.views.filter((v) => v.article_id !== id);
  });
}

export async function setArticleStatus(id: string, status: ArticleStatus): Promise<void> {
  await updateArticle(id, {
    status,
    ...(status === 'published' ? { published_at: new Date().toISOString() } : {}),
  });
}

export async function setBreaking(id: string, breaking: boolean): Promise<void> {
  await updateArticle(id, { is_breaking: breaking });
}
