import { useEffect, useRef, useState } from 'react';
import {
  Bold,
  Eye,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  PenLine,
  Quote,
  RemoveFormatting,
  Undo2,
  Redo2,
} from 'lucide-react';
import { cx } from '@/lib/utils';

interface Props {
  value: string;
  onChange: (html: string) => void;
}

interface ToolBtn {
  icon: React.ElementType;
  title: string;
  command?: string;
  arg?: string;
  action?: () => void;
}

/**
 * محرر نصوص غني (Rich Text) مع معاينة مباشرة —
 * يدعم: Bold, Italic, Headings, Lists, Links, Images, Quotes
 */
export default function RichTextEditor({ value, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value && !preview) {
      ref.current.innerHTML = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, preview]);

  const emit = () => {
    onChange(ref.current?.innerHTML ?? '');
  };

  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    emit();
  };

  const tools: ToolBtn[] = [
    { icon: Undo2, title: 'تراجع', command: 'undo' },
    { icon: Redo2, title: 'إعادة', command: 'redo' },
    { icon: Bold, title: 'غامق (Bold)', command: 'bold' },
    { icon: Italic, title: 'مائل (Italic)', command: 'italic' },
    { icon: Heading2, title: 'عنوان رئيسي H2', command: 'formatBlock', arg: 'h2' },
    { icon: Heading3, title: 'عنوان فرعي H3', command: 'formatBlock', arg: 'h3' },
    { icon: List, title: 'قائمة نقطية', command: 'insertUnorderedList' },
    { icon: ListOrdered, title: 'قائمة مرقمة', command: 'insertOrderedList' },
    { icon: Quote, title: 'اقتباس', command: 'formatBlock', arg: 'blockquote' },
    {
      icon: LinkIcon,
      title: 'إدراج رابط',
      action: () => {
        const url = window.prompt('أدخل رابط URL:', 'https://');
        if (url) exec('createLink', url);
      },
    },
    {
      icon: ImageIcon,
      title: 'إدراج صورة (URL مرخّص أو مرفوع)',
      action: () => {
        const url = window.prompt('أدخل رابط الصورة:', 'https://');
        if (url) exec('insertImage', url);
      },
    },
    { icon: RemoveFormatting, title: 'إزالة التنسيق', command: 'removeFormat' },
  ];

  return (
    <div className="overflow-hidden rounded-2xl ring-1 ring-ink-900/10 dark:ring-white/10">
      {/* شريط الأدوات */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-ink-900/5 bg-ink-50 p-2 dark:border-white/5 dark:bg-ink-900">
        <button
          type="button"
          onClick={() => setPreview(false)}
          className={cx(
            'me-1 flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold',
            !preview ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-ink-200 dark:text-ink-400 dark:hover:bg-ink-800',
          )}
        >
          <PenLine className="h-3.5 w-3.5" />
          تحرير
        </button>
        <button
          type="button"
          onClick={() => setPreview(true)}
          className={cx(
            'me-3 flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold',
            preview ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-ink-200 dark:text-ink-400 dark:hover:bg-ink-800',
          )}
        >
          <Eye className="h-3.5 w-3.5" />
          معاينة مباشرة
        </button>
        <span className="mx-1 hidden h-5 w-px bg-ink-900/10 dark:bg-white/10 sm:block" />
        {!preview &&
          tools.map((t) => (
            <button
              key={t.title}
              type="button"
              title={t.title}
              aria-label={t.title}
              onClick={() => (t.action ? t.action() : exec(t.command!, t.arg))}
              className="rounded-lg p-2 text-ink-600 transition-colors hover:bg-white hover:text-brand-700 hover:shadow-sm dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-brand-400"
            >
              <t.icon className="h-4 w-4" />
            </button>
          ))}
      </div>

      {/* منطقة التحرير / المعاينة */}
      {preview ? (
        <div className="bg-white p-6 dark:bg-ink-925">
          <p className="mb-4 rounded-lg bg-brand-50 px-3 py-1.5 text-center text-[11px] font-bold text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
            معاينة مباشرة لشكل الخبر على الموقع
          </p>
          <div className="article-content" dangerouslySetInnerHTML={{ __html: value }} />
        </div>
      ) : (
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          dir="rtl"
          onInput={emit}
          onBlur={emit}
          className="article-content min-h-[280px] bg-white p-5 outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500 dark:bg-ink-925"
          data-placeholder="اكتب نص الخبر هنا…"
        />
      )}
    </div>
  );
}
