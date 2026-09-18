-- 更新 comments 表结构，支持 OAuth 登录和删除功能
-- 在 Supabase SQL Editor 中运行此脚本

-- 1. 添加新字段
ALTER TABLE comments
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS author_avatar TEXT;

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

-- 3. 更新 RLS 策略

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "Allow public read approved comments" ON comments;
DROP POLICY IF EXISTS "Allow public insert comments" ON comments;
DROP POLICY IF EXISTS "Allow delete own comments" ON comments;
DROP POLICY IF EXISTS "Allow admin delete any comments" ON comments;

-- 启用 RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 策略1: 任何人都可以读取已批准的评论
CREATE POLICY "Allow public read approved comments" ON comments
  FOR SELECT
  USING (status = 'approved');

-- 策略2: 任何人都可以插入评论（匿名或登录用户）
CREATE POLICY "Allow public insert comments" ON comments
  FOR INSERT
  WITH CHECK (true);

-- 策略3: 登录用户可以删除自己的评论（user_id 匹配）
CREATE POLICY "Allow delete own comments" ON comments
  FOR DELETE
  USING (auth.uid() = user_id);

-- 策略4: 管理员可以删除任何评论
-- 注意：需要在 Supabase 中创建一个管理员检查函数
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- 检查当前用户邮箱是否在管理员列表中
  RETURN (
    SELECT email IN ('author@example.com')
    FROM auth.users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Allow admin delete any comments" ON comments
  FOR DELETE
  USING (is_admin());

-- 策略5: 匿名评论的删除由前端通过 service role 或特殊端点处理
-- 这里我们创建一个函数来处理匿名评论删除
CREATE OR REPLACE FUNCTION delete_anonymous_comment(comment_id UUID, created_within_minutes INTEGER DEFAULT 5)
RETURNS BOOLEAN AS $$
DECLARE
  comment_record RECORD;
BEGIN
  -- 查找评论
  SELECT * INTO comment_record FROM comments WHERE id = comment_id;

  -- 检查评论是否存在且是匿名评论
  IF comment_record IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 检查是否是匿名评论（无 user_id）
  IF comment_record.user_id IS NOT NULL THEN
    RETURN FALSE;
  END IF;

  -- 检查是否在时间窗口内
  IF comment_record.created_at < NOW() - (created_within_minutes || ' minutes')::INTERVAL THEN
    RETURN FALSE;
  END IF;

  -- 删除评论
  DELETE FROM comments WHERE id = comment_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 授予匿名用户调用该函数的权限
GRANT EXECUTE ON FUNCTION delete_anonymous_comment TO anon;
GRANT EXECUTE ON FUNCTION delete_anonymous_comment TO authenticated;

-- 完成提示
SELECT 'Comments table updated successfully!' AS message;
