import { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  CopyCheck,
  Download,
  Globe,
  Loader2,
  Pencil,
  Play,
  Plus,
  Rss,
  Save,
  ShieldCheck,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { CATEGORIES } from '@/lib/demoData';
import { useQuery } from '@/hooks/useQuery';
import {
  createSource,
  deleteSource,
  getAggregationStats,
  listSources,
  setSourceStatus,
  updateSource,
} from '@/services/sourceService';
import { fetchSourceNow, testSource } from '@/services/ingestService';
import { downloadModuleBackup } from '@/services/maintenanceService';
import type { Source, SourceLanguage, SourceStatus } from '@/types';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import StatCard from '@/components/admin/StatCard';
import Seo from '@/components/Seo';
import EmptyState from '@/components/news/EmptyState';
import { cx, relativeTime } from '@/lib/utils';

interface FormState {
  name: string;
  url: string;
  rss_url: string;
  category_slug: string;
  language: SourceLanguage;
  country: string;
  priority: number;
  status: SourceStatus;
}

const EMPTY: FormState = {
  name: '',
  url: '',
  rss_url: '',
  category_slug: 'maroc',
  language: 'ar',
  country: 'MA',
  priority: 3,
  status: 'active',
};

const STATUS_META: Record<SourceStatus, { label: string; cls: string }> = {
  active: { label: 'نشط', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' },
  paused: { label: 'معطّل', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400' },
  error: { label: 'خطأ', cls: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400' },
};

const LANG_LABEL: Record<SourceLanguage, string> = { ar: 'العربية', fr: 'الفرنسية', en: 'الإنجليزية' };

type RowAction =
  | { kind: 'idle' }
  | { kind: 'testing' }
  | { kind: 'tested'; ok: boolean; count: number; samples: string[]; error?: string }
  | { kind: 'fetching' }
  | { kind: 'fetched'; added: number; duplicates: number; merged: number; found: number; error?: string };

export default function SourcesPage() {
  const { data: sources, reload } = useQuery(listSources, []);
  const { data: stats, reload: reloadStats } = useQuery(getAggregationStats, []);
  const [modal, setModal] = useState<{ open: boolean; editing?: Source }>({ open: false });
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [rowState, setRowState] = useState<Record<string, RowAction>>({});
  const [backingUp, setBackingUp] = useState(false);

  const setRow = (id: string, a: RowAction) => setRowState((m) => ({ ...m, [id]: a }));
  const refreshAll = () => {
    reload();
    reloadStats();
  };

  const openNew = () => {
    setForm(EMPTY);
    setModal({ open: true });
  };
  const openEdit = (s: Source) => {
    setForm({
      name: s.name,
      url: s.url,
      rss_url: s.rss_url ?? '',
      category_slug: s.category_slug ?? 'maroc',
      language: s.language ?? 'ar',
      country: s.country ?? 'MA',
      priority: s.priority ?? 3,
      status: s.status,
    });
    setModal({ open: true, editing: s });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        url: form.url.trim(),
        rss_url: form.rss_url.trim() || undefined,
        category_slug: form.category_slug,
        language: form.language,
        country: form.country.trim() || 'MA',
        priority: form.priority,
        status: form.status,
      };
      if (modal.editing) {
        await updateSource(modal.editing.id, payload);
      } else {
        await createSource(payload);
      }
      setModal({ open: false });
      refreshAll();
    } finally {
      setSaving(false);
    }
  };

  const runTest = async (s: Source) => {
    setRow(s.id, { kind: 'testing' });
    const r = await testSource(s.id);
    setRow(s.id, { kind: 'tested', ok: r.ok, count: r.count, samples: r.samples, error: r.error });
    reload();
  };

  const runFetchNow = async (s: Source) => {
    setRow(s.id, { kind: 'fetching' });
    const r = await fetchSourceNow(s.id);
    setRow(s.id, {
      kind: 'fetched',
      added: r.added,
      duplicates: r.duplicates,
      merged: r.merged,
      found: r.found,
      error: r.error,
    });
    refreshAll();
  };

  const backup = async () => {
    setBackingUp(true);
    try {
      await downloadModuleBackup();
    } finally {
      setBackingUp(false);
    }
  };

  return (
    <div className="space-y-6">
      <Seo title="مصادر الأخبار" noindex />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black sm:text-3xl">مصادر الأخبار — التجميع الآلي</h1>
          <p className="mt-1 text-sm text-ink-400">
            RSS مباشر · Google News · مصادر رسمية ومواقع موثّقة — الجلب بالعربية مع منع التكرار والدمج.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={backup} disabled={backingUp} className="btn-ghost" title="حفظ نسخة احتياطية من حالة الوحدة وتنزيلها JSON">
            {backingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            نسخة احتياطية
          </button>
          <button onClick={openNew} className="btn-primary">
            <Plus className="h-4 w-4" />
            إضافة مصدر
          </button>
        </div>
      </div>

      {/* إحصاءات الوحدة */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Rss} label="إجمالي المصادر" value={stats?.totalSources ?? 0} color="#2563eb" />
        <StatCard icon={Activity} label="مصادر نشطة" value={stats?.activeSources ?? 0} color="#059669" />
        <StatCard
          icon={AlertTriangle}
          label="مصادر بأخطاء"
          value={stats?.errorSources ?? 0}
          hint={stats && stats.errorSources > 0 ? 'راجع fetch_status في القائمة' : undefined}
          color="#dc2626"
        />
        <StatCard
          icon={Clock3}
          label="آخر جلب"
          value={stats?.lastFetchAt ? 1 : 0}
          hint={stats?.lastFetchAt ? relativeTime(stats.lastFetchAt) : 'لم يتم بعد'}
          color="#7c3aed"
        />
        <StatCard icon={Download} label="مواد مسترجعة عبر التجميع" value={stats?.fetchedArticles ?? 0} color="#0891b2" />
        <StatCard icon={CopyCheck} label="تكرارات مكشوفة ومُدمجة" value={stats?.duplicates ?? 0} color="#d97706" />
        <StatCard icon={CheckCircle2} label="أخبار منشورة" value={stats?.published ?? 0} color="#16a34a" />
        <StatCard
          icon={ShieldCheck}
          label="تحتاج مراجعة بشرية"
          value={stats?.needsReview ?? 0}
          hint="PENDING_REVIEW + REVIEW_REQUIRED"
          color="#ea580c"
        />
      </div>

      {/* قائمة المصادر */}
      {sources && sources.length === 0 && (
        <EmptyState
          title="لا توجد مصادر بعد"
          hint="أضف أول مصدر RSS — يقبل النظام RSS مباشر أو Google News RSS أو أي مصدر رسمي/موثوق."
        />
      )}

      <div className="space-y-3">
        {sources?.map((s) => {
          const meta = STATUS_META[s.status];
          const cat = CATEGORIES.find((c) => c.slug === s.category_slug);
          const row = rowState[s.id] ?? { kind: 'idle' as const };
          const busy = row.kind === 'testing' || row.kind === 'fetching';
          return (
            <div key={s.id} className="card flex flex-col gap-4 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-300">
                  {s.logo_url ? (
                    <img src={s.logo_url} alt="" className="h-10 w-10 object-contain" />
                  ) : (
                    <Rss className="h-6 w-6" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-black">{s.name}</h2>
                    <span className={cx('chip', meta.cls)}>{meta.label}</span>
                    {cat && (
                      <span className="chip" style={{ backgroundColor: `${cat.color}14`, color: cat.color }}>
                        {cat.name}
                      </span>
                    )}
                    <span className="chip bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                      {LANG_LABEL[s.language ?? 'ar']}
                    </span>
                    <span className="chip bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400">
                      أولوية {s.priority ?? 3}/5
                    </span>
                    {s.fetch_status === 'ok' && (
                      <span className="chip bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                        ✓ جلب ناجح{s.items_fetched !== undefined ? ` (${s.items_fetched})` : ''}
                      </span>
                    )}
                    {s.fetch_status === 'error' && (
                      <span className="chip bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400" title={s.fetch_error}>
                        ✗ فشل الجلب
                      </span>
                    )}
                  </div>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 flex items-center gap-1.5 truncate text-xs font-bold text-brand-600 hover:underline"
                    dir="ltr"
                  >
                    <Globe className="h-3.5 w-3.5 shrink-0" />
                    {s.url}
                  </a>
                  {s.rss_url && (
                    <p className="mt-0.5 truncate text-[11px] text-ink-400" dir="ltr">{s.rss_url}</p>
                  )}
                  <p className="mt-1 text-[11px] text-ink-400">
                    آخر جلب: {s.last_fetched_at ? relativeTime(s.last_fetched_at) : 'لم يتم بعد'}
                    {s.fetch_error && <span className="text-red-500"> — {s.fetch_error}</span>}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1.5">
                  <button
                    onClick={() => runTest(s)}
                    disabled={busy}
                    className="btn-ghost !px-3.5 !py-2 text-xs"
                    title="اختبار RSS فورياً دون إدخال مواد"
                  >
                    {row.kind === 'testing' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                    Test Source
                  </button>
                  <button
                    onClick={() => runFetchNow(s)}
                    disabled={busy || s.status !== 'active'}
                    className="btn-ghost !border-brand-200 !px-3.5 !py-2 text-xs !text-brand-600 dark:!border-brand-900/50 dark:!text-brand-400"
                    title="تشغيل التجميع على هذا المصدر الآن"
                  >
                    {row.kind === 'fetching' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                    Fetch Now
                  </button>
                  <button
                    onClick={async () => {
                      await setSourceStatus(s.id, s.status === 'active' ? 'paused' : 'active');
                      refreshAll();
                    }}
                    className="btn-ghost !px-3.5 !py-2 text-xs"
                    title="تعطيل مؤقت / إعادة تفعيل"
                  >
                    {s.status === 'active' ? 'Disable' : 'تفعيل'}
                  </button>
                  <button onClick={() => openEdit(s)} className="rounded-xl p-2.5 text-ink-400 hover:bg-ink-100 hover:text-brand-600 dark:hover:bg-ink-800" title="تعديل" aria-label="تعديل">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => setToDelete(s.id)} className="rounded-xl p-2.5 text-ink-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10" title="حذف" aria-label="حذف">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* نتيجة الاختبار/الجلب المضمّنة */}
              {row.kind === 'tested' && (
                <div
                  className={cx(
                    'rounded-xl border px-4 py-3 text-xs',
                    row.ok
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'
                      : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300',
                  )}
                >
                  {row.ok ? (
                    <>
                      <p className="font-black">✓ التغذية تعمل — تم العثور على {row.count} مادة.</p>
                      {row.samples.length > 0 && (
                        <ul className="mt-1.5 list-inside list-disc space-y-0.5 opacity-90">
                          {row.samples.map((t) => (
                            <li key={t.slice(0, 24)} className="truncate">{t}</li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    <p className="font-black">✗ تعذّر الجلب: {row.error}</p>
                  )}
                </div>
              )}
              {row.kind === 'fetched' && (
                <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-xs text-brand-800 dark:border-brand-900/50 dark:bg-brand-950/30 dark:text-brand-300">
                  {row.error
                    ? `✗ ${row.error}`
                    : `✓ اكتمل الجلب: ${row.found} مادة — ${row.added} جديدة أُرسلت لخط المعالجة، ${row.duplicates} مكررة (${row.merged} دُمجت في أخبار رئيسية). انتقل إلى «وكيل الأخبار AI» للمعالجة.`}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* نافذة الإضافة/التعديل */}
      {modal.open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={() => setModal({ open: false })} />
          <form onSubmit={save} className="card relative max-h-[92vh] w-full max-w-lg space-y-4 overflow-y-auto p-6 animate-fade-up">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black">{modal.editing ? 'تعديل المصدر' : 'إضافة مصدر جديد'}</h3>
              <button type="button" onClick={() => setModal({ open: false })} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800" aria-label="إغلاق">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div>
              <label className="label">اسم المصدر *</label>
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: وكالة المغرب العربي للأنباء…" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">URL الموقع *</label>
                <input className="input text-start" dir="ltr" required type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" />
              </div>
              <div>
                <label className="label">رابط RSS (مباشر أو Google News)</label>
                <input className="input text-start" dir="ltr" type="url" value={form.rss_url} onChange={(e) => setForm({ ...form, rss_url: e.target.value })} placeholder="https://…/rss.xml" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">التصنيف الافتراضي</label>
                <select className="input font-bold" value={form.category_slug} onChange={(e) => setForm({ ...form, category_slug: e.target.value })}>
                  {CATEGORIES.map((c) => (
                    <option key={c.slug} value={c.slug}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">لغة المصدر</label>
                <select className="input font-bold" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value as SourceLanguage })}>
                  <option value="ar">العربية</option>
                  <option value="fr">الفرنسية — تُعالج وتُنشر بالعربية</option>
                  <option value="en">الإنجليزية — تُعالج وتُنشر بالعربية</option>
                </select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label">البلد</label>
                <input className="input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="MA" maxLength={32} />
              </div>
              <div>
                <label className="label">الأولوية</label>
                <select className="input font-bold" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}>
                  {[5, 4, 3, 2, 1].map((p) => (
                    <option key={p} value={p}>{p} {p === 5 ? '— قصوى' : p === 1 ? '— منخفضة' : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">الحالة</label>
                <select className="input font-bold" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as SourceStatus })}>
                  <option value="active">نشط</option>
                  <option value="paused">معطّل</option>
                </select>
              </div>
            </div>
            <button type="submit" disabled={saving} className="btn-primary w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {modal.editing ? 'حفظ التعديلات' : 'إضافة المصدر'}
            </button>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="حذف المصدر؟"
        message="سيتوقف الوكيل عن مراقبة هذا المصدر فوراً. الأخبار المستوردة سابقاً تبقى محفوظة."
        onConfirm={async () => {
          if (toDelete) await deleteSource(toDelete);
          setToDelete(null);
          refreshAll();
        }}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
