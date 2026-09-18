-- Supabase 评论系统数据库表结构
-- 在 Supabase Dashboard 的 SQL Editor 中执行此脚本

-- 创建 comments 表
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  translation_key TEXT NOT NULL,  -- 文章的 translationKey，用于中英文共享评论
  author_name TEXT NOT NULL,
  author_email TEXT NOT NULL,
  author_website TEXT,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,  -- 父评论 ID，用于嵌套回复
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'spam')),
  user_agent TEXT,
  ip_address INET
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_comments_translation_key ON comments(translation_key);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- 创建复合索引用于常见查询
CREATE INDEX IF NOT EXISTS idx_comments_key_status ON comments(translation_key, status);

-- 启用 Row Level Security (RLS)
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略：所有人可以查看已批准的评论
CREATE POLICY "Anyone can view approved comments"
  ON comments
  FOR SELECT
  USING (status = 'approved');

-- 创建 RLS 策略：所有人可以插入评论（匿名评论）
CREATE POLICY "Anyone can insert comments"
  ON comments
  FOR INSERT
  WITH CHECK (true);

-- 可选：如果你想要管理员才能删除评论，可以添加以下策略
-- 首先需要设置管理员角色，这里简化为允许所有人删除自己的评论
-- CREATE POLICY "Users can delete own comments"
--   ON comments
--   FOR DELETE
--   USING (author_email = current_setting('request.jwt.claims', true)::json->>'email');

-- 创建自动更新 updated_at 的触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 插入示例数据（可选）
-- INSERT INTO comments (translation_key, author_name, author_email, content, status)
-- VALUES
--   ('test', '张三', 'zhangsan@example.com', '这是一条测试评论', 'approved'),
--   ('test', '李四', 'lisi@example.com', '很不错的文章！', 'approved');

-- 查询示例
-- SELECT * FROM comments WHERE translation_key = 'test' AND status = 'approved' ORDER BY created_at ASC;
