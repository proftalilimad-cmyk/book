// ============================================================
// أدوات صيانة قاعدة البيانات
//  - purgeDemoData: حذف كل الأخبار التجريبية (is_demo) نهائياً
//    + بياناتها المرتبطة (تعليقات/مشاهدات)، وإيقاف المصادر الوهمية
//    (demo.example) حتى لا تتولّد أخبار تجريبية مجدداً.
// ============================================================

import { supabase, dataMode } from '@/lib/supabaseClient';
import { loadDB, mutate } from '@/lib/store';
import { addLog } from '@/services/settingsService';
import type { Article, Source } from '@/types';

// ------------------------------------------------------------
// نسخة احتياطية لحالة وحدة التجميع (مصادر + فهرس الأخبار)
// تُلتقط قبل أي تعديل بنيوي/هجرة، ويمكن تنزيلها JSON من لوحة المصادر.
// ------------------------------------------------------------
export interface ModuleBackup {
  at: string;
  version: string;
  sources: Source[];
  articlesIndex: Array<Pick<Article, 'id' | 'title' | 'status' | 'slug' | 'source_url' | 'duplicate_group_id'>>;
  counts: { sources: number; articles: number };
}

const BACKUP_KEY = 'newsmaroc.backup.aggregation.v1';
const BACKUP_VERSION = 'aggregation-v2';

export async function backupModuleState(): Promise<ModuleBackup> {
  let sources: Source[] = [];
  let articles: ModuleBackup['articlesIndex'] = [];

  if (dataMode === 'supabase' && supabase) {
    const { data: s } = await supabase.from('sources').select('*');
    sources = (s ?? []) as Source[];
    const { data: a } = await supabase
      .from('articles')
      .select('id, title, status, slug, source_url, duplicate_group_id')
      .limit(2000);
    articles = (a ?? []) as ModuleBackup['articlesIndex'];
  } else {
    const db = loadDB();
    sources = structuredClone(db.sources);
    articles = db.articles.map((a) => ({
      id: a.id,
      title: a.title,
      status: a.status,
      slug: a.slug,
      source_url: a.source_url,
      duplicate_group_id: a.duplicate_group_id,
    }));
  }

  const backup: ModuleBackup = {
    at: new Date().toISOString(),
    version: BACKUP_VERSION,
    sources,
    articlesIndex: articles,
    counts: { sources: sources.length, articles: articles.length },
  };
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
  } catch {
    // مساحة محلية ممتلئة — يبقى التنزيل اليدوي متاحاً
  }
  await addLog('info', 'BACKUP', `نسخة احتياطية للوحدة: ${backup.counts.sources} مصدراً و ${backup.counts.articles} خبراً مفهرساً.`);
  return backup;
}

export function loadLastBackup(): ModuleBackup | null {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    return raw ? (JSON.parse(raw) as ModuleBackup) : null;
  } catch {
    return null;
  }
}

/** تنزيل النسخة الاحتياطية كملف JSON (يُستدعى من زر لوحة المصادر) */
export async function downloadModuleBackup(): Promise<void> {
  const backup = await backupModuleState();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `newsmaroc-sources-backup-${backup.at.slice(0, 19).replace(/[:T]/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export interface PurgeResult {
  removedArticles: number;
  removedComments: number;
  pausedSources: number;
}

const DEMO_HOST = 'demo.example';

export async function purgeDemoData(): Promise<PurgeResult> {
  // ---------- Supabase ----------
  if (dataMode === 'supabase' && supabase) {
    const { data: demoRows, error: selErr } = await supabase
      .from('articles')
      .select('id')
      .eq('is_demo', true);
    if (selErr) throw new Error(selErr.message);

    const ids = (demoRows ?? []).map((r: { id: string }) => r.id);
    let removedComments = 0;
    if (ids.length > 0) {
      const { data: delComments } = await supabase
        .from('comments')
        .delete()
        .in('article_id', ids)
        .select('id');
      removedComments = (delComments ?? []).length;
      const { error: delErr } = await supabase.from('articles').delete().in('id', ids);
      if (delErr) throw new Error(delErr.message);
    }

    const { data: paused } = await supabase
      .from('sources')
      .update({ status: 'paused' })
      .ilike('rss_url', `%${DEMO_HOST}%`)
      .select('id');

    const result: PurgeResult = {
      removedArticles: ids.length,
      removedComments,
      pausedSources: (paused ?? []).length,
    };
    await addLog(
      'info',
      'PURGE_DEMO',
      `حذف يدوي: ${result.removedArticles} خبراً تجريبياً و ${result.removedComments} تعليقاً مرتبطاً، وإيقاف ${result.pausedSources} مصدر وهمي.`,
    );
    return result;
  }

  // ---------- المخزن المحلي ----------
  const result: PurgeResult = { removedArticles: 0, removedComments: 0, pausedSources: 0 };
  mutate((db) => {
    const before = db.articles.length;
    db.articles = db.articles.filter((a) => !a.is_demo);
    result.removedArticles = before - db.articles.length;

    const keptIds = new Set(db.articles.map((a) => a.id));
    const commentsBefore = db.comments.length;
    db.comments = db.comments.filter((c) => keptIds.has(c.article_id));
    result.removedComments = commentsBefore - db.comments.length;
    db.views = db.views.filter((v) => keptIds.has(v.article_id));

    for (const s of db.sources) {
      if ((s.rss_url ?? '').includes(DEMO_HOST) && s.status === 'active') {
        s.status = 'paused';
        result.pausedSources += 1;
      }
    }
  });
  await addLog(
    'info',
    'PURGE_DEMO',
    `حذف يدوي: ${result.removedArticles} خبراً تجريبياً و ${result.removedComments} تعليقاً مرتبطاً، وإيقاف ${result.pausedSources} مصدر وهمي.`,
  );
  return result;
}
