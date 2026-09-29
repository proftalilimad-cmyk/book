import { useState } from 'react';
import { CheckCircle2, Mail, MapPin, Megaphone, Phone, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import Seo from '@/components/Seo';
import { addLog } from '@/services/settingsService';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await addLog('info', 'CONTACT_FORM', `رسالة من ${form.name} <${form.email}>: ${form.subject}`);
      setSent(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Seo
        title="اتصل بنا"
        description="تواصل مع فريق NEWS MAROC: ملاحظات، تصويبات، شراكات أو اقتراحات."
        url="/about/contact"
      />
      <div className="container-x mt-6 max-w-5xl">
        <h1 className="mb-2 text-3xl font-black">اتصل بنا</h1>
        <p className="mb-8 max-w-2xl text-sm leading-7 text-ink-500 dark:text-ink-400">
          يسعدنا تواصلكم معنا لأي ملاحظة أو تصويب أو اقتراح. للإعلانات راجع{' '}
          <Link to="/advertising" className="font-bold text-brand-600 hover:underline">
            صفحة الإعلانات
          </Link>
          .
        </p>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* معلومات الاتصال */}
          <div className="space-y-4">
            {[
              { icon: Mail, title: 'البريد الإلكتروني', value: 'contact@newsmaroc.ma', href: 'mailto:contact@newsmaroc.ma' },
              { icon: Phone, title: 'الهاتف', value: '+212 5 00 00 00 00', href: 'tel:+212500000000' },
              { icon: MapPin, title: 'العنوان', value: 'المملكة المغربية', href: undefined },
              { icon: Megaphone, title: 'الإعلانات', value: 'ads@newsmaroc.ma', href: '/advertising', internal: true },
            ].map((c) => (
              <div key={c.title} className="card flex items-center gap-4 p-4">
                <span className="rounded-2xl bg-brand-50 p-3 dark:bg-brand-950/40">
                  <c.icon className="h-5 w-5 text-brand-600" />
                </span>
                <div>
                  <p className="text-xs font-bold text-ink-400">{c.title}</p>
                  {c.href ? (
                    c.internal ? (
                      <Link to={c.href} className="text-sm font-extrabold text-ink-900 hover:text-brand-600 dark:text-white">
                        {c.value}
                      </Link>
                    ) : (
                      <a href={c.href} className="text-sm font-extrabold text-ink-900 hover:text-brand-600 dark:text-white">
                        {c.value}
                      </a>
                    )
                  ) : (
                    <p className="text-sm font-extrabold text-ink-900 dark:text-white">{c.value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* النموذج */}
          <form onSubmit={submit} className="card space-y-4 p-6 lg:col-span-2">
            {sent ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center">
                <CheckCircle2 className="h-12 w-12 text-cedar-600" />
                <p className="text-lg font-black">تم استلام رسالتك بنجاح</p>
                <p className="text-sm text-ink-500">سيرد عليك فريق التحرير في أقرب وقت ممكن.</p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="c-name">الاسم الكامل</label>
                    <input
                      id="c-name"
                      className="input"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="c-email">البريد الإلكتروني</label>
                    <input
                      id="c-email"
                      type="email"
                      className="input"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="c-subject">الموضوع</label>
                  <input
                    id="c-subject"
                    className="input"
                    required
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="c-message">الرسالة</label>
                  <textarea
                    id="c-message"
                    className="input min-h-[140px]"
                    required
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={sending}>
                  <Send className="h-4 w-4" />
                  {sending ? 'جارٍ الإرسال…' : 'إرسال الرسالة'}
                </button>
              </>
            )}
          </form>
        </div>
      </div>
    </>
  );
}
