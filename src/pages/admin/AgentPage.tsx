import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Cpu,
  Database,
  FileSearch,
  Loader2,
  PlayCircle,
  Radar,
  RefreshCcw,
  ShieldCheck,
  TerminalSquare,
  Trash2,
} from 'lucide-react';
import { useQuery } from '@/hooks/useQuery';
import { listArticles } from '@/services/articleService';
import { processQueue, runScan } from '@/services/agentService';
import { purgeDemoData } from '@/services/maintenanceService';
import { listLogs } from '@/services/settingsService';
import { dataMode } from '@/lib/supabaseClient';
import StatusBadge from '@/components/admin/StatusBadge';
import Seo from '@/components/Seo';
import { cx, formatTime, relativeTime } from '@/lib/utils';

const STAGES = [
  { icon: Radar, title: 'مراقبة المصادر', desc: 'فحص المصادر النشطة واكتشاف المواد الجديدة' },
  { icon: ShieldCheck, title: 'منع التكرار', desc: 'مقارنة بالرابط وتشابه العناوين والتاريخ' },
  { icon: FileSearch, title: 'استخلاص الوقائع', desc: 'قراءة المادة الخام واستخراج المعلومات الأساسية فقط' },
  { icon: Cpu, title: 'التحرير الآلي', desc: 'توليد العنوان والملخص وإعادة الصياغة والتصنيف والكلمات المفتاحية وSEO' },
  { icon: ClipboardCheck, title: 'مراجعة بشرية', desc: 'إرسال إلى PENDING REVIEW — لا نشر دون اعتماد محرر' },
];

export default function AgentPage() {
  const { data: pipeline, reload } = useQuery(
    () =>
      listArticles({
        status: ['new', 'fetched', 'processing', 'ai_edited', 'verified', 'rewritten', 'pending_review', 'review_required'],
        pageSize: 40,
      }),
    [],
  );
  const { data: logs, reload: reloadLogs } = useQuery(() => listLogs(40), []);
  const [running, setRunning] = useState(false);
  const [purging, setPurging] = useState(false);
  const [lines, setLines] = useState<string[]>([]);

  const push = (msg: string) => setLines((l) => [`${formatTime(new Date().toISOString())}  ←  ${msg}`, ...l].slice(0, 30));

  const purge = async () => {
    if (purging) return;
    if (!window.confirm('سيتم حذف كل الأخبار التجريبية (DEMO) نهائياً وإيقاف المصادر الوهمية.\n\nمتابعة؟')) return;
    setPurging(true);
    try {
      const r = await purgeDemoData();
      push(
        r.removedArticles === 0 && r.pausedSources === 0
          ? '✓ لا توجد أخبار تجريبية — القاعدة نظيفة أصلاً.'
          : `✓ حُذف ${r.removedArticles} خبراً تجريبياً و ${r.removedComments} تعليقاً مرتبطاً، وأُوقف ${r.pausedSources} مصدر وهمي.`,
      );
      push('الخطوة التالية: اضغط «دورة كاملة» لجلب أخبار اليوم الحقيقية من المصادر.');
    } catch (e) {
      push(`✗ خطأ أثناء الحذف: ${e instanceof Error ? e.message : 'غير متوقع'}`);
    } finally {
      setPurging(false);
      reload();
      reloadLogs();
    }
  };

  const run = async (mode: 'scan' | 'process' | 'full') => {
    if (running) return;
    setRunning(true);
    setLines([]);
    try {
      if (mode === 'scan' || mode === 'full') {
        push('بدء دورة مراقبة المصادر…');
        const report = await runScan(push);
        push(`نتيجة المراقبة: ${report.added} مادة جديدة، ${report.duplicatesSkipped} مكررة، ${report.errors.length} أخطاء.`);
      }
      if (mode === 'process' || mode === 'full') {
        push('بدء معالجة قائمة الانتظار (NEW)…');
        const n = await processQueue(push);
        push(`اكتملت المعالجة: ${n} مادة أصبحت بانتظار المراجعة.`);
      }
      push('✓ انتهت الدورة بنجاح.');
    } catch (e) {
      push(`✗ خطأ: ${e instanceof Error ? e.message : 'غير متوقع'}`);
    } finally {
      setRunning(false);
      reload();
      reloadLogs();
    }
  };

  const counts: Record<string, number> = {};
  for (const a of pipeline?.items ?? []) counts[a.status] = (counts[a.status] ?? 0) + 1;

  return (
    <div className="space-y-6">
      <Seo title="وكيل الأخبار AI" noindex />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-2xl bg-ink-900 p-3 text-white dark:bg-white dark:text-ink-900">
            <Bot className="h-7 w-7" />
          </span>
          <div>
            <h1 className="text-2xl font-black sm:text-3xl">NEWS AI AGENT</h1>
            <p className="text-sm text-ink-400">
              وكيل رصد وتحرير آلي {dataMode === 'demo' && <span className="text-amber-500">— يعمل حالياً بمحاكاة محلية (DEMO)</span>}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => run('scan')} disabled={running} className="btn-ghost">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radar className="h-4 w-4" />}
            مراقبة فقط
          </button>
          <button onClick={() => run('process')} disabled={running} className="btn-ghost">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cpu className="h-4 w-4" />}
            معالجة فقط
          </button>
          <button onClick={() => run('full')} disabled={running} className="btn-primary">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
            دورة كاملة
          </button>
          <button
            onClick={purge}
            disabled={running || purging}
            className="btn-ghost !border-red-200 !text-red-600 hover:!bg-red-50 dark:!border-red-900/50 dark:!text-red-400 dark:hover:!bg-red-950/40"
            title="حذف كل الأخبار التجريبية (is_demo) نهائياً وإيقاف المصادر الوهمية"
          >
            {purging ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            حذف أخبار DEMO
          </button>
        </div>
      </div>

      {/* مراحل العمل */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {STAGES.map((s, i) => (
          <div key={s.title} className="card relative p-4">
            <span className="absolute end-3 top-3 text-2xl font-black text-ink-100 dark:text-ink-800">
              {i + 1}
            </span>
            <span className="inline-block rounded-xl bg-brand-50 p-2.5 dark:bg-brand-950/40">
              <s.icon className="h-5 w-5 text-brand-600" />
            </span>
            <h3 className="mt-2.5 text-sm font-black">{s.title}</h3>
            <p className="mt-1 text-xs leading-5 text-ink-500 dark:text-ink-400">{s.desc}</p>
          </div>
        ))}
      </div>

      {/* عدادات الخط */}
      <div className="card grid grid-cols-2 gap-1 p-1 sm:grid-cols-4">
        {(['new', 'processing', 'ai_edited', 'pending_review'] as const).map((s) => (
          <div key={s} className="rounded-xl p-4 text-center">
            <StatusBadge status={s} />
            <p className="mt-2 text-3xl font-black">{counts[s] ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* وحدة التشغيل المباشرة */}
        <section className="card overflow-hidden">
          <h2 className="flex items-center gap-2 border-b border-ink-900/5 p-4 text-base font-black dark:border-white/5">
            <TerminalSquare className="h-5 w-5 text-brand-600" />
            وحدة التشغيل المباشرة
          </h2>
          <div dir="rtl" className="h-72 overflow-y-auto bg-ink-950 p-4 font-mono text-xs leading-6 text-emerald-300">
            {lines.length === 0 ? (
              <p className="text-ink-500">← شغّل دورة المراقبة أو المعالجة لعرض المخرجات هنا…</p>
            ) : (
              lines.map((l, i) => <p key={i}>{l}</p>)
            )}
          </div>
        </section>

        {/* سجل الأحداث */}
        <section className="card overflow-hidden">
          <h2 className="flex items-center gap-2 border-b border-ink-900/5 p-4 text-base font-black dark:border-white/5">
            <Activity className="h-5 w-5 text-brand-600" />
            سجل الأحداث (news_logs)
          </h2>
          <div className="max-h-72 space-y-2 overflow-y-auto p-4">
            {(logs ?? []).map((log) => (
              <div key={log.id} className="flex items-start gap-2.5 text-xs">
                <span
                  className={cx(
                    'mt-1 h-2 w-2 shrink-0 rounded-full',
                    log.level === 'error' ? 'bg-red-500' : log.level === 'warn' ? 'bg-amber-500' : 'bg-emerald-500',
                  )}
                />
                <div className="min-w-0">
                  <p className="font-mono text-[10px] font-black text-ink-400">
                    {log.action} · {formatTime(log.at)}
                  </p>
                  <p className="leading-5 text-ink-600 dark:text-ink-300">{log.message}</p>
                </div>
              </div>
            ))}
            {(logs ?? []).length === 0 && (
              <p className="py-8 text-center text-sm font-bold text-ink-400">السجل فارغ.</p>
            )}
          </div>
        </section>
      </div>

      {/* قائمة المواد في الخط */}
      <section className="card overflow-hidden">
        <h2 className="flex items-center gap-2 border-b border-ink-900/5 p-4 text-base font-black dark:border-white/5">
          <Database className="h-5 w-5 text-brand-600" />
          المواد الموجودة في خط المعالجة
        </h2>
        <div className="divide-y divide-ink-900/5 dark:divide-white/5">
          {(pipeline?.items ?? []).map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{a.title}</p>
                <p className="text-[11px] text-ink-400">
                  {a.source_name} · {relativeTime(a.updated_at)}
                </p>
              </div>
              <StatusBadge status={a.status} />
              {a.status === 'pending_review' && (
                <Link to="/admin/review" className="btn-ghost !px-3 !py-1.5 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  مراجعتها
                </Link>
              )}
            </div>
          ))}
          {(pipeline?.items.length ?? 0) === 0 && (
            <p className="flex items-center justify-center gap-2 py-10 text-sm font-bold text-ink-400">
              <RefreshCcw className="h-4 w-4" />
              خط المعالجة فارغ حالياً — أضف مصادر ثم شغّل دورة المراقبة.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
