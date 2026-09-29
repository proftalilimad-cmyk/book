// ============================================================
// نظام التعليقات — لا يظهر أي تعليق قبل الموافقة (PENDING → APPROVED/REJECTED)
// ============================================================

import { supabase, dataMode } from '@/lib/supabaseClient';
import { loadDB, mutate } from '@/lib/store';
import type { Comment, CommentStatus } from '@/types';
import { uid } from '@/lib/utils';

export async function listApprovedComments(articleId: string): Promise<Comment[]> {
  if (dataMode === 'supabase' && supabase) {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('article_id', articleId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Comment[];
  }
  return loadDB()
    .comments.filter((c) => c.article_id === articleId && c.status === 'approved')
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
}

export async function listAllComments(status?: CommentStatus): Promise<Comment[]> {
  if (dataMode === 'supabase' && supabase) {
    let q = supabase.from('comments').select('*').order('created_at', { ascending: false });
    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []) as Comment[];
  }
  let out = [...loadDB().comments];
  if (status) out = out.filter((c) => c.status === status);
  return out.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
}

export async function addComment(articleId: string, name: string, body: string): Promise<void> {
  const comment: Comment = {
    id: uid(),
    article_id: articleId,
    name: name.trim().slice(0, 60),
    body: body.trim().slice(0, 800),
    status: 'pending',
    created_at: new Date().toISOString(),
  };
  if (dataMode === 'supabase' && supabase) {
    const { error } = await supabase.from('comments').insert(comment);
    if (error) throw new Error(error.message);
    return;
  }
  mutate((db) => {
    db.comments.unshift(comment);
  });
}

export async function setCommentStatus(id: string, status: CommentStatus): Promise<void> {
  if (dataMode === 'supabase' && supabase) {
    const { error } = await supabase.from('comments').update({ status }).eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }
  mutate((db) => {
    const c = db.comments.find((x) => x.id === id);
    if (c) c.status = status;
  });
}

export async function deleteComment(id: string): Promise<void> {
  if (dataMode === 'supabase' && supabase) {
    const { error } = await supabase.from('comments').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }
  mutate((db) => {
    db.comments = db.comments.filter((c) => c.id !== id);
  });
}
