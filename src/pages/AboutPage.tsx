import { Link } from 'react-router-dom';
import { Bot, Eye, HandHeart, Newspaper, Scale, ShieldCheck, Zap } from 'lucide-react';
import Seo from '@/components/Seo';

const VALUES = [
  {
    icon: Scale,
    title: 'الاستقلالية',
    text: 'خط تحريري مستقل لا يخضع لأي جهة، والولاء الوحيد للحقيقة وللقارئ.',
  },
  {
    icon: ShieldCheck,
    title: 'الموثوقية',
    text: 'كل مادة محالة إلى مصدرها الأصلي، ولا يُنشر أي خبر دون التحقق من معطياته.',
  },
  {
    icon: Zap,
    title: 'السرعة',
    text: 'تغطية مستمرة على مدار الساعة مع نظام رصد آلي للأخبار العاجلة.',
  },
  {
    icon: HandHeart,
    title: 'القرب',
    text: 'عناية خاصة بالأخبار الجهوية عبر 12 جهة، لأن الحدث المحلي يهم المواطن أولاً.',
  },
];

export default function AboutPage() {
  return (
    <>
      <Seo
        title="من نحن"
        description="NEWS MAROC منصة إخبارية مغربية مستقلة — تعرف على رؤيتنا وقاعدتنا التحريرية وطريقة عملنا."
        url="/about"
      />
      <div className="container-x mt-6 max-w-5xl">
        {/* ترويسة */}
        <header className="overflow-hidden rounded-3xl bg-gradient-to-bl from-brand-700 via-brand-600 to-ink-950 p-8 text-white sm:p-12">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white/70">
            <Newspaper className="h-4 w-4" />
            من نحن
          </p>
          <h1 className="mt-2 text-3xl font-black sm:text-5xl">
            NEWS <span className="text-brand-200">MAROC</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-white/90">
            منصة إخبارية مغربية رقمية تأسست حول فكرة بسيطة: خبر صحيح، بسرعة، وباحترام كامل لعقل
            القارئ — من طنجة إلى الكويرة، وبالعربية التي نحب.
          </p>
        </header>

        {/* القيم */}
        <section className="mt-12" aria-label="قيمنا">
          <h2 className="section-title mb-6">
            <span className="h-7 w-1.5 rounded-full bg-brand-600" />
            قيمنا التحريرية
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {VALUES.map((v) => (
              <div key={v.title} className="card p-5">
                <span className="inline-block rounded-2xl bg-brand-50 p-3 dark:bg-brand-950/40">
                  <v.icon className="h-6 w-6 text-brand-600 dark:text-brand-400" />
                </span>
                <h3 className="mt-3 text-lg font-black">{v.title}</h3>
                <p className="mt-1.5 text-sm leading-7 text-ink-500 dark:text-ink-400">{v.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* وكيل الأخبار */}
        <section className="mt-12 card p-6 sm:p-8" aria-label="وكيل الأخبار">
          <div className="flex flex-wrap items-start gap-5">
            <span className="rounded-2xl bg-ink-900 p-4 text-white dark:bg-white dark:text-ink-900">
              <Bot className="h-8 w-8" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-black">NEWS AI AGENT</h2>
              <p className="mt-3 text-sm leading-8 text-ink-600 dark:text-ink-300">
                تعتمد المنصة على نظام آلي لرصد الأخبار من المصادر المعلنة، يعالج المواد الخام عبر
                مراحل: <strong>رصد → معالجة → إعادة صياغة → مراجعة بشرية → نشر</strong>. لا يُنشر
                أي محتوى آلي إلا بعد اعتماد المحرر، وتُعاد صياغة كل مادة بشكل مستقل مع الاحتفاظ
                الدائم بالرابط الأصلي وتاريخ المصدر، دون اختلاق أي معلومة غير واردة في المصادر.
              </p>
            </div>
          </div>
        </section>

        {/* القاعدة التحريرية */}
        <section className="mt-12" aria-label="القاعدة التحريرية">
          <h2 className="section-title mb-6">
            <span className="h-7 w-1.5 rounded-full bg-cedar-600" />
            قاعدتنا التحريرية
          </h2>
          <div className="card space-y-4 p-6 text-sm leading-8 text-ink-600 dark:text-ink-300 sm:p-8">
            <p>
              <strong>1. لا نسخ:</strong> لا ننقل المقالات حرفياً من أي مصدر؛ تُعاد صياغة الوقائع
              الأساسية بأسلوبنا الصحفي المستقل.
            </p>
            <p>
              <strong>2. الإحالة دائمة:</strong> يُذكر اسم المصدر والرابط الأصلي وتاريخه أسفل كل مادة
              مستندة إلى مصدر خارجي.
            </p>
            <p>
              <strong>3. لا اختلاق:</strong> لا تُضاف معلومات أو تصريحات أو أرقام غير موجودة في
              المصادر المتاحة.
            </p>
            <p>
              <strong>4. الشفافية:</strong> المحتوى التجريبي يُوسم بوضوح بشارة DEMO، والمحتوى المعالج
              آلياً يذكر ذلك صراحة.
            </p>
            <p>
              <strong>5. حق الرد والتصحيح:</strong> نصحح الأخطاء بشفافية عبر{' '}
              <Link to="/about/contact" className="font-bold text-brand-600 hover:underline">
                صفحة الاتصال
              </Link>
              .
            </p>
          </div>
        </section>

        {/* رسالة قانونية مختصرة */}
        <section className="mt-12 flex flex-wrap items-center gap-4 rounded-2xl bg-ink-50 p-5 text-sm text-ink-600 dark:bg-ink-900 dark:text-ink-300">
          <Eye className="h-5 w-5 shrink-0 text-brand-600" />
          <p className="leading-7">
            اطلع أيضاً على{' '}
            <Link to="/privacy" className="font-bold text-brand-600 hover:underline">سياسة الخصوصية</Link>
            {' و'}
            <Link to="/terms" className="font-bold text-brand-600 hover:underline">شروط الاستخدام</Link>
            {' و'}
            <Link to="/disclaimer" className="font-bold text-brand-600 hover:underline">إخلاء المسؤولية</Link>
            .
          </p>
        </section>
      </div>
    </>
  );
}
