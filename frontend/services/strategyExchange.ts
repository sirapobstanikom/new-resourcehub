import { supabase } from '../lib/supabase';
import type { Post, Comment } from '../types';

type DbPost = {
  id: string;
  tool_id: string;
  author_name: string;
  author_avatar: string;
  content: string;
  image_url?: string | null;
  like_count?: number | null;
  created_at: string;
};

type DbComment = {
  id: string;
  post_id: string;
  author_name: string;
  author_avatar: string;
  comment_text: string;
  image_url?: string | null;
  created_at: string;
};

function mapComment(row: DbComment): Comment {
  return {
    id: row.id,
    authorName: row.author_name,
    authorAvatar: row.author_avatar || '',
    commentText: row.comment_text,
    imageUrl: row.image_url ?? undefined,
    createdAt: row.created_at,
  };
}

function mapPost(row: DbPost, comments: Comment[] = []): Post {
  return {
    id: row.id,
    authorName: row.author_name,
    authorAvatar: row.author_avatar || '',
    content: row.content,
    imageUrl: row.image_url ?? undefined,
    likeCount: row.like_count ?? 0,
    createdAt: row.created_at,
    comments: comments.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    ),
  };
}

/** โหลดโพสต์และคอมเมนต์ของ Strategy Exchange ตาม tool_id */
export async function getPosts(toolId: string): Promise<Post[]> {
  const { data: postsData, error: postsError } = await supabase
    .from('strategy_posts')
    .select('*')
    .eq('tool_id', toolId)
    .order('created_at', { ascending: false });

  if (postsError) {
    return [];
  }

  const posts = (postsData ?? []) as DbPost[];
  if (posts.length === 0) return [];

  const postIds = posts.map((p) => p.id);
  const { data: commentsData, error: commentsError } = await supabase
    .from('strategy_comments')
    .select('*')
    .in('post_id', postIds)
    .order('created_at', { ascending: true });

  if (commentsError) {
    return posts.map((p) => mapPost(p, []));
  }

  const comments = (commentsData ?? []) as DbComment[];
  const commentsByPost = comments.reduce<Record<string, Comment[]>>((acc, c) => {
    if (!acc[c.post_id]) acc[c.post_id] = [];
    acc[c.post_id].push(mapComment(c));
    return acc;
  }, {});

  return posts.map((p) => mapPost(p, commentsByPost[p.id] ?? []));
}

/** สร้างโพสต์ใหม่ */
export async function createPost(
  toolId: string,
  payload: { authorName: string; authorAvatar: string; content: string; imageUrl?: string }
): Promise<Post | null> {
  const row: Record<string, unknown> = {
    tool_id: toolId,
    author_name: payload.authorName,
    author_avatar: payload.authorAvatar,
    content: payload.content,
  };
  if (payload.imageUrl) row.image_url = payload.imageUrl;
  const { data, error } = await supabase
    .from('strategy_posts')
    .insert(row)
    .select()
    .single();

  if (error) {
    return null;
  }

  return mapPost(data as DbPost, []);
}

/** เพิ่มคอมเมนต์ในโพสต์ */
export async function addComment(
  postId: string,
  payload: { authorName: string; authorAvatar: string; commentText: string; imageUrl?: string }
): Promise<Comment | null> {
  const row: Record<string, unknown> = {
    post_id: postId,
    author_name: payload.authorName,
    author_avatar: payload.authorAvatar,
    comment_text: payload.commentText,
  };
  if (payload.imageUrl) row.image_url = payload.imageUrl;
  const { data, error } = await supabase
    .from('strategy_comments')
    .insert(row)
    .select()
    .single();

  if (error) {
    return null;
  }

  return mapComment(data as DbComment);
}

/** แก้ไขเนื้อหาโพสต์ (ต้องอนุญาตที่ฝั่ง RLS ของ Supabase) */
export async function updatePost(
  postId: string,
  payload: { content: string; imageUrl: string | null }
): Promise<{ content: string; imageUrl?: string } | null> {
  const row = {
    content: payload.content,
    image_url: payload.imageUrl,
  };
  /** ใช้ maybeSingle: ถ้า RLS บล็อกจะได้ 0 แถว — single() ทำให้ PostgREST ตอบ 406 */
  const { data, error } = await supabase
    .from('strategy_posts')
    .update(row)
    .eq('id', postId)
    .select()
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const r = data as DbPost;
  return {
    content: r.content,
    imageUrl: r.image_url ?? undefined,
  };
}

/** แก้ไขคอมเมนต์ */
export async function updateComment(
  commentId: string,
  payload: { commentText: string; imageUrl: string | null }
): Promise<{ commentText: string; imageUrl?: string } | null> {
  const { data, error } = await supabase
    .from('strategy_comments')
    .update({
      comment_text: payload.commentText,
      image_url: payload.imageUrl,
    })
    .eq('id', commentId)
    .select()
    .maybeSingle();

  if (error || !data) return null;
  const row = data as DbComment;
  return {
    commentText: row.comment_text,
    imageUrl: row.image_url ?? undefined,
  };
}

/** ลบโพสต์ */
export async function deletePost(postId: string): Promise<boolean> {
  const { error } = await supabase
    .from('strategy_posts')
    .delete()
    .eq('id', postId);
  return !error;
}

/** ลบคอมเมนต์ */
export async function deleteComment(commentId: string): Promise<boolean> {
  const { error } = await supabase
    .from('strategy_comments')
    .delete()
    .eq('id', commentId);
  return !error;
}

/** กดไลค์โพสต์ (เพิ่ม like_count 1) */
export async function incrementPostLike(postId: string): Promise<number | null> {
  const { data: row, error: fetchError } = await supabase
    .from('strategy_posts')
    .select('like_count')
    .eq('id', postId)
    .single();
  if (fetchError || row == null) return null;
  const next = (Number((row as { like_count?: number }).like_count) || 0) + 1;
  const { error: setError } = await supabase
    .from('strategy_posts')
    .update({ like_count: next })
    .eq('id', postId);
  if (setError) return null;
  return next;
}
