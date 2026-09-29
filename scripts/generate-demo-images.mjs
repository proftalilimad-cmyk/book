#!/usr/bin/env node
// ============================================================
// توليد صور تعبيرية مرخّصة داخلياً (SVG) للبيانات التجريبية
// - خالية من حقوق النشر (مولّدة برمجياً)
// - خفيفة جداً وفورية التحميل
// ============================================================

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'demo-images');
mkdirSync(outDir, { recursive: true });

const CATEGORIES = [
  ['maroc', 'المغرب', '#c1272d'],
  ['politics', 'سياسة', '#6d28d9'],
  ['economy', 'اقتصاد', '#047857'],
  ['society', 'مجتمع', '#d97706'],
  ['education', 'تعليم', '#2563eb'],
  ['health', 'صحة', '#db2777'],
  ['sports', 'رياضة', '#16a34a'],
  ['culture', 'ثقافة', '#9333ea'],
  ['technology', 'تكنولوجيا', '#0891b2'],
  ['incidents', 'حوادث', '#ea580c'],
  ['art', 'فن', '#e11d48'],
  ['weather', 'طقس', '#0284c7'],
  ['world', 'العالم', '#334155'],
];

const REGIONS = [
  ['tanger-tetouan-alhoceima', 'طنجة − تطوان − الحسيمة', '#0e7490'],
  ['oriental', 'الشرق', '#b45309'],
  ['fes-meknes', 'فاس − مكناس', '#7c2d12'],
  ['rabat-sale-kenitra', 'الرباط − سلا − القنيطرة', '#1d4ed8'],
  ['beni-mellal-khenifra', 'بني ملال − خنيفرة', '#15803d'],
  ['casablanca-settat', 'الدار البيضاء − سطات', '#c1272d'],
  ['marrakech-safi', 'مراكش − آسفي', '#be123c'],
  ['draa-tafilalet', 'درعة − تافيلالت', '#a16207'],
  ['souss-massa', 'سوس − ماسة', '#0369a1'],
  ['guelmim-oued-noun', 'كلميم − واد نون', '#92400e'],
  ['laayoune-sakia-elhamra', 'العيون − الساقية الحمراء', '#9f1239'],
  ['dakhla-oued-eddahab', 'الداخلة − وادي الذهب', '#0f766e'],
];

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 255) * f)));
  const g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 255) * f)));
  const b = Math.max(0, Math.min(255, Math.round((n & 255) * f)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

let seedI = 1;
function rnd(seed) {
  let h = 2166136261 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

function svg({ label, sub, color, variant }) {
  const id = `g${variant}`;
  const dark = shade(color, 0.55);
  const darker = shade(color, 0.3);
  const cx1 = 200 + rnd(label + 'a') * 800;
  const cy1 = 80 + rnd(label + 'b') * 500;
  const cx2 = 150 + rnd(label + 'c') * 900;
  const cy2 = 60 + rnd(label + 'd') * 550;
  const lines = Array.from({ length: 9 }, (_, i) => {
    const x = i * 150 - 100;
    return `<line x1="${x}" y1="900" x2="${x + 380}" y2="-250" stroke="#ffffff" stroke-opacity="0.045" stroke-width="26"/>`;
  }).join('\n    ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${color}"/>
      <stop offset="0.55" stop-color="${dark}"/>
      <stop offset="1" stop-color="${darker}"/>
    </linearGradient>
    <radialGradient id="${id}r" cx="0.5" cy="0.4" r="0.9">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.16"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="675" fill="url(#${id})"/>
  <rect width="1200" height="675" fill="url(#${id}r)"/>
  <g>${lines}</g>
  <circle cx="${cx1.toFixed(0)}" cy="${cy1.toFixed(0)}" r="${(120 + rnd(label + 'e') * 160).toFixed(0)}" fill="#ffffff" fill-opacity="0.07"/>
  <circle cx="${cx2.toFixed(0)}" cy="${cy2.toFixed(0)}" r="${(60 + rnd(label + 'f') * 110).toFixed(0)}" fill="#000000" fill-opacity="0.08"/>
  <circle cx="${(cx1 + cx2) / 2}" cy="${(cy1 + cy2) / 2}" r="${(40 + rnd(label + 'g') * 70).toFixed(0)}" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="3"/>
  <g font-family="Tajawal, 'Segoe UI', Arial, sans-serif" text-anchor="middle">
    <rect x="470" y="402" width="260" height="52" rx="26" fill="#000000" fill-opacity="0.28"/>
    <text x="600" y="436" font-size="26" font-weight="700" fill="#ffffff" fill-opacity="0.9" direction="rtl">NEWS MAROC</text>
    <text x="600" y="368" font-size="112" font-weight="900" fill="#ffffff" direction="rtl">${label}</text>
    <text x="600" y="300" font-size="28" font-weight="500" fill="#ffffff" fill-opacity="0.75" direction="rtl">${sub}</text>
  </g>
  <path d="M96 116 L106.9 146 L139 147 L114 166 L121 197 L96 179 L71 197 L78 166 L53 147 L85 146 Z" fill="#ffffff" fill-opacity="0.85"/>
  <rect x="0" y="638" width="1200" height="37" fill="#000000" fill-opacity="0.22"/>
  <text x="1150" y="663" font-family="Tajawal, Arial" font-size="20" font-weight="700" fill="#ffffff" fill-opacity="0.65" text-anchor="end" direction="rtl">صورة تعبيرية · DEMO IMAGE · مرخّصة داخلياً</text>
</svg>`;
}

let count = 0;

// 3 نسخ لكل تصنيف
for (const [slug, name, color] of CATEGORIES) {
  for (let v = 0; v < 3; v++) {
    const file = join(outDir, `${slug}-${v}.svg`);
    writeFileSync(
      file,
      svg({ label: name, sub: v === 0 ? 'تغطية مستمرة على مدار الساعة' : 'متابعة إخبارية محترفة', color: shade(color, 1 - v * 0.12), variant: `${slug}${v}` }),
      'utf8',
    );
    count++;
  }
}

// الجهات
for (const [slug, name, color] of REGIONS) {
  writeFileSync(
    join(outDir, `region-${slug}.svg`),
    svg({ label: name, sub: 'أخبار الجهات', color, variant: slug }),
    'utf8',
  );
  count++;
}

// غلاف Open Graph
writeFileSync(
  join(outDir, 'og-cover.svg'),
  svg({ label: 'NEWS MAROC', sub: 'أخبار المغرب لحظة بلحظة', color: '#c1272d', variant: 'og' }),
  'utf8',
);
// نسخة في جذر public لأن Seo يشير إليها
writeFileSync(join(root, 'public', 'og-cover.svg'), svg({ label: 'NEWS MAROC', sub: 'أخبار المغرب لحظة بلحظة', color: '#c1272d', variant: 'ogroot' }), 'utf8');
count += 2;

console.log(`✓ تم توليد ${count} صورة تعبيرية في public/demo-images/ (batches: ${++seedI})`);
