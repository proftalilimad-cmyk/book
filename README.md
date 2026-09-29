# NEWS MAROC — منصة إخبارية مغربية حديثة

منصة أخبار رقمية احترافية باللغة العربية (RTL) مبنية بـ **React 18 + TypeScript + Vite + Tailwind CSS + React Router + Supabase**، مع **لوحة تحكم كاملة** ووكيل أخبار آلي **NEWS AI AGENT** ونظام مراجعة تحريرية صارم.

---

## التشغيل السريع

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # بناء الإنتاج إلى dist/ (يتضمن توليد sitemap وصور DEMO)
```

**وضع العرض التجريبي (DEMO):** بدون أي إعداد يعمل الموقع بالكامل محلياً ببيانات تجريبية **موسومة بشارة DEMO** في كل مكان (بطاقات، صفحة الخبر، لوحة التحكم) — لا توجد أخبار حقيقية ولا أسماء حقيقية.

حسابات DEMO للوحة التحكم (`/admin`):

| الدور | البريد | كلمة المرور |
|---|---|---|
| ADMIN | `admin@newsmaroc.ma` | `admin123` |
| EDITOR | `editor@newsmaroc.ma` | `editor123` |

---

## الربط بـ Supabase (الإنتاج)

1. أنشئ مشروعاً على [supabase.com](https://supabase.com).
2. من SQL Editor نفّذ بالترتيب:
   - `supabase/migrations/20260927000000_init.sql` (الجداول + RLS + الدوال)
   - `supabase/seed.sql` (التصنيفات + الإعدادات الافتراضية)
3. فعّل Email Auth، أنشئ مستخدماً، ثم رقّه إلى مدير:
   ```sql
   update public.users set role = 'ADMIN' where email = 'you@example.com';
   ```
4. انسخ `.env.example` إلى `.env` واملأ:
   ```env
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   VITE_SITE_URL=https://newsmaroc.ma
   ```
5. (اختياري لجدولة الوكيل) انشر Edge Function:
   ```bash
   supabase functions deploy news-agent
   # وجدولها كل 15 دقيقة عبر Scheduled Functions
   ```

> بمجرد ضبط المتغيرين يتحوّل الموقع تلقائياً من وضع DEMO إلى بيانات Supabase الحقيقية (نفس الواجهة والخدمات).

## النشر على Netlify

- ملف `netlify.toml` جاهز: `command = npm run build`, `publish = dist`, توجيه SPA كامل.
- أضف متغيرات البيئة الثلاثة من إعدادات الموقع على Netlify.
- `robots.txt` + `sitemap.xml` (يُولَّد قبل كل build ويجلب الأخبار المنشورة عند ربط Supabase) + JSON-LD NewsArticle لكل خبر.

---

## البنية

```
src/
├── components/
│   ├── header/      # الترويسة، الملاحة، شريط العاجل، القائمة الجانبية
│   ├── footer/      # التذييل
│   ├── news/        # بطاقات الأخبار، Hero، الأقسام، الأكثر قراءة، الجهات، التعليقات…
│   ├── search/      # نافذة البحث الفوري
│   └── admin/       # بطاقات الإحصاء، شارات الحالة، المحرر الغني، نوافذ التأكيد
├── layouts/         # PublicLayout / AdminLayout / RequireAuth
├── pages/           # الرئيسية، الخبر، التصنيفات، الجهات، البحث، صفحات قانونية…
│   └── admin/       # لوحة القيادة، إدارة الأخبار، المحرر، المراجعة، الوكيل، المصادر…
├── lib/             # supabaseClient، المخزن المحلي (DEMO)، dedup، rewrite (محرك الوكيل)، utils
├── services/        # طبقة البيانات المزدوجة (Supabase ⇄ DEMO) لكل الكيانات
├── hooks/           # useQuery / useTheme / useAuth
├── types/           # الأنواع المشتركة
supabase/
├── migrations/      # مخطط كامل + RLS + RPC
├── functions/news-agent/  # وكيل RSS (Deno Edge Function)
└── seed.sql
scripts/             # توليد الصور التعبيرية + sitemap
```

## القاعدة التحريرية (إلزامية)

- **لا نسخ** من المصادر — إعادة صياغة مستقلة للوقائع فقط.
- **إحالة دائمة**: اسم المصدر + الرابط الأصلي + تاريخه أسفل كل مادة.
- **لا اختلاق** لأي معلومة غير واردة في المصدر.
- المحتوى الآلي لا يُنشر إلا بعد مراجعة بشرية: `NEW → PROCESSING → AI_EDITED → PENDING_REVIEW → PUBLISHED`.
- البيانات التجريبية موسومة دائماً بـ **DEMO**.

## NEWS AI AGENT

- **وضع DEMO**: محاكاة كاملة من لوحة «وكيل الأخبار AI» (أسلاك خام محلية + منع تكرار حقيقي + محرك إعادة صياغة محلي في `src/lib/rewrite.ts`).
- **الإنتاج**: Edge Function تقرأ RSS لمصادرك المضافة من «إدارة المصادر»، مع منع تكرار (رابط + تشابه عناوين ±72 ساعة) وإرسال المواد إلى قائمة المراجعة.

## الأدوار والصلاحيات (RLS)

| القدرة | USER | AUTHOR | EDITOR | ADMIN |
|---|---|---|---|---|
| قراءة المنشور | ✅ | ✅ | ✅ | ✅ |
| إضافة خبر | — | ✅ | ✅ | ✅ |
| تعديل أي خبر | — | — | ✅ | ✅ |
| نشر/حذف | — | — | ✅ | ✅ |
| المصادر والإعدادات | — | — | — | ✅ |
| الإشراف على التعليقات | — | — | ✅ | ✅ |

## الأداء (Core Web Vitals)

صور SVG مولّدة خفيفة مع `loading="lazy"` و`decoding="async"` وأبعاد ثابتة، خطوط `display=swap`، Code Splitting عبر Vite، تخزين مؤقت عدواني لأصول `assets/` عبر Netlify Headers، وتقليل CLS بمقاسات ثابتة للبطاقات.
