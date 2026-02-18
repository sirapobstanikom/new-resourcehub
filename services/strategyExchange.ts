import { supabase } from '../lib/supabase';
import type { Post, Comment } from '../types';

type DbPost = {
  id: string;
  tool_id: string;
  author_name: string;
  author_avatar: string;
  content: string;
  created_at: string;
};

type DbComment = {
  id: string;
  post_id: string;
  author_name: string;
  author_avatar: string;
  comment_text: string;
  created_at: string;
};

function mapComment(row: DbComment): Comment {
  return {
    id: row.id,
    authorName: row.author_name,
    authorAvatar: row.author_avatar || '',
    commentText: row.comment_text,
    createdAt: row.created_at,
  };
}

function mapPost(row: DbPost, comments: Comment[] = []): Post {
  return {
    id: row.id,
    authorName: row.author_name,
    authorAvatar: row.author_avatar || '',
    content: row.content,
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
    console.error('getPosts error:', postsError);
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
    console.error('getComments error:', commentsError);
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
  payload: { authorName: string; authorAvatar: string; content: string }
): Promise<Post | null> {
  const { data, error } = await supabase
    .from('strategy_posts')
    .insert({
      tool_id: toolId,
      author_name: payload.authorName,
      author_avatar: payload.authorAvatar,
      content: payload.content,
    })
    .select()
    .single();

  if (error) {
    console.error('createPost error:', error);
    return null;
  }

  return mapPost(data as DbPost, []);
}

/** เพิ่มคอมเมนต์ในโพสต์ */
export async function addComment(
  postId: string,
  payload: { authorName: string; authorAvatar: string; commentText: string }
): Promise<Comment | null> {
  const { data, error } = await supabase
    .from('strategy_comments')
    .insert({
      post_id: postId,
      author_name: payload.authorName,
      author_avatar: payload.authorAvatar,
      comment_text: payload.commentText,
    })
    .select()
    .single();

  if (error) {
    console.error('addComment error:', error);
    return null;
  }

  return mapComment(data as DbComment);
}
