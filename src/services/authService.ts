// ============================================================
// المصادقة والصلاحيات — Supabase Auth أو وضع تجريبي موضّح
// ============================================================

import { supabase, dataMode } from '@/lib/supabaseClient';
import type { Role, SessionUser } from '@/types';

const SESSION_KEY = 'newsmaroc.session.v1';

/**
 * حسابات تجريبية (DEMO) — تُستعمل فقط دون ربط Supabase.
 * في الإنتاج تُدار الهويات عبر Supabase Auth وجدول users.
 */
export const DEMO_ACCOUNTS: Array<{ email: string; password: string; name: string; role: Role }> = [
  { email: 'admin@newsmaroc.ma', password: 'admin123', name: 'مدير النظام', role: 'ADMIN' },
  { email: 'editor@newsmaroc.ma', password: 'editor123', name: 'محرر أول', role: 'EDITOR' },
];

export async function signIn(email: string, password: string): Promise<SessionUser> {
  if (dataMode === 'supabase' && supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error('بيانات الدخول غير صحيحة');
    const uid = data.user.id;
    const { data: profile } = await supabase
      .from('users')
      .select('name, role')
      .eq('id', uid)
      .maybeSingle();
    return {
      id: uid,
      email,
      name: (profile?.name as string) || email,
      role: ((profile?.role as Role) || 'AUTHOR') as Role,
    };
  }
  const acc = DEMO_ACCOUNTS.find(
    (a) => a.email.toLowerCase() === email.trim().toLowerCase() && a.password === password,
  );
  if (!acc) throw new Error('بيانات الدخول غير صحيحة. جرّب حساب DEMO المبيّن أسفله.');
  const user: SessionUser = { id: 'demo-' + acc.role.toLowerCase(), email: acc.email, name: acc.name, role: acc.role };
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
}

export async function signOut(): Promise<void> {
  if (dataMode === 'supabase' && supabase) {
    await supabase.auth.signOut();
    return;
  }
  localStorage.removeItem(SESSION_KEY);
}

export async function getSession(): Promise<SessionUser | null> {
  if (dataMode === 'supabase' && supabase) {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) return null;
    const { data: profile } = await supabase
      .from('users')
      .select('name, role')
      .eq('id', user.id)
      .maybeSingle();
    return {
      id: user.id,
      email: user.email ?? '',
      name: (profile?.name as string) || user.email || '',
      role: ((profile?.role as Role) || 'AUTHOR') as Role,
    };
  }
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function canManageArticles(role?: Role): boolean {
  return role === 'ADMIN' || role === 'EDITOR' || role === 'AUTHOR';
}
export function canManageSystem(role?: Role): boolean {
  return role === 'ADMIN' || role === 'EDITOR';
}
export function canManageSources(role?: Role): boolean {
  return role === 'ADMIN';
}
