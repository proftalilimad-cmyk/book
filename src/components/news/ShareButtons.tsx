import { useState } from 'react';
import { Check, Copy, Facebook, Linkedin, Send, Share2, Twitter } from 'lucide-react';
import { cx } from '@/lib/utils';

interface Props {
  url: string;
  title: string;
  vertical?: boolean;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.8-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5s.8 1.9.8 2c.1.1.1.3 0 .5-.3.6-.7.9-.5 1.2.7 1.2 1.6 2 2.7 2.7.3.2.5.1.7-.1l.9-1c.2-.3.4-.2.7-.1l1.9.9c.3.2.5.2.6.4 0 .1 0 .7-.2 1.2Z" />
    </svg>
  );
}

export default function ShareButtons({ url, title, vertical = false }: Props) {
  const [copied, setCopied] = useState(false);
  const absoluteUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;

  const links = [
    {
      name: 'فيسبوك',
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(absoluteUrl)}`,
      cls: 'hover:bg-[#1877f2] hover:text-white',
    },
    {
      name: 'إكس',
      icon: Twitter,
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(absoluteUrl)}&text=${encodeURIComponent(title)}`,
      cls: 'hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black',
    },
    {
      name: 'واتساب',
      icon: WhatsAppIcon,
      href: `https://wa.me/?text=${encodeURIComponent(`${title} ${absoluteUrl}`)}`,
      cls: 'hover:bg-[#25d366] hover:text-white',
    },
    {
      name: 'تيليغرام',
      icon: Send,
      href: `https://t.me/share/url?url=${encodeURIComponent(absoluteUrl)}&text=${encodeURIComponent(title)}`,
      cls: 'hover:bg-[#229ed9] hover:text-white',
    },
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(absoluteUrl);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = absoluteUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cx('flex items-center gap-2', vertical && 'flex-col items-stretch')}
      aria-label="مشاركة الخبر"
    >
      <span className={cx('flex items-center gap-1 text-xs font-black text-ink-400', vertical && 'justify-center')}>
        <Share2 className="h-3.5 w-3.5" />
        مشاركة
      </span>
      <div className={cx('flex gap-2', vertical && 'grid grid-cols-2 gap-2')}>
        {links.map((l) => (
          <a
            key={l.name}
            href={l.href}
            target="_blank"
            rel="noreferrer"
            title={`مشاركة عبر ${l.name}`}
            aria-label={`مشاركة عبر ${l.name}`}
            className={cx(
              'rounded-xl bg-ink-100 p-2.5 text-ink-600 transition-colors dark:bg-ink-800 dark:text-ink-300',
              l.cls,
            )}
          >
            <l.icon className="h-4 w-4" />
          </a>
        ))}
        <button
          onClick={copy}
          title="نسخ الرابط"
          aria-label="نسخ الرابط"
          className={cx(
            'rounded-xl p-2.5 transition-colors',
            copied
              ? 'bg-cedar-600 text-white'
              : 'bg-ink-100 text-ink-600 hover:bg-cedar-600 hover:text-white dark:bg-ink-800 dark:text-ink-300',
          )}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
