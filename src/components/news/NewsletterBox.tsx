import { useState } from 'react';
import { BellRing, CheckCircle2 } from 'lucide-react';

export default function NewsletterBox() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  return (
    <section className="card overflow-hidden" aria-label="النشرة البريدية">
      <div className="bg-gradient-to-bl from-brand-600 to-brand-800 p-5 text-white">
        <h3 className="flex items-center gap-2 text-lg font-black">
          <BellRing className="h-5 w-5" />
          النشرة الإخبارية
        </h3>
        <p className="mt-2 text-sm leading-6 text-brand-100">
          اشترك ليصلك موجز يومي بأهم أخبار المغرب مباشرة على بريدك.
        </p>
      </div>
      <form
        className="space-y-2.5 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (email.includes('@')) setDone(true);
        }}
      >
        {done ? (
          <p className="flex items-center gap-2 rounded-xl bg-cedar-600/10 px-4 py-3 text-sm font-bold text-cedar-600">
            <CheckCircle2 className="h-4 w-4" />
            تم تسجيل اشتراكك بنجاح!
          </p>
        ) : (
          <>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="بريدك الإلكتروني"
              className="input"
            />
            <button type="submit" className="btn-primary w-full">
              اشترك الآن
            </button>
          </>
        )}
      </form>
    </section>
  );
}
