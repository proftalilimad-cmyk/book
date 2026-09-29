// ============================================================
// خدمة التجميع (INGESTION) — قلب نظام NEWS AGGREGATOR
//  SOURCE → FETCH → PARSE → NORMALIZE → DEDUPLICATE(+MERGE)
//  تُستعمل من: دورة الوكيل، زر «جلب الآن»، زر «اختبار المصدر».
//  تقبل: RSS مباشر، Google News RSS، مصادر رسمية ومواقع موثقة.
// ============================================================

import { supabase, dataMode } from '@/lib/supabaseClient';
import { loadDB } from '@/lib/store';
import { buildWirePool, type WireItem } from '@/lib/demoData';
import { fetchRssSmart, parseRss, resolveItemUrl } from '@/lib/rss';
import { findDuplicateFull, type DupTarget, type DuplicateReason } from '@/lib/dedup';
import { normalizeRawItem } from '@/lib/normalize';
import { buildImageMeta, validateDeclaredImage, type ImageCandidate } from '@/lib/images';
import { extractImageFromPage } from '@/lib/pageImage';
import { getSourceById, updateSource } from '@/services/sourceService';
import { createArticle, updateArticle } from '@/services/articleService';
import { addLog } from '@/services/settingsService';
import type { Article, Source, SourceReference } from '@/types';
import { uid } from '@/lib/utils';

const MAX_ITEMS_PER_SOURCE = 6;
/** سقف محاولات سقوط «صفحة الخبر» لكل مصدر — لا يتعطل الجلب إذا امتنعت الصفحات (6 ث/محاولة) */
export const MAX_PAGE_IMG_FETCHES = 6;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export interface FetchItemsResult {
  source: Source;
  items: WireItem[];
  error?: string;
}

/**
 * FETCH + PARSE لمصدر واحد مع تحديث سجل الجلب:
 *  - المصادر التجريبية (demo.example) → المحاكي المحلي
 *  - المصادر الحقيقية → قراءة RSS فعلية عبر سلسلة الجلب
 * يسجّل النتيجة في fetch_status / last_fetched_at / items_fetched.
 */
export async function fetchSourceItems(source: Source): Promise<FetchItemsResult> {
  const now = new Date().toISOString();
  if (!source.rss_url) {
    await updateSource(source.id, { fetch_status: 'error', fetch_error: 'لا يتوفر على رابط RSS' });
    return { source, items: [], error: 'لا يتوفر على رابط RSS' };
  }

  // المصادر التجريبية: محاكاة سلك الأنباء (للتطوير واختبار منع التكرار)
  if (source.rss_url.includes('demo.example')) {
    await sleep(300);
    const items = source.id === 'src-demo-wire' ? buildWirePool() : [];
    await updateSource(source.id, {
      last_fetched_at: now,
      fetch_status: 'ok',
      fetch_error: undefined,
      items_fetched: items.length,
    });
    return { source, items };
  }

  try {
    const { xml } = await fetchRssSmart(source.rss_url);
    const parsed = parseRss(xml);
    if (parsed.length === 0) throw new Error('تغذية فارغة أو غير صالحة');
    const items: WireItem[] = parsed.slice(0, MAX_ITEMS_PER_SOURCE).map((it) => ({
      raw_title: it.title,
      raw_body: `${it.title} — ${it.description}`,
      // Google News: نخزّن رابط الناشر الأصلي لا الرابط التحويلي (التتبع + كشف التكرار + صفحة الصورة)
      source_url: resolveItemUrl(it),
      source_published_at: it.pubDateIso,
      source_name: it.publisherName || source.name,
      publisher_url: it.publisherUrl,
      is_real: true,
      image_url: it.imageUrl,
      image_width: it.imageWidth,
      image_height: it.imageHeight,
    }));
    await updateSource(source.id, {
      last_fetched_at: now,
      fetch_status: 'ok',
      fetch_error: undefined,
      items_fetched: items.length,
    });
    return { source, items };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'fetch failed';
    await updateSource(source.id, { last_fetched_at: now, fetch_status: 'error', fetch_error: msg });
    return { source, items: [], error: msg };
  }
}

/** لقطة الأخبار القابلة للمقارنة (تُستثنى نسخ DUPLICATE — الدمج يتم مع الرئيسي) */
export async function buildDedupSnapshot(): Promise<DupTarget[]> {
  let articles: Article[] = [];
  if (dataMode === 'supabase' && supabase) {
    const { data } = await supabase
      .from('articles')
      .select('id, title, normalized_title, source_url, canonical_url, content_hash, source_published_at, published_at, status, duplicate_group_id')
      .neq('status', 'duplicate')
      .order('created_at', { ascending: false })
      .limit(500);
    articles = (data ?? []) as unknown as Article[];
  } else {
    articles = loadDB().articles.filter((a) => a.status !== 'duplicate');
  }
  return articles.map((a) => ({
    id: a.id,
    title: a.title,
    normalized_title: a.normalized_title,
    source_url: a.source_url,
    canonical_url: a.canonical_url,
    content_hash: a.content_hash,
    published_at: a.source_published_at ?? a.published_at,
    duplicate_group_id: a.duplicate_group_id,
  }));
}

export interface IngestReport {
  found: number;
  added: number;
  duplicates: number;
  merged: number;
  error?: string;
}

/**
 * معالجة مواد مصدر واحد: NORMALIZE → DEDUPLICATE → MERGE/CREATE
 *  - خبر جديد: مقال بحالة FETCHED مع الحقول القانونية
 *  - خبر مكرر: الدمج في الخبر الرئيسي عبر source_references[]
 *    + سجل DUPLICATE للتتبع (يشير إلى مجموعة التكرار)
 */
export async function ingestOneSource(
  source: Source,
  opts: { onProgress?: (msg: string) => void; snapshot?: DupTarget[] } = {},
): Promise<IngestReport> {
  const report: IngestReport = { found: 0, added: 0, duplicates: 0, merged: 0 };
  let pageImgFetches = 0;
  const result = await fetchSourceItems(source);
  if (result.error) {
    report.error = result.error;
    await addLog('warn', 'INGEST_FETCH_ERR', `تعذّر جلب «${source.name}» — ${result.error}`);
    return report;
  }

  report.found = result.items.length;
  const snapshot = opts.snapshot ?? (await buildDedupSnapshot());

  for (const item of result.items) {
    // NORMALIZE
    const norm = normalizeRawItem(item);
    // DEDUPLICATE (المعايير الخمسة)
    const dup = findDuplicateFull(
      {
        title: norm.title,
        normalized_title: norm.normalized_title,
        source_url: norm.source_url,
        canonical_url: norm.canonical_url,
        content_hash: norm.content_hash,
        published_at: norm.source_published_at,
      },
      snapshot,
    );

    const ref: SourceReference = {
      name: norm.publisher_name || source.name,
      url: norm.source_url,
      published_at: norm.source_published_at,
    };

    // استخراج الصورة قبل قرار التكرار (الصور → التحقق → الحقوق → إزالة التكرار)
    // RSS المصرّح أولاً — الصورة المرفوضة تُسجّل INVALID بدل إسقاطها بصمت
    let declaredInvalidUrl: string | undefined;
    let imageCandidate: ImageCandidate | null = null;
    if (item.image_url) {
      const verdict = validateDeclaredImage(item.image_url, item.image_width, item.image_height);
      imageCandidate = verdict.candidate;
      if (verdict.invalid) declaredInvalidUrl = item.image_url;
    }
    if (!imageCandidate && !declaredInvalidUrl && item.is_real && pageImgFetches < MAX_PAGE_IMG_FETCHES) {
      pageImgFetches += 1;
      imageCandidate = await extractImageFromPage(norm.source_url);
    }
    const imageMeta = buildImageMeta({
      extracted: imageCandidate,
      publisherName: ref.name,
      sourcePageUrl: norm.source_url,
      title: norm.title,
      category: source.category_slug ?? 'maroc',
      invalidUrl: declaredInvalidUrl,
    });

    if (dup.match && dup.target?.id) {
      report.duplicates += 1;
      // دمج المصدر في الخبر الرئيسي (لا نشر مكرر للحدث نفسه أبداً)
      const mainId = dup.target.duplicate_group_id ?? dup.target.id;
      const main = loadDB().articles.find((a) => a.id === mainId) ?? loadDB().articles.find((a) => a.id === dup.target!.id);
      if (main) {
        if (await mergeSourceReference(main.id, ref)) {
          report.merged += 1;
        }
        // سجل تكرار للتتبع والإحصاء (لا يظهر للعموم)
        await createArticle({
          title: norm.title,
          summary: `نسخة مكررة من الخبر الرئيسي «${main.title.slice(0, 70)}» — سبب الكشف: ${dupReasonAr(dup.reason)}. تم الدمج في مجموعة ${main.duplicate_group_id ?? main.id}.`,
          content: '',
          category: source.category_slug ?? 'maroc',
          tags: [],
          ...imageMeta,
          source_name: ref.name,
          source_url: ref.url,
          source_published_at: ref.published_at,
          canonical_url: norm.canonical_url,
          normalized_title: norm.normalized_title,
          content_hash: norm.content_hash,
          duplicate_group_id: main.duplicate_group_id ?? main.id,
          source_references: [ref],
          status: 'duplicate',
          is_demo: item.is_real ? false : true,
          agent_log: [
            { at: new Date().toISOString(), step: 'DUPLICATE', note: `تكرار (${dup.reason}) — دُمج في الخبر الرئيسي ${main.id}` },
          ],
        });
        // أضف النسخة للقطة لالتقاط تكرارات لاحقة للحدث نفسه
        snapshot.push({
          id: main.id,
          title: norm.title,
          normalized_title: norm.normalized_title,
          canonical_url: norm.canonical_url,
          source_url: norm.source_url,
          content_hash: norm.content_hash,
          published_at: norm.source_published_at,
          duplicate_group_id: main.duplicate_group_id ?? main.id,
        });
        await addLog('info', 'DEDUP_MERGE', `دمج «${norm.title.slice(0, 60)}…» في الخبر الرئيسي (${dup.reason}) — ${main.id.slice(0, 8)}`);
      }
      continue;
    }

    // خبر جديد فعلاً → FETCHED
    const draft = await createArticle({
      title: norm.title,
      summary: norm.body.slice(0, 200),
      content: `<raw>${norm.body}</raw>`,
      category: source.category_slug ?? 'maroc',
      tags: [],
      ...imageMeta,
      source_name: ref.name,
      source_url: ref.url,
      source_published_at: ref.published_at,
      canonical_url: norm.canonical_url,
      normalized_title: norm.normalized_title,
      content_hash: norm.content_hash,
      duplicate_group_id: undefined, // يُضبط على معرفه بعد الإنشاء
      source_references: [ref],
      status: 'fetched',
      is_demo: item.is_real ? false : true,
      agent_log: [
        { at: new Date().toISOString(), step: 'NEW', note: `رُصدت المادة من «${ref.name}»` },
        { at: new Date().toISOString(), step: 'FETCHED', note: 'جُلبت وطُبّعت (رابط قانوني + عنوان مطبّع + بصمة)' },
      ],
    });
    const groupId = uid();
    await updateArticle(draft.id, { duplicate_group_id: groupId });
    report.added += 1;
    snapshot.push({
      id: draft.id,
      title: norm.title,
      normalized_title: norm.normalized_title,
      source_url: norm.source_url,
      canonical_url: norm.canonical_url,
      content_hash: norm.content_hash,
      published_at: norm.source_published_at,
      duplicate_group_id: groupId,
    });
    opts.onProgress?.(`+ جديد: ${norm.title.slice(0, 50)}…`);
    await addLog('info', 'INGEST_NEW', `مادة جديدة (FETCHED): ${norm.title.slice(0, 70)}…`, { id: draft.id });
  }

  return report;
}

/** دمج مصدر جديد في الخبر الرئيسي (لا ينشر الحدث مرتين أبداً) */
export async function mergeSourceReference(mainId: string, ref: SourceReference): Promise<boolean> {
  const db = loadDB();
  const main = db.articles.find((a) => a.id === mainId);
  if (!main) return false;
  const refs = [...(main.source_references ?? [])];
  if (refs.some((r) => r.url === ref.url)) return false;
  refs.push(ref);
  await updateArticle(main.id, {
    source_references: refs,
    duplicate_group_id: main.duplicate_group_id ?? main.id,
  });
  return true;
}

export function dupReasonAr(reason?: DuplicateReason): string {
  switch (reason) {
    case 'url': return 'تطابق الرابط';
    case 'canonical': return 'تطابق الرابط القانوني';
    case 'title-similarity': return 'تشابه العنوان';
    case 'content': return 'تشابه المحتوى';
    case 'event': return 'الحدث نفسه من مصادر متعددة';
    default: return 'غير محدد';
  }
}

// ------------------------------------------------------------
// إجراءات لوحة التحكم على مصدر واحد
// ------------------------------------------------------------

/** «Test Source» — اختبار فوري للتغذية دون إدخال أي مادة */
export async function testSource(id: string): Promise<{
  ok: boolean;
  count: number;
  samples: string[];
  error?: string;
}> {
  const source = await getSourceById(id);
  if (!source) return { ok: false, count: 0, samples: [], error: 'المصدر غير موجود' };
  const result = await fetchSourceItems(source);
  if (result.error) return { ok: false, count: 0, samples: [], error: result.error };
  return {
    ok: true,
    count: result.items.length,
    samples: result.items.slice(0, 3).map((i) => i.raw_title),
  };
}

/** «Fetch Now» — تشغيل التجميع فوراً على مصدر واحد */
export async function fetchSourceNow(id: string, onProgress?: (msg: string) => void): Promise<IngestReport> {
  const source = await getSourceById(id);
  if (!source) {
    return { found: 0, added: 0, duplicates: 0, merged: 0, error: 'المصدر غير موجود' };
  }
  onProgress?.(`جلب: ${source.name}…`);
  return ingestOneSource(source, { onProgress });
}
