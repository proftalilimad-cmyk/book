-- ============================================================
-- NEWS MAROC — أعمدة بيانات الصور للأخبار (extract-image pipeline)
-- تُضاف إلى جدول articles: رابط الصورة المستخرج + مصدره + أبعاده +
-- بيانات الحقوق والحالة. لا يُنقل أي ملف صورة إلى الخادم — الروابط
-- الأصلية تُعرض بربط ساخن (hotlink) مع الإسناد الكامل.
-- ============================================================

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS image_url          text,
  ADD COLUMN IF NOT EXISTS image_source_url   text,
  ADD COLUMN IF NOT EXISTS image_alt          text,
  ADD COLUMN IF NOT EXISTS image_width        integer,
  ADD COLUMN IF NOT EXISTS image_height       integer,
  ADD COLUMN IF NOT EXISTS image_source_name  text,
  ADD COLUMN IF NOT EXISTS image_license      text,
  ADD COLUMN IF NOT EXISTS image_attribution  text,
  ADD COLUMN IF NOT EXISTS image_rights       text CHECK (image_rights IN ('licensed','publisher','unknown')),
  ADD COLUMN IF NOT EXISTS image_status       text CHECK (image_status IN ('found','not_found','invalid','unknown_rights','requires_review'));

COMMENT ON COLUMN articles.image_url         IS 'رابط الصورة الرئيسية المستخرجة (HTTPS واحد، بدون ترميز مزدوج)';
COMMENT ON COLUMN articles.image_source_url  IS 'رابط صفحة المصدر التي وُجدت فيها الصورة — لغرض الإسناد';
COMMENT ON COLUMN articles.image_alt         IS 'النص البديل للصورة (alt)';
COMMENT ON COLUMN articles.image_width       IS 'عرض الصورة بالبكسل إن عُرف';
COMMENT ON COLUMN articles.image_height      IS 'ارتفاع الصورة بالبكسل إن عُرف';
COMMENT ON COLUMN articles.image_source_name IS 'اسم الجهة الناشرة للصورة';
COMMENT ON COLUMN articles.image_license     IS 'اسم الترخيص المصرّح به إن وُجد (وإلا NULL)';
COMMENT ON COLUMN articles.image_attribution IS 'سطر الإسناد المعروض تحت الصورة';
COMMENT ON COLUMN articles.image_rights      IS 'طبيعة الحقوق: licensed / publisher / unknown';
COMMENT ON COLUMN articles.image_status      IS 'حالة معالجة الصورة: found / not_found / invalid / unknown_rights / requires_review';

-- فهرس لترشيح الأخبار حسب حالة الصورة في لوحة الإدارة
CREATE INDEX IF NOT EXISTS articles_image_status_idx ON articles (image_status);
