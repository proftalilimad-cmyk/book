-- ============================================================
-- NEWS MAROC — Database Schema (Supabase / PostgreSQL)
-- يشمل: الجداول + الفهارس + RLS + الدوال المساعدة
-- ============================================================

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ---------- الأنواع ----------
do $$ begin
  create type public.app_role as enum ('ADMIN', 'EDITOR', 'AUTHOR', 'USER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.article_status as enum
    ('draft', 'new', 'processing', 'ai_edited', 'pending_review', 'published', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.comment_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.source_status as enum ('active', 'paused', 'error');
exception when duplicate_object then null; end $$;

-- ---------- users (الملفات الشخصية) ----------
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  name text not null default '',
  role public.app_role not null default 'USER',
  created_at timestamptz not null default now()
);

-- ---------- categories ----------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  color text not null default '#c1272d',
  description text,
  sort int not null default 0
);

-- ---------- tags ----------
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique
);

-- ---------- sources ----------
create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  rss_url text,
  category_slug text,
  logo_url text,
  status public.source_status not null default 'active',
  created_at timestamptz not null default now(),
  last_fetched_at timestamptz
);

-- ---------- articles ----------
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  slug text not null unique,
  summary text not null default '',
  content text not null default '',
  category text not null default 'maroc' references public.categories (slug) on update cascade,
  region text,
  tags text[] not null default '{}',
  featured_image text not null default '',
  gallery text[],
  source_name text,
  source_url text,
  source_published_at timestamptz,
  source_id uuid references public.sources (id) on delete set null,
  author_id uuid references public.users (id) on delete set null,
  author_name text,
  status public.article_status not null default 'draft',
  is_breaking boolean not null default false,
  is_demo boolean not null default false,
  views bigint not null default 0,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  meta_title text,
  meta_description text,
  keywords text[],
  agent_log jsonb
);

create index if not exists articles_status_idx on public.articles (status);
create index if not exists articles_category_idx on public.articles (category);
create index if not exists articles_region_idx on public.articles (region);
create index if not exists articles_published_idx on public.articles (published_at desc);
create index if not exists articles_breaking_idx
  on public.articles (is_breaking) where is_breaking and status = 'published';
create index if not exists articles_title_trgm_idx on public.articles using gin (title gin_trgm_ops);
create unique index if not exists articles_source_url_uniq
  on public.articles (source_url) where source_url is not null;

-- ---------- article_sources (تتبع الأصول) ----------
create table if not exists public.article_sources (
  id bigserial primary key,
  article_id uuid not null references public.articles (id) on delete cascade,
  source_id uuid references public.sources (id) on delete cascade,
  original_url text not null,
  fetched_at timestamptz not null default now(),
  unique (article_id, source_id, original_url)
);

-- ---------- article_tags ----------
create table if not exists public.article_tags (
  article_id uuid not null references public.articles (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (article_id, tag_id)
);

-- ---------- images (مكتبة الوسائط المرخّصة) ----------
create table if not exists public.images (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  alt text,
  license text not null default 'internal' check (license in ('internal', 'licensed', 'ai_generated', 'uploaded')),
  uploaded_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- views ----------
create table if not exists public.views (
  id bigserial primary key,
  article_id uuid not null references public.articles (id) on delete cascade,
  viewed_at timestamptz not null default now()
);
create index if not exists views_article_idx on public.views (article_id, viewed_at desc);

-- ---------- comments ----------
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  body text not null check (char_length(body) between 1 and 800),
  status public.comment_status not null default 'pending',
  created_at timestamptz not null default now()
);
create index if not exists comments_article_idx on public.comments (article_id, status, created_at desc);

-- ---------- settings ----------
create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------- news_logs ----------
create table if not exists public.news_logs (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  level text not null default 'info' check (level in ('info', 'warn', 'error')),
  action text not null,
  message text not null,
  meta jsonb
);
create index if not exists news_logs_at_idx on public.news_logs (at desc);

-- ---------- updated_at ----------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_articles_updated on public.articles;
create trigger trg_articles_updated before update on public.articles
  for each row execute function public.set_updated_at();

-- ---------- مستخدم جديد عبر Auth ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, name, role)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data->>'name', ''), 'USER')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- مساعدات الأدوار ----------
create or replace function public.current_user_role() returns public.app_role
language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.users where id = auth.uid()), 'USER'::public.app_role);
$$;

create or replace function public.is_editor_or_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_user_role() in ('EDITOR'::public.app_role, 'ADMIN'::public.app_role);
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_user_role() = 'ADMIN'::public.app_role;
$$;

create or replace function public.can_write_articles() returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_user_role() in ('AUTHOR'::public.app_role, 'EDITOR'::public.app_role, 'ADMIN'::public.app_role);
$$;

-- ---------- عداد المشاهدات ----------
create or replace function public.increment_view(p_article uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.views (article_id) values (p_article);
  update public.articles set views = views + 1 where id = p_article;
end $$;

-- ---------- الأكثر قراءة ----------
create or replace function public.most_read(p_period text default 'today', p_limit int default 5)
returns table (
  id uuid, title text, slug text, category text, featured_image text,
  status public.article_status, is_demo boolean, is_breaking boolean,
  published_at timestamptz, views bigint, period_views bigint
)
language sql stable security definer set search_path = public as $$
  with span as (
    select case p_period
      when 'today' then interval '1 day'
      when 'week'  then interval '7 days'
      else interval '30 days'
    end as i
  ),
  counts as (
    select v.article_id, count(*)::bigint as pv
    from public.views v, span s
    where v.viewed_at > now() - s.i
    group by v.article_id
  )
  select a.id, a.title, a.slug, a.category, a.featured_image,
         a.status, a.is_demo, a.is_breaking, a.published_at, a.views,
         coalesce(c.pv, 0)::bigint as period_views
  from public.articles a
  left join counts c on c.article_id = a.id
  where a.status = 'published'
  order by period_views desc, a.views desc
  limit p_limit;
$$;

-- ---------- سجل الأحداث ----------
create or replace function public.add_news_log(p_level text, p_action text, p_message text, p_meta jsonb default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.news_logs (level, action, message, meta) values (p_level, p_action, p_message, p_meta);
end $$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.sources enable row level security;
alter table public.articles enable row level security;
alter table public.article_sources enable row level security;
alter table public.article_tags enable row level security;
alter table public.images enable row level security;
alter table public.views enable row level security;
alter table public.comments enable row level security;
alter table public.settings enable row level security;
alter table public.news_logs enable row level security;

-- users: قراءة ذاتية، إدارة من ADMIN
drop policy if exists users_select_self on public.users;
create policy users_select_self on public.users for select
  using (auth.uid() = id or public.is_admin());
drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users for update
  using (auth.uid() = id or public.is_admin());
drop policy if exists users_admin_all on public.users;
create policy users_admin_all on public.users for all
  using (public.is_admin()) with check (public.is_admin());

-- categories: قراءة عامة، كتابة ADMIN
drop policy if exists categories_public_read on public.categories;
create policy categories_public_read on public.categories for select using (true);
drop policy if exists categories_admin_write on public.categories;
create policy categories_admin_write on public.categories for all
  using (public.is_admin()) with check (public.is_admin());

-- tags
drop policy if exists tags_public_read on public.tags;
create policy tags_public_read on public.tags for select using (true);
drop policy if exists tags_editor_write on public.tags;
create policy tags_editor_write on public.tags for all
  using (public.is_editor_or_admin()) with check (public.is_editor_or_admin());

-- sources: قراءة للمحررين، إدارة ADMIN
drop policy if exists sources_editor_read on public.sources;
create policy sources_editor_read on public.sources for select using (public.is_editor_or_admin());
drop policy if exists sources_admin_write on public.sources;
create policy sources_admin_write on public.sources for all
  using (public.is_admin()) with check (public.is_admin());

-- articles: الزائر يقرأ المنشور فقط
drop policy if exists articles_public_read on public.articles;
create policy articles_public_read on public.articles for select
  using (status = 'published' or public.can_write_articles());
drop policy if exists articles_insert on public.articles;
create policy articles_insert on public.articles for insert
  with check (public.can_write_articles());
drop policy if exists articles_update on public.articles;
create policy articles_update on public.articles for update
  using (public.is_editor_or_admin() or author_id = auth.uid());
drop policy if exists articles_delete on public.articles;
create policy articles_delete on public.articles for delete
  using (public.is_editor_or_admin());

-- article_sources
drop policy if exists article_sources_editor on public.article_sources;
create policy article_sources_editor on public.article_sources for select
  using (public.is_editor_or_admin());
drop policy if exists article_sources_write on public.article_sources;
create policy article_sources_write on public.article_sources for insert
  with check (public.is_editor_or_admin());

-- article_tags
drop policy if exists article_tags_public_read on public.article_tags;
create policy article_tags_public_read on public.article_tags for select using (true);
drop policy if exists article_tags_write on public.article_tags;
create policy article_tags_write on public.article_tags for all
  using (public.can_write_articles()) with check (public.can_write_articles());

-- images: قراءة عامة (تُعرض في الصفحات)، رفع للمحررين
drop policy if exists images_public_read on public.images;
create policy images_public_read on public.images for select using (true);
drop policy if exists images_editor_write on public.images;
create policy images_editor_write on public.images for all
  using (public.can_write_articles()) with check (public.can_write_articles());

-- views: إدخال مفتوح (يُفضّل عبر RPC)، قراءة للمحررين فقط
drop policy if exists views_public_insert on public.views;
create policy views_public_insert on public.views for insert with check (true);
drop policy if exists views_editor_read on public.views;
create policy views_editor_read on public.views for select using (public.is_editor_or_admin());

-- comments: قراءة المعتمد فقط + إدخال مفتوح للمراجعة + إشراف للمحررين
drop policy if exists comments_public_read on public.comments;
create policy comments_public_read on public.comments for select
  using (status = 'approved' or public.is_editor_or_admin());
drop policy if exists comments_public_insert on public.comments;
create policy comments_public_insert on public.comments for insert
  with check (status = 'pending');
drop policy if exists comments_editor_moderate on public.comments;
create policy comments_editor_moderate on public.comments for update
  using (public.is_editor_or_admin());
drop policy if exists comments_editor_delete on public.comments;
create policy comments_editor_delete on public.comments for delete
  using (public.is_editor_or_admin());

-- settings: إعدادات عامة مقروءة للجميع، تعديل ADMIN
drop policy if exists settings_public_read on public.settings;
create policy settings_public_read on public.settings for select using (true);
drop policy if exists settings_admin_write on public.settings;
create policy settings_admin_write on public.settings for all
  using (public.is_admin()) with check (public.is_admin());

-- news_logs: قراءة للمحررين، كتابة للمحررين/الخدمات
drop policy if exists logs_editor_read on public.news_logs;
create policy logs_editor_read on public.news_logs for select using (public.is_editor_or_admin());
drop policy if exists logs_editor_insert on public.news_logs;
create policy logs_editor_insert on public.news_logs for insert
  with check (public.is_editor_or_admin());

-- ============================================================
-- ملاحظة: لترقية مستخدم إلى ADMIN بعد إنشائه من Supabase Auth:
--   update public.users set role = 'ADMIN' where email = 'admin@newsmaroc.ma';
-- ============================================================
