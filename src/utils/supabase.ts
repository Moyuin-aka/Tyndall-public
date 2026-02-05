import { createClient } from '@supabase/supabase-js';

// Supabase 客户端配置
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('缺少 Supabase 环境变量配置，请检查 .env 文件');
}

// 创建 Supabase 客户端实例
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Memos 数据类型定义
export interface Memo {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  tags?: string[];
  visibility: 'public' | 'private';
  resources?: MemoResource[];
  user_id?: string;
}

export interface MemoResource {
  type: string;
  url: string;
  filename?: string;
  size?: number;
}

/**
 * 获取公开的 memos 列表
 * @param limit 限制数量，默认 50
 * @returns 
 */
export async function getPublicMemos(limit = 50): Promise<Memo[]> {
  const { data, error } = await supabase
    .from('memos')
    .select('*')
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('获取 memos 失败:', error);
    throw error;
  }

  return data || [];
}

/**
 * 创建新的 memo
 * @param content memo 内容
 * @param tags 标签数组
 * @param resources 附件资源
 * @param visibility 可见性
 */
export async function createMemo(
  content: string,
  tags: string[] = [],
  resources: MemoResource[] = [],
  visibility: 'public' | 'private' = 'public'
) {
  const { data, error } = await supabase
    .from('memos')
    .insert([
      {
        content,
        tags,
        resources,
        visibility,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('创建 memo 失败:', error);
    throw error;
  }

  return data;
}

/**
 * 上传图片到 Supabase Storage
 * @param file 文件对象
 * @param bucket Storage bucket 名称
 */
export async function uploadImage(file: File, bucket = 'memos-images') {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `${fileName}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('上传图片失败:', error);
    throw error;
  }

  // 获取公开 URL
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return {
    path: data.path,
    url: urlData.publicUrl,
  };
}

// 评论数据类型定义
export interface Comment {
  id: string;
  translation_key: string; // 文章的 translationKey，中英文共享
  author_name: string;
  author_email: string;
  author_website?: string;
  author_avatar?: string; // OAuth 用户的头像 URL
  content: string;
  parent_id?: string; // 父评论 ID，用于嵌套回复
  user_id?: string; // OAuth 登录用户的 ID（匿名评论为 null）
  created_at: string;
  updated_at: string;
  status: 'pending' | 'approved' | 'spam'; // 评论状态
  user_agent?: string;
  ip_address?: string;
}

/**
 * 获取文章的评论列表（按 translationKey）
 * @param translationKey 文章的 translationKey
 * @returns 评论列表（只返回已批准的评论）
 */
export async function getComments(translationKey: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('translation_key', translationKey)
    .eq('status', 'approved')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('获取评论失败:', error);
    throw error;
  }

  return data || [];
}

/**
 * 提交新评论
 * @param translationKey 文章的 translationKey
 * @param authorName 评论者姓名
 * @param authorEmail 评论者邮箱
 * @param content 评论内容
 * @param authorWebsite 评论者网站（可选）
 * @param parentId 父评论 ID（可选，用于回复）
 * @param userId OAuth 用户 ID（可选）
 * @param authorAvatar OAuth 用户头像（可选）
 */
export async function submitComment(
  translationKey: string,
  authorName: string,
  authorEmail: string,
  content: string,
  authorWebsite?: string,
  parentId?: string,
  userId?: string,
  authorAvatar?: string
) {
  const { data, error } = await supabase
    .from('comments')
    .insert([
      {
        translation_key: translationKey,
        author_name: authorName,
        author_email: authorEmail,
        author_website: authorWebsite,
        author_avatar: authorAvatar,
        content,
        parent_id: parentId,
        user_id: userId,
        status: 'approved', // 默认自动批准，也可以设置为 'pending' 需要人工审核
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('提交评论失败:', error);
    throw error;
  }

  return data;
}

/**
 * 删除评论
 * @param commentId 评论 ID
 */
export async function deleteComment(commentId: string) {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    console.error('删除评论失败:', error);
    throw error;
  }

  return true;
}

/**
 * 获取评论数量
 * @param translationKey 文章的 translationKey
 */
export async function getCommentCount(translationKey: string): Promise<number> {
  const { count, error } = await supabase
    .from('comments')
    .select('*', { count: 'exact', head: true })
    .eq('translation_key', translationKey)
    .eq('status', 'approved');

  if (error) {
    console.error('获取评论数量失败:', error);
    return 0;
  }

  return count || 0;
}

// ============ Auth 相关函数 ============

/**
 * 获取当前登录用户
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

/**
 * 获取当前会话
 */
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) return null;
  return session;
}

/**
 * 使用 OAuth 登录
 * @param provider 'github' | 'google'
 */
export async function signInWithOAuth(provider: 'github' | 'google') {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: window.location.href,
    },
  });

  if (error) {
    console.error('OAuth 登录失败:', error);
    throw error;
  }

  return data;
}

/**
 * 登出
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('登出失败:', error);
    throw error;
  }
}

/**
 * 监听认证状态变化
 */
export function onAuthStateChange(callback: (user: any) => void) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null);
  });
}

// 管理员邮箱列表（从环境变量获取）
const ADMIN_EMAILS = import.meta.env.PUBLIC_ADMIN_EMAILS 
  ? import.meta.env.PUBLIC_ADMIN_EMAILS.split(',').map((email: string) => email.trim())
  : [];

/**
 * 检查用户是否是管理员
 */
export function isAdmin(user: any): boolean {
  if (!user?.email) return false;
  return ADMIN_EMAILS.includes(user.email);
}

/**
 * 检查是否可以删除评论
 * @param comment 评论对象
 * @param user 当前用户（OAuth 登录的）
 * @param localCommentIds localStorage 中记录的可删除评论 ID 列表
 */
export function canDeleteComment(
  comment: Comment,
  user: any,
  localCommentIds: Record<string, number>
): { canDelete: boolean; reason: 'admin' | 'owner' | 'anonymous_window' | null } {
  // 管理员可以删除任何评论
  if (user && isAdmin(user)) {
    return { canDelete: true, reason: 'admin' };
  }

  // OAuth 用户可以删除自己的评论
  if (user && comment.user_id === user.id) {
    return { canDelete: true, reason: 'owner' };
  }

  // 匿名评论：5分钟内可删除
  const createdTime = localCommentIds[comment.id];
  if (createdTime) {
    const fiveMinutes = 5 * 60 * 1000;
    if (Date.now() - createdTime < fiveMinutes) {
      return { canDelete: true, reason: 'anonymous_window' };
    }
  }

  return { canDelete: false, reason: null };
}

/**
 * 删除匿名评论（通过数据库函数，验证时间窗口）
 */
export async function deleteAnonymousComment(commentId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('delete_anonymous_comment', {
    comment_id: commentId,
    created_within_minutes: 5,
  });

  if (error) {
    console.error('删除匿名评论失败:', error);
    throw error;
  }

  return data === true;
}
