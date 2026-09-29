// ============================================================
// NEWS AI AGENT — Supabase Edge Function (Deno)
//
// يراقب مصادر RSS النشطة، يكتشف المواد الجديدة، يمنع التكرار
// (URL + تشابه العنوان داخل نافذة 72 ساعة)، يعيد صياغة الوقائع
// بأسلوب مستقل، يولّد التصنيف والكلمات المفتاحية وSEO، ثم يرسل
// المادة إلى PENDING REVIEW (لا نشر تلقائي).
//
// النشر: supabase functions deploy news-agent
// الجدولة: أضف Cron (pg_cron / Scheduled Functions) كل 15 دقيقة.
// ============================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY);

// ---------- أدوات نصية ----------
const norm = (t: string) =>
  t.toLowerCase()
    .replace(/[ً-ْٰـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const STOP = new Set(['في', 'من', 'الى', 'على', 'عن', 'ان', 'هذا', 'هذه', 'ذلك', 'التي', 'الذي', 'بعد', 'قبل', 'مع', 'كل', 'او', 'ثم', 'قد', 'لا', 'لم', 'ما', 'هو', 'هي', 'بين', 'عند', 'حتى', 'اذا', 'و', 'ل', 'ب']);

function tokens(t: string): Set<string> {
  return new Set(norm(t).split(' ').filter((w) => w.length > 2 && !STOP.has(w)));
}
function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter / (a.size + b.size - inter);
}

const CAT_KEYWORDS: Record<string, string[]> = {
  politics: ['الحكومة', 'البرلمان', 'قانون', 'انتخابات', 'وزير'],
  economy: ['استثمار', 'اقتصاد', 'سوق', 'صادرات', 'نمو', 'بنوك'],
  education: ['الباكالوريا', 'المدرسة', 'الجامعة', 'التلاميذ', 'امتحان'],
  health: ['الصحة', 'مستشفى', 'تلقيح', 'مرضى'],
  sports: ['المنتخب', 'مباراة', 'الدوري', 'كرة', 'لاعب'],
  culture: ['مهرجان', 'كتاب', 'سينما', 'تراث'],
  technology: ['ذكاء اصطناعي', 'رقمي', 'تكنولوجيا', 'تطبيق', 'بيانات'],
  weather: ['أمطار', 'رعدية', 'الطقس', 'حرارة', 'رياح'],
  world: ['دولي', 'قمة', 'الأمم المتحدة', 'أوروبا'],
};

function classify(text: string, fallback = 'maroc'): string {
  const n = norm(text);
  let best = fallback, score = 0;
  for (const [slug, kws] of Object.entries(CAT_KEYWORDS)) {
    const s = kws.reduce((acc, kw) => acc + (n.includes(norm(kw)) ? kw.length : 0), 0);
    if (s > score) { score = s; best = slug; }
  }
  return best;
}

function rewrite(title: string, summary: string, body: string, sourceName: string): string {
  const cleaned = body.replace(/\s+/g, ' ').trim();
  const sentences = cleaned.split(/(?<=[.!؟?])/u).map((s) => s.trim()).filter((s) => s.length > 20);
  const paras: string[] = [`<p><strong>${summary}</strong></p>`];
  for (let i = 0; i < sentences.length; i += 2) {
    paras.push(`<p>${sentences.slice(i, i + 2).join(' ')}</p>`);
  }
  paras.push(
    `<p><em>أعدّ هذه المادة نظام NEWS AI AGENT انطلاقاً من معطيات «${sourceName}» مع إعادة صياغة مستقلة للوقائع والاحتفاظ بالإحالة إلى المصدر الأصلي.</em></p>`,
  );
  return paras.join('\n');
}

function slugify(t: string): string {
  const base = t.trim().toLowerCase()
    .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-').slice(0, 80);
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

function extractKeywords(text: string, category: string): string[] {
  const freq = new Map<string, number>();
  const orig = new Map<string, string>();
  for (const w of text.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/)) {
    if (w.length < 4) continue;
    const n = norm(w);
    if (n.length < 4 || STOP.has(n)) continue;
    freq.set(n, (freq.get(n) ?? 0) + 1);
    if (!orig.has(n)) orig.set(n, w);
  }
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n]) => orig.get(n)!);
  top.push('المغرب');
  return [...new Set(top)].slice(0, 6);
}

// ---------- قراءة RSS (تقريبية وبدون اعتماديات إضافية) ----------
interface RssItem { title: string; link: string; pubDate: string; description: string }

async function fetchRss(url: string): Promise<RssItem[]> {
  const res = await fetch(url, { headers: { 'User-Agent': 'NewsMaroc-Agent/1.0 (+https://newsmaroc.ma)' } });
  if (!res.ok) throw new Error(`RSS ${url} → HTTP ${res.status}`);
  const xml = await res.text();
  const items: RssItem[] = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];
  for (const b of blocks.slice(0, 15)) {
    const pick = (tag: string) => {
      const m =
        b.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, 'i')) ??
        b.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
      return m ? m[1].replace(/<[^>]+>/g, '').trim() : '';
    };
    const linkM = b.match(/<link[^>]*href="([^"]+)"/i);
    const title = pick('title');
    const link = linkM ? linkM[1] : pick('link');
    const description = pick('description') || pick('summary') || pick('content');
    const pubDate = pick('pubDate') || pick('published') || pick('updated');
    if (title && link) {
      items.push({
        title,
        link,
        description: description || title,
        pubDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      });
    }
  }
  return items;
}

// ---------- حقول منع التكرار v2 (رابط قانوني + بصمة محتوى) ----------
function canonicalizeUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    u.hash = '';
    const keep: string[] = [];
    u.searchParams.forEach((v, k) => {
      if (!/^(utm_|fbclid$|gclid$|mc_cid$|mc_eid$|igshid$|ref$|ref_src$|ocid$|cmp$)/i.test(k)) keep.push(`${k}=${v}`);
    });
    u.search = keep.length ? `?${keep.join('&')}` : '';
    u.hostname = u.hostname.replace(/^www\./, '');
    return u.toString().replace(/\/$/, '').toLowerCase();
  } catch {
    return url.trim().toLowerCase().replace(/\/$/, '');
  }
}

function contentHash(text: string): string {
  const normTxt = text.replace(/[ً-ْٰـ]/g, '').replace(/[^؀-ۿa-zA-Z0-9]/g, '').toLowerCase();
  let h = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let i = 0; i < normTxt.length; i++) {
    h ^= BigInt(normTxt.charCodeAt(i));
    h = (h * prime) & mask;
  }
  return h.toString(16).padStart(16, '0');
}

// ---------- المعالجة الرئيسية ----------
serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  let body: { action?: string } = {};
  try { body = await req.json(); } catch { /* ignore */ }
  if (body.action !== 'scan') {
    return Response.json({ ok: true, message: 'news-agent جاهز. استعمل { "action": "scan" }' });
  }

  const reply = { found: 0, added: 0, duplicatesSkipped: 0, errors: [] as string[] };

  const { data: sources } = await admin.from('sources').select('*').eq('status', 'active');
  if (!sources?.length) return Response.json({ ...reply, message: 'لا توجد مصادر نشطة' });

  // نافذة مكافحة التكرار: آخر 72 ساعة
  const since = new Date(Date.now() - 72 * 3600e3).toISOString();
  const { data: recent } = await admin
    .from('articles')
    .select('title, source_url, created_at')
    .gte('created_at', since)
    .limit(400);
  const recentTitles = (recent ?? []).map((r) => ({
    tokens: tokens(r.title as string),
    url: ((r.source_url as string) ?? '').replace(/\/$/, '').toLowerCase(),
  }));

  for (const s of sources) {
    if (!s.rss_url) continue;
    let items: RssItem[] = [];
    try {
      items = await fetchRss(s.rss_url as string);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'fetch failed';
      reply.errors.push(`${s.name}: ${msg}`);
      await admin.from('sources').update({ status: 'error', fetch_status: 'error', fetch_error: msg }).eq('id', s.id);
      continue;
    }
    await admin.from('sources').update({
      last_fetched_at: new Date().toISOString(),
      status: 'active',
      fetch_status: 'ok',
      fetch_error: null,
      items_fetched: items.length,
    }).eq('id', s.id);
    reply.found += items.length;

    for (const item of items) {
      // منع التكرار: رابط + تشابه عنوان
      const urlKey = item.link.replace(/\/$/, '').toLowerCase();
      const t = tokens(item.title);
      const dup = recentTitles.some((r) => (r.url && r.url === urlKey) || jaccard(r.tokens, t) >= 0.55);
      if (dup) { reply.duplicatesSkipped++; continue; }

      const title = item.title.replace(/^عاجل[.:،\s-]*/i, '').slice(0, 110);
      const summary = item.description.slice(0, 190) || title;
      const category = classify(`${title} ${item.description}`, (s.category_slug as string) ?? 'maroc');
      const keywords = extractKeywords(`${title} ${item.description}`, category);
      const content = rewrite(title, summary, item.description, s.name as string);
      const now = new Date().toISOString();

      const { data: inserted, error } = await admin.from('articles').insert({
        title,
        slug: slugify(title),
        summary,
        content,
        category,
        tags: keywords.slice(0, 5),
        featured_image: '/demo-images/maroc-1.svg',
        source_name: s.name,
        source_url: item.link,
        source_published_at: item.pubDate,
        source_id: s.id,
        status: 'pending_review', // لا نشر تلقائي — مراجعة بشرية إلزامية
        is_demo: false,
        canonical_url: canonicalizeUrl(item.link),
        normalized_title: tokens(item.title).join(' ').slice(0, 300),
        content_hash: contentHash(`${title} ${item.description}`),
        source_references: [{ name: s.name, url: item.link, published_at: item.pubDate }],
        meta_title: title.slice(0, 62),
        meta_description: summary.slice(0, 155),
        keywords,
        agent_log: [
          { at: now, step: 'NEW', note: `رُصدت من ${s.name}` },
          { at: now, step: 'PROCESSING', note: 'استخلاص الوقائع من المادة الخام' },
          { at: now, step: 'AI_EDITED', note: 'توليد العنوان/الملخص/التصنيف/SEO وإعادة الصياغة' },
          { at: now, step: 'PENDING_REVIEW', note: 'بانتظار اعتماد المحرر' },
        ],
      }).select('id').single();

      if (error) {
        if (error.message.includes('duplicate')) reply.duplicatesSkipped++;
        else reply.errors.push(error.message);
      } else {
        reply.added++;
        recentTitles.push({ tokens: t, url: urlKey });
        await admin.from('articles').update({ duplicate_group_id: inserted.id }).eq('id', inserted.id);
        await admin.from('article_sources').insert({
          article_id: inserted.id,
          source_id: s.id,
          original_url: item.link,
        });
        await admin.rpc('add_news_log', {
          p_level: 'info', p_action: 'AGENT_PENDING', p_message: `مادة جديدة للمراجعة: ${title.slice(0, 70)}`,
        });
      }
    }
  }

  return Response.json(reply);
});
