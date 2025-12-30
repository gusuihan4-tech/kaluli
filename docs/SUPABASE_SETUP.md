## Supabase 云端同步配置

本应用支持可选的云端同步（Supabase），用于多设备数据同步。离线优先设计确保在无网络时应用仍可正常使用。

### 为什么是 Supabase？

- **免费层**：足以支持小规模使用（你和朋友们）
- **开源友好**：数据完全可控
- **简单认证**：内置邮箱/密码认证

### 中国使用提示

⚠️ **重要**：Supabase 的海外服务器在中国的访问可能不稳定。本应用采用 **离线优先** 设计：
- 数据优先保存到本地 `localStorage`
- 有网络时后台同步到云端（非阻塞式）
- 无网络时应用仍可正常使用

### 步骤 1：创建 Supabase 项目

1. 访问 https://supabase.com，注册账号
2. 创建新项目（选择靠近你的地区，如新加坡或日本）
3. 在 **Project Settings → API** 复制：
   - `Project URL` → 填入 `VITE_SUPABASE_URL`
   - `Anon Public Key` → 填入 `VITE_SUPABASE_ANON_KEY`

### 步骤 2：创建数据库表

在 Supabase 控制台，进入 **SQL Editor**，运行以下 SQL：

```sql
-- 创建 food_logs 表
CREATE TABLE food_logs (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  data JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_food_logs_username ON food_logs(username);

-- 启用行级安全（RLS）
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;

-- 允许任何已认证用户读写自己的数据
CREATE POLICY "Users can read own data" 
  ON food_logs FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own data" 
  ON food_logs FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own data" 
  ON food_logs FOR UPDATE
  USING (auth.uid()::text = user_id::text);
```

### 步骤 3：启用邮箱认证

1. 进入 **Authentication → Providers**
2. 确保 **Email** 认证已启用（默认启用）

### 步骤 4：配置应用

在 `.env.local` 中添加：

```bash
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"
```

### 步骤 5：启用云同步（应用内）

应用启动时，如果 Supabase 配置存在，用户可以选择创建账号并启用云同步。如果未配置，应用会降级为本地模式。

### 验证配置

运行应用后：
1. 输入用户名登录
2. 如果右上角显示"云同步：已启用"，说明配置成功
3. 如果显示"云同步：已禁用"，检查环境变量

### 故障排查

- **"无法连接到云端"**：可能是网络问题（中国用户常见）。切换到其他网络或使用 VPN 测试
- **"同步失败"**：检查 Supabase 是否正常运行（访问 supabase.com 检查状态页）
- **数据未同步**：应用采用后台同步，检查浏览器控制台是否有错误信息

### 本地开发（不需要 Supabase）

如果你不需要云同步功能，可以跳过这些步骤。应用完全可以离线使用。
