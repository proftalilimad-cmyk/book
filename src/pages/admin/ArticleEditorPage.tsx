import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ImageIcon, Loader2, Save, Send, Undo2 } from 'lucide-react';
import { CATEGORIES, REGIONS } from '@/lib/demoData';
import { useQuery } from '@/hooks/useQuery';
import {
  createArticle,
  getArticleById,
  setArticleStatus,
  updateArticle,
} from '@/services/articleService';
import RichTextEditor from '@/components/admin/RichTextEditor';
import Seo from '@/components/Seo';
import { buildSeoFields } from '@/lib/rewrite';
import { slugifyAr } from '@/lib/utils';
import type { Article, ArticleStatus } from '@/types';

interface FormState {
  title: string;
  subtitle: string;
  slug: string;
  summary: string;
  content: string;
  category: string;
  region: string;
  tags: string;
  featured_image: string;
  gallery: string;
  source_name: string;
  source_url: string;
  meta_title: string;
  meta_description: string;
  is_breaking: boolean;
  status: ArticleStatus;
}

const EMPTY: FormState = {
  title: '',
  subtitle: '',
  slug: '',
  summary: '',
  content: '',
  category: 'maroc',
  region: '',
  tags: '',
  featured_image: '',
  gallery: '',
  source_name: 'غرفة الأخبار — NEWS MAROC',
  source_url: '',
  meta_title: '',
  meta_description: '',
  is_breaking: false,
  status: 'draft',
};

export default function ArticleEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;
  const { data: existing, loading } = useQuery(
    () => (id ? getArticleById(id) : Promise.resolve(null)),
    [id],
  );

  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    if (existing) {
      setForm({
        title: existing.title,
        subtitle: existing.subtitle ?? '',
        slug: existing.slug,
        summary: existing.summary,
        content: existing.content,
        category: existing.category,
        region: existing.region ?? '',
        tags: existing.tags.join(', '),
        featured_image: existing.featured_image,
        gallery: (existing.gallery ?? []).join('\n'),
        source_name: existing.source_name ?? '',
        source_url: existing.source_url ?? '',
        meta_title: existing.meta_title ?? '',
        meta_description: existing.meta_description ?? '',
        is_breaking: existing.is_breaking,
        status: existing.status,
      });
    }
  }, [existing]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const autoSeo = () => {
    const seo = buildSeoFields(form.title || 'article', form.summary || form.title);
    setForm((f) => ({
      ...f,
      meta_title: f.meta_title || seo.meta_title,
      meta_description: f.meta_description || seo.meta_description,
      slug: f.slug || `${seo.slug}`,
    }));
  };

  const payload: Partial<Article> = useMemo(
    () => ({
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || undefined,
      slug: form.slug.trim() || slugifyAr(form.title),
      summary: form.summary.trim(),
      content: form.content,
      category: form.category,
      region: form.region || undefined,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      featured_image:
        form.featured_image.trim() || `/demo-images/${form.category}-0.svg`,
      gallery: form.gallery.split('\n').map((g) => g.trim()).filter(Boolean),
      source_name: form.source_name.trim() || undefined,
      source_url: form.source_url.trim() || undefined,
      meta_title: form.meta_title.trim() || undefined,
      meta_description: form.meta_description.trim() || undefined,
      keywords: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      is_breaking: form.is_breaking,
      status: form.status,
    }),
    [form],
  );

  const save = async (publish = false) => {
    if (!form.title.trim()) {
      alert('العنوان إجباري لحفظ الخبر.');
      return;
    }
    setSaving(true);
    try {
      const data = { ...payload, ...(publish ? { status: 'published' as const } : {}) };
      let articleId = id;
      if (isNew) {
        const created = await createArticle(data);
        articleId = created.id;
      } else {
        await updateArticle(id!, data);
      }
      if (publish && articleId) await setArticleStatus(articleId, 'published');
      setSavedMsg(publish ? 'تم الحفظ والنشر بنجاح ✓' : 'تم الحفظ بنجاح ✓');
      setTimeout(() => setSavedMsg(''), 3000);
      if (isNew) navigate(`/admin/articles/${articleId}/edit`, { replace: true });
    } catch (e) {
      alert(e instanceof Error ? `تعذر الحفظ: ${e.message}` : 'تعذر الحفظ');
    } finally {
      setSaving(false);
    }
  };

  if (!isNew && loading) {
    return <p className="py-24 text-center text-sm font-bold text-ink-400">جارٍ تحميل الخبر…</p>;
  }

  return (
    <div className="space-y-6">
      <Seo title={isNew ? 'خبر جديد' : 'تعديل خبر'} noindex />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black sm:text-3xl">{isNew ? 'إضافة خبر جديد' : 'تعديل الخبر'}</h1>
          <p className="mt-1 text-sm text-ink-400">املأ الحقول ثم احفظ كمسودة أو انشر مباشرة.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {savedMsg && <span className="text-sm font-black text-emerald-600">{savedMsg}</span>}
          {form.status === 'published' && !isNew && (
            <button onClick={() => save(false)} className="btn-ghost" disabled={saving}>
              <Undo2 className="h-4 w-4" />
              حفظ التعديلات
            </button>
          )}
          <button onClick={() => save(false)} className="btn-ghost" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            حفظ
          </button>
          <button onClick={() => save(true)} className="btn-primary" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            حفظ ونشر
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* العمود الرئيسي */}
        <div className="space-y-5 xl:col-span-2">
          <div className="card space-y-4 p-5">
            <div>
              <label className="label" htmlFor="f-title">العنوان الرئيسي *</label>
              <input
                id="f-title"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                onBlur={() => autoSeo()}
                className="input !py-3 text-base font-extrabold"
                placeholder="اكتب عنواناً صحفياً واضحاً ودقيقاً"
              />
            </div>
            <div>
              <label className="label" htmlFor="f-subtitle">العنوان الفرعي</label>
              <input
                id="f-subtitle"
                value={form.subtitle}
                onChange={(e) => set('subtitle', e.target.value)}
                className="input"
                placeholder="سطر توضيحي اختياري أسفل العنوان"
              />
            </div>
            <div>
              <label className="label" htmlFor="f-summary">الملخص</label>
              <textarea
                id="f-summary"
                value={form.summary}
                onChange={(e) => set('summary', e.target.value)}
                className="input min-h-[80px]"
                maxLength={300}
                placeholder="ملخص قصير يظهر في البطاقات ووصف البحث"
              />
              <p className="mt-1 text-start text-[11px] text-ink-400">{form.summary.length}/300</p>
            </div>
          </div>

          <div className="card p-5">
            <label className="label">محتوى الخبر (محرر نصوص غني)</label>
            <RichTextEditor value={form.content} onChange={(html) => set('content', html)} />
          </div>

          <div className="card space-y-4 p-5">
            <h2 className="text-base font-black">إعدادات SEO</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="f-meta-title">Meta Title</label>
                <input
                  id="f-meta-title"
                  value={form.meta_title}
                  onChange={(e) => set('meta_title', e.target.value)}
                  className="input"
                  maxLength={70}
                  placeholder="يُنشأ تلقائياً من العنوان"
                />
              </div>
              <div>
                <label className="label" htmlFor="f-slug">الرابط اللطيف (Slug)</label>
                <input
                  id="f-slug"
                  value={form.slug}
                  onChange={(e) => set('slug', e.target.value)}
                  className="input text-start"
                  dir="ltr"
                  placeholder="يُنشأ تلقائياً"
                />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="f-meta-desc">Meta Description</label>
              <textarea
                id="f-meta-desc"
                value={form.meta_description}
                onChange={(e) => set('meta_description', e.target.value)}
                className="input min-h-[70px]"
                maxLength={165}
                placeholder="وصف محركات البحث (حتى 160 حرفاً)"
              />
            </div>
          </div>
        </div>

        {/* الشريط الجانبي للمحرر */}
        <div className="space-y-5">
          <div className="card space-y-4 p-5">
            <div>
              <label className="label" htmlFor="f-status">الحالة</label>
              <select
                id="f-status"
                value={form.status}
                onChange={(e) => set('status', e.target.value as ArticleStatus)}
                className="input font-bold"
              >
                <option value="draft">مسودة</option>
                <option value="pending_review">بانتظار المراجعة</option>
                <option value="published">منشور</option>
                <option value="archived">أرشيف</option>
              </select>
            </div>
            <label className="flex cursor-pointer items-center justify-between rounded-xl bg-brand-50 p-3 dark:bg-brand-950/30">
              <span className="text-sm font-black text-brand-800 dark:text-brand-300">خبر عاجل (Breaking)</span>
              <input
                type="checkbox"
                checked={form.is_breaking}
                onChange={(e) => set('is_breaking', e.target.checked)}
                className="h-5 w-5 accent-brand-600"
              />
            </label>
            <div>
              <label className="label" htmlFor="f-cat">التصنيف</label>
              <select
                id="f-cat"
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                className="input font-bold"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="f-region">الجهة (اختياري)</label>
              <select
                id="f-region"
                value={form.region}
                onChange={(e) => set('region', e.target.value)}
                className="input font-bold"
              >
                <option value="">بدون جهة محددة</option>
                {REGIONS.map((r) => (
                  <option key={r.slug} value={r.slug}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="f-tags">الوسوم (Tags)</label>
              <input
                id="f-tags"
                value={form.tags}
                onChange={(e) => set('tags', e.target.value)}
                className="input"
                placeholder="افصل بينها بفاصلة: الاقتصاد, الاستثمار"
              />
            </div>
          </div>

          <div className="card space-y-4 p-5">
            <h2 className="text-base font-black">الصور</h2>
            <div>
              <label className="label" htmlFor="f-image">الصورة البارزة (Featured Image)</label>
              <div className="flex gap-2">
                <input
                  id="f-image"
                  value={form.featured_image}
                  onChange={(e) => set('featured_image', e.target.value)}
                  className="input text-start"
                  dir="ltr"
                  placeholder="https://… صورة مرشّحة أو مرفوعة"
                />
                <span className="rounded-xl bg-ink-100 p-2.5 dark:bg-ink-800">
                  <ImageIcon className="h-5 w-5 text-ink-400" />
                </span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {['0', '1', '2'].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => set('featured_image', `/demo-images/${form.category}-${n}.svg`)}
                    className="overflow-hidden rounded-lg ring-2 ring-transparent transition-all hover:ring-brand-500"
                    title="استعمال صورة تعبيرية مرخّصة داخلياً"
                  >
                    <img src={`/demo-images/${form.category}-${n}.svg`} alt="" className="aspect-video w-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
              {form.featured_image && (
                <img src={form.featured_image} alt="" className="mt-3 aspect-video w-full rounded-xl object-cover" />
              )}
            </div>
            <div>
              <label className="label" htmlFor="f-gallery">معرض الصور (رابط في كل سطر)</label>
              <textarea
                id="f-gallery"
                value={form.gallery}
                onChange={(e) => set('gallery', e.target.value)}
                className="input min-h-[70px] text-start"
                dir="ltr"
                placeholder={'https://…\nhttps://…'}
              />
            </div>
          </div>

          <div className="card space-y-4 p-5">
            <h2 className="text-base font-black">المصدر</h2>
            <div>
              <label className="label" htmlFor="f-src-name">اسم المصدر</label>
              <input
                id="f-src-name"
                value={form.source_name}
                onChange={(e) => set('source_name', e.target.value)}
                className="input"
                placeholder="مثال: وكالة المغرب العربي للأنباء"
              />
            </div>
            <div>
              <label className="label" htmlFor="f-src-url">الرابط الأصلي</label>
              <input
                id="f-src-url"
                value={form.source_url}
                onChange={(e) => set('source_url', e.target.value)}
                className="input text-start"
                dir="ltr"
                placeholder="https://…"
              />
            </div>
            <p className="rounded-xl bg-ink-50 p-3 text-[11px] leading-5 text-ink-500 dark:bg-ink-900 dark:text-ink-400">
              قاعدة تحريرية: أعد صياغة الوقائع بأسلوبك دون نسخ، واحتفظ دائماً باسم المصدر ورابطه
              الأصلي وتاريخه، ولا تُضف معلومات غير واردة في المصدر.
            </p>
          </div>
        </div>
      </div>

      <Link to="/admin/articles" className="inline-block text-sm font-bold text-ink-400 hover:text-brand-600">
        ← العودة إلى قائمة الأخبار
      </Link>
    </div>
  );
}
