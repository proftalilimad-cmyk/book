// ============================================================
// أدوات مساعدة عامة
// ============================================================

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
  ).toLowerCase();
}

export function slugifyAr(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 90);
}

const arDateFmt = new Intl.DateTimeFormat('ar-MA-u-nu-latn', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const arTimeFmt = new Intl.DateTimeFormat('ar-MA-u-nu-latn', {
  hour: '2-digit',
  minute: '2-digit',
});

export function formatFullDate(iso: string | Date): string {
  try {
    return arDateFmt.format(typeof iso === 'string' ? new Date(iso) : iso);
  } catch {
    return '';
  }
}

export function formatTime(iso: string): string {
  try {
    return arTimeFmt.format(new Date(iso));
  } catch {
    return '';
  }
}

/** «قبل 3 ساعات» / «منذ يومين» … */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const rtf = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' });
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'الآن';
  if (minutes < 60) return rtf.format(-minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (hours < 24) return rtf.format(-hours, 'hour');
  const days = Math.round(hours / 24);
  if (days < 30) return rtf.format(-days, 'day');
  const months = Math.round(days / 30);
  if (months < 12) return rtf.format(-months, 'month');
  return rtf.format(-Math.round(months / 12), 'year');
}

export function stripHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

export function excerpt(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : clean.slice(0, max - 1).trim() + '…';
}

export function readingMinutes(html: string): number {
  const words = stripHtml(html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 180));
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + ' مليون';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + ' ألف';
  return String(n);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** توزيع شبه عشوائي ثابت (Deterministic) لتوليد مشاهدات تجريبية واقعية */
export function seededRandom(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

export const SITE_URL =
  (import.meta.env as ImportMetaEnv | undefined)?.VITE_SITE_URL || 'https://newsmaroc.ma';

export const SITE_NAME = 'NEWS MAROC';
