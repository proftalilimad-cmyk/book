// ============================================================
// NEWS MAROC — الأنواع المشتركة
// ============================================================

export type Role = 'ADMIN' | 'EDITOR' | 'AUTHOR' | 'USER';

export type ArticleStatus =
  | 'draft'
  | 'new'
  | 'fetched'
  | 'duplicate'
  | 'processing'
  | 'ai_edited'
  | 'verified'
  | 'rewritten'
  | 'pending_review'
  | 'review_required'
  | 'published'
  | 'rejected'
  | 'archived';

export type CommentStatus = 'pending' | 'approved' | 'rejected';
export type SourceStatus = 'active' | 'paused' | 'error';

export interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
  description?: string;
  order: number;
}

export interface Region {
  id: string;
  name: string;
  slug: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export type SourceFetchStatus = 'ok' | 'error' | 'never';
export type SourceLanguage = 'ar' | 'fr' | 'en';

export interface Source {
  id: string;
  name: string;
  url: string;
  rss_url?: string;
  category_slug?: string;
  /** لغة محتوى المصدر — المقالات تُعالج وتُنشر بالعربية دائماً */
  language?: SourceLanguage;
  /** بلد المصدر (MA للمغرب) */
  country?: string;
  logo_url?: string;
  /** أولوية المراقبة 1 (منخفضة) إلى 5 (قصوى) — الأعلى يُفحص أولاً */
  priority?: number;
  status: SourceStatus;
  created_at: string;
  last_fetched_at?: string;
  /** نتيجة آخر عملية جلب */
  fetch_status?: SourceFetchStatus;
  fetch_error?: string;
  /** عدد المواد المجلوبة في آخر جلب ناجح */
  items_fetched?: number;
}

/** إحالة مصدر مرتبط بخبر — تُجمع كل المصادر التي غطّت الحدث نفسه */
export interface SourceReference {
  name: string;
  url: string;
  published_at?: string;
}

/** حالة الصورة المستخرجة مع الخبر */
export type ImageStatus = 'found' | 'not_found' | 'invalid' | 'unknown_rights' | 'requires_review';
/** وضع حقوق الاستخدام — الافتراضي unknown عند عدم التأكد، ولا تُنسخ الصورة للخادم أبداً */
export type ImageRights = 'licensed' | 'publisher' | 'unknown';

export interface AgentLogEntry {
  at: string;
  step: string;
  note?: string;
}

export interface Article {
  id: string;
  title: string;
  subtitle?: string;
  slug: string;
  summary: string;
  content: string; // HTML معقّم
  category: string; // slug
  region?: string; // slug
  tags: string[];
  featured_image: string;
  gallery?: string[];
  source_name?: string;
  source_url?: string;
  source_published_at?: string;
  author_name?: string;
  /** الرابط القانوني المطبّع (بدون وسوم تتبع) — أساس منع التكرار */
  canonical_url?: string;
  /** العنوان المطبّع عربياً للمقارنة */
  normalized_title?: string;
  /** بصمة المحتوى المطبّع */
  content_hash?: string;
  /** مجموعة التكرار: كل نسخ الحدث الواحد تتقاسمه (معرّف الخبر الرئيسي) */
  duplicate_group_id?: string;
  /** كل المصادر التي غطّت الحدث نفسه (يتضمن المصدر الأول) */
  source_references?: SourceReference[];
  /** الصورة الرئيسية المستخرجة مع الخبر (رابط أصلي فقط — لا نسخ إلى الخادم) */
  image_url?: string;
  /** الصفحة التي استُخرجت منها الصورة */
  image_source_url?: string;
  image_alt?: string;
  image_width?: number;
  image_height?: number;
  /** اسم ناشر الصورة (يُعرض معها للإسناد) */
  image_source_name?: string;
  /** الترخيص إن صرّح به المصدر، وإلا licensed-local للمحلية أو unknown */
  image_license?: string;
  /** نص الإسناد المعروض تحت الصورة */
  image_attribution?: string;
  image_rights?: ImageRights;
  /** حالة الاستخراج: FOUND / NOT_FOUND / INVALID / UNKNOWN_RIGHTS / REQUIRES_REVIEW */
  image_status?: ImageStatus;
  status: ArticleStatus;
  is_breaking: boolean;
  is_demo: boolean;
  views: number;
  published_at: string;
  created_at: string;
  updated_at: string;
  meta_title?: string;
  meta_description?: string;
  keywords?: string[];
  agent_log?: AgentLogEntry[];
}

export interface Comment {
  id: string;
  article_id: string;
  name: string;
  body: string;
  status: CommentStatus;
  created_at: string;
}

export interface SiteSettings {
  site_name: string;
  tagline: string;
  breaking_enabled: boolean;
  comments_enabled: boolean;
  ads: {
    header: boolean;
    homepage: boolean;
    article: boolean;
    sidebar: boolean;
    between: boolean;
  };
  social: {
    facebook: string;
    instagram: string;
    youtube: string;
    x: string;
    tiktok: string;
  };
}

export interface NewsLog {
  id: string;
  at: string;
  level: 'info' | 'warn' | 'error';
  action: string;
  message: string;
  meta?: Record<string, unknown>;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ArticleFilter {
  category?: string;
  region?: string;
  status?: ArticleStatus | ArticleStatus[];
  search?: string;
  tag?: string;
  breaking?: boolean;
  demo?: boolean;
  excludeId?: string;
  page?: number;
  pageSize?: number;
  sort?: 'latest' | 'views';
}

export interface AdminStats {
  totalArticles: number;
  todayArticles: number;
  publishedArticles: number;
  pendingReview: number;
  breakingArticles: number;
  totalSources: number;
  activeSources: number;
  totalViews: number;
  pendingComments: number;
}
