import { useEffect, useState } from 'react';
import { Database, Loader2, Megaphone, Save, Settings2, Share2, Zap } from 'lucide-react';
import { useQuery } from '@/hooks/useQuery';
import { getSettings, saveSettings } from '@/services/settingsService';
import { dataMode } from '@/lib/supabaseClient';
import { resetDemoDB } from '@/lib/store';
import Seo from '@/components/Seo';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import type { SiteSettings } from '@/types';

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl bg-ink-50 p-4 dark:bg-ink-900">
      <span>
        <span className="block text-sm font-black">{label}</span>
        {hint && <span className="mt-0.5 block text-[11px] text-ink-400">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={(e) => {
          e.preventDefault();
          onChange(!checked);
        }}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? 'bg-brand-600' : 'bg-ink-300 dark:bg-ink-700'}`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'end-1' : 'end-6'}`}
        />
      </button>
    </label>
  );
}

const AD_SLOTS: Array<{ key: keyof SiteSettings['ads']; label: string; hint: string }> = [
  { key: 'header', label: 'Header Banner', hint: 'بانر علوي أسفل ترويسة الصفحة الرئيسية (728×90)' },
  { key: 'homepage', label: 'Homepage Banner', hint: 'بانر عريض في قلب الرئيسية (970×250)' },
  { key: 'article', label: 'Article Banner', hint: 'داخل صفحة الخبر أسفل الصورة الرئيسية' },
  { key: 'sidebar', label: 'Sidebar', hint: 'بالشريط الجانبي للصفحات (300×250)' },
  { key: 'between', label: 'Between Articles', hint: 'بين الأقسام في الرئيسية' },
];

export default function SettingsPage() {
  const { data: settings } = useQuery(getSettings, []);
  const [form, setForm] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [resetAsk, setResetAsk] = useState(false);

  useEffect(() => {
    if (settings) setForm(structuredClone(settings));
  }, [settings]);

  if (!form) return <p className="py-24 text-center text-sm font-bold text-ink-400">جارٍ التحميل…</p>;

  const save = async () => {
    setSaving(true);
    try {
      await saveSettings(form);
      setMsg('تم حفظ الإعدادات بنجاح ✓');
      setTimeout(() => setMsg(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <Seo title="الإعدادات" noindex />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black sm:text-3xl">إعدادات الموقع</h1>
        <div className="flex items-center gap-2">
          {msg && <span className="text-sm font-black text-emerald-600">{msg}</span>}
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            حفظ الكل
          </button>
        </div>
      </div>

      {/* عام */}
      <section className="card space-y-4 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-black">
          <Settings2 className="h-5 w-5 text-brand-600" />
          عام
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">اسم الموقع</label>
            <input className="input" value={form.site_name} onChange={(e) => setForm({ ...form, site_name: e.target.value })} />
          </div>
          <div>
            <label className="label">الشعار النصي</label>
            <input className="input" value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
          </div>
        </div>
        <Toggle
          label="شريط الأخبار العاجلة"
          hint="إظهار شريط «عاجل» المتحرك أعلى الموقع"
          checked={form.breaking_enabled}
          onChange={(v) => setForm({ ...form, breaking_enabled: v })}
        />
        <Toggle
          label="نظام التعليقات"
          hint="السماح للزوار بالتعليق (بعد الموافقة دائماً)"
          checked={form.comments_enabled}
          onChange={(v) => setForm({ ...form, comments_enabled: v })}
        />
      </section>

      {/* الإعلانات */}
      <section className="card space-y-3 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-black">
          <Megaphone className="h-5 w-5 text-brand-600" />
          مساحات الإعلانات
        </h2>
        <p className="text-xs leading-6 text-ink-400">
          فعّل المساحات التي تريد عرضها. استبدل محتوى AdSlot لاحقاً بشفرة شبكتك الإعلانية.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {AD_SLOTS.map((s) => (
            <Toggle
              key={s.key}
              label={s.label}
              hint={s.hint}
              checked={form.ads[s.key]}
              onChange={(v) => setForm({ ...form, ads: { ...form.ads, [s.key]: v } })}
            />
          ))}
        </div>
      </section>

      {/* التواصل الاجتماعي */}
      <section className="card space-y-4 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-black">
          <Share2 className="h-5 w-5 text-brand-600" />
          روابط التواصل الاجتماعي
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ['facebook', 'فيسبوك'],
              ['instagram', 'إنستغرام'],
              ['youtube', 'يوتيوب'],
              ['x', 'إكس (تويتر)'],
              ['tiktok', 'تيك توك'],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="label">{label}</label>
              <input
                className="input text-start"
                dir="ltr"
                value={form.social[key]}
                onChange={(e) => setForm({ ...form, social: { ...form.social, [key]: e.target.value } })}
                placeholder="https://…"
              />
            </div>
          ))}
        </div>
      </section>

      {/* وضع DEMO */}
      {dataMode === 'demo' && (
        <section className="card space-y-3 border-2 border-amber-300/50 p-5 sm:p-6 dark:border-amber-500/20">
          <h2 className="flex items-center gap-2 text-base font-black text-amber-600">
            <Database className="h-5 w-5" />
            بيانات العرض التجريبي
          </h2>
          <p className="text-xs leading-6 text-ink-400">
            الموقع يعمل بوضع DEMO (بدون Supabase). لإعادة تهيئة البيانات التجريبية لحالتها الأصلية:
          </p>
          <button onClick={() => setResetAsk(true)} className="btn-danger">
            <Zap className="h-4 w-4" />
            إعادة ضبط بيانات DEMO
          </button>
          <p className="text-[11px] leading-5 text-ink-400">
            للعمل الفعلي: أنشئ مشروع Supabase، نفّذ migrations الموجودة في <code dir="ltr">supabase/</code>،
            ثم اضبط المتغيرات في <code dir="ltr">.env</code>.
          </p>
        </section>
      )}

      <ConfirmDialog
        open={resetAsk}
        title="إعادة ضبط بيانات DEMO؟"
        message="ستفقد كل التعديلات التي أجريتها على الأخبار والمصادر والتعليقات والإعدادات المحلية."
        confirmLabel="إعادة الضبط"
        onConfirm={() => {
          resetDemoDB();
          window.location.reload();
        }}
        onCancel={() => setResetAsk(false)}
      />
    </div>
  );
}
