// ============================================================
// استخراج الصورة من الصفحة الأصلية للخبر (المستوى الثاني)
//  يُستدعى فقط عندما لا تصرّح التغذية بأي صورة —
//  يقرأ og:image ثم twitter:image ثم الصورة الرئيسية للمقال.
// ============================================================

import { fetchTextSmart } from '@/lib/rss';
import { extractImageFromHtml, type PageImageExtraction } from '@/lib/images';

/** جلب صفحة المقال عبر سلسلة القنوات واستخراج أفضل صورة مرتبطة */
export async function extractImageFromPage(pageUrl: string): Promise<PageImageExtraction | null> {
  try {
    if (!/^https?:\/\//i.test(pageUrl) || pageUrl.includes('demo.example')) return null;
    const { text } = await fetchTextSmart(pageUrl, {
      contentPattern: /<meta|<img|<html/i,
      timeoutMs: 6000,
      minLen: 400,
    });
    return extractImageFromHtml(text, pageUrl);
  } catch {
    return null; // صفحة غير قابلة للوصول — سيُعتمد التراجع للصورة الافتراضية
  }
}
