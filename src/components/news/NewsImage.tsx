import { useState } from 'react';
import { categoryDefaultImage, toHttps } from '@/lib/images';

interface Props {
  src?: string;
  alt?: string;
  category?: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  eager?: boolean;
  /** يُمرَّر عندما تتوفر نسخ متعددة الأبعاد (الأصول المحلية المرخّصة فقط — لا نشتق نسخاً من صور الناشرين حفاظاً على الحقوق) */
  srcSet?: string;
  sizes?: string;
}

/**
 * صورة خبر آمنة:
 *  - تراجع تلقائي لصورة القسم عند فشل الرابط (صورة غير قابلة للوصول)
 *  - HTTPS قسري، بدون Referrer (يتفادى حظر الربط الساخن لدى بعض الناشرين)
 *  - lazy + async decoding — لا تعديل على الصورة الأصلية ولا حذف للعلامات المائية
 */
export default function NewsImage({ src, alt, category, className, width, height, eager, srcSet, sizes }: Props) {
  const [failed, setFailed] = useState(false);
  const clean = (src ?? '').trim();
  const finalSrc = !clean || failed ? categoryDefaultImage(category ?? 'maroc') : toHttps(clean);
  return (
    <img
      src={finalSrc}
      srcSet={failed ? undefined : srcSet}
      sizes={failed ? undefined : sizes}
      alt={alt ?? ''}
      width={width}
      height={height}
      className={className}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => !failed && setFailed(true)}
    />
  );
}
