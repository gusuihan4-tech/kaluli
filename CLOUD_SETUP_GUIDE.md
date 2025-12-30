# 云端部署与同步完整指南

本指南将帮助您配置项目在云端运行，并启用数据云端同步功能。

## 📋 目录

1. [前置准备](#前置准备)
2. [配置 Cloudflare（必需）](#配置-cloudflare必需)
3. [配置 Supabase 云同步（可选）](#配置-supabase-云同步可选)
4. [配置 GitHub Secrets](#配置-github-secrets)
5. [部署项目](#部署项目)
6. [验证部署](#验证部署)
7. [故障排除](#故障排除)

---

## 前置准备

### 需要的账号

1. **Cloudflare 账号**（免费）
   - 用于托管前端（Pages）和后端 API（Workers）
   - 注册地址：https://dash.cloudflare.com/sign-up

2. **DeepSeek API Key**（或其他视觉 AI 服务）
   - 用于食物图像识别
   - 开发时可使用 MOCK 模式跳过

3. **Supabase 账号**（可选，免费）
   - 用于多设备数据云端同步
   - 注册地址：https://supabase.com

4. **Sentry 账号**（可选，免费）
   - 用于错误监控
   - 注册地址：https://sentry.io

---

## 配置 Cloudflare（必需）

### 步骤 1：创建 Cloudflare API Token

1. 登录 Cloudflare Dashboard：https://dash.cloudflare.com
2. 点击右上角头像 → "My Profile" → "API Tokens"
3. 点击 "Create Token"
4. 选择 "Edit Cloudflare Workers" 模板或自定义权限：
   - **Account** → **Cloudflare Pages** → **Edit**
   - **Account** → **Workers Scripts** → **Edit**
   - **Account** → **Workers KV Storage** → **Edit**（可选）
5. 设置 Token 有效期和 IP 限制（可选）
6. 创建并**复制保存** Token（只显示一次）

### 步骤 2：获取 Account ID

1. 在 Cloudflare Dashboard 首页
2. 选择任意域名或 Workers & Pages
3. 右侧边栏可以看到 "Account ID"
4. 复制保存

### 步骤 3：获取 DeepSeek API Key（或使用 MOCK 模式）

#### 选项 A：使用真实 API（生产环境）
1. 访问 DeepSeek 官网获取 API key
2. 保存密钥（格式通常为 `sk-...`）

#### 选项 B：使用 MOCK 模式（测试/演示）
- 无需API key，系统会返回模拟数据
- 在 `wrangler.toml` 中 `MOCK = "true"` 即可

---

## 配置 Supabase 云同步（可选）

如果您需要多设备数据同步功能，请按以下步骤配置：

### 步骤 1：创建 Supabase 项目

1. 访问 https://supabase.com 并注册/登录
2. 点击 "New Project"
3. 填写项目信息：
   - **Name**: kaluli-sync（或自定义）
   - **Database Password**: 设置强密码并保存
   - **Region**: 选择离您最近的区域（如 Singapore 或 Japan）
4. 等待项目创建完成（约 2 分钟）

### 步骤 2：获取 API 凭证

1. 在项目 Dashboard，点击左侧 "Settings" → "API"
2. 复制保存以下信息：
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbG...`（很长的字符串）

### 步骤 3：创建数据库表

1. 点击左侧 "SQL Editor"
2. 点击 "New query"
3. 粘贴并执行以下 SQL：

```sql
-- 创建 food_logs 表
CREATE TABLE food_logs (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  data JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引加速查询
CREATE INDEX idx_food_logs_username ON food_logs(username);
CREATE INDEX idx_food_logs_updated ON food_logs(updated_at DESC);

-- 启用行级安全（RLS）
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能读写自己的数据
CREATE POLICY "Users can read own data" 
  ON food_logs FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own data" 
  ON food_logs FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own data" 
  ON food_logs FOR UPDATE
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own data" 
  ON food_logs FOR DELETE
  USING (auth.uid()::text = user_id::text);
```

4. 点击 "Run" 执行

### 步骤 4：启用 Email 认证

1. 点击左侧 "Authentication" → "Providers"
2. 确保 "Email" 已启用（默认启用）
3. （可选）配置 Email 模板：
   - "Authentication" → "Email Templates"
   - 自定义注册确认邮件等

---

## 配置 GitHub Secrets

### 步骤 1：进入 GitHub 仓库设置

1. 打开您的 GitHub 仓库
2. 点击 "Settings" 标签
3. 左侧菜单选择 "Secrets and variables" → "Actions"

### 步骤 2：添加必需的 Secrets

点击 "New repository secret"，逐个添加以下内容：

#### 必需的 Secrets

1. **CF_API_TOKEN**
   - **Value**: 之前创建的 Cloudflare API Token
   - 用于 GitHub Actions 部署到 Cloudflare

2. **DEEPSEEK_API_KEY**
   - **Value**: DeepSeek API 密钥（如 `sk-...`）
   - 如果使用 MOCK 模式，可以填写任意值（如 `mock`）

#### 可选的 Secrets（根据需要添加）

3. **VITE_SUPABASE_URL**（启用云同步时必需）
   - **Value**: Supabase 项目 URL（如 `https://xxxxx.supabase.co`）

4. **VITE_SUPABASE_ANON_KEY**（启用云同步时必需）
   - **Value**: Supabase anon public key

5. **VITE_SENTRY_DSN**（启用错误监控时必需）
   - **Value**: Sentry 项目 DSN
   - 获取方式：登录 Sentry → 创建项目 → Project Settings → Client Keys (DSN)

6. **CLOUDFLARE_ACCOUNT_ID**
   - **Value**: Cloudflare Account ID
   - 可选，某些部署方式需要

### 步骤 3：验证 Secrets

在 "Actions secrets" 页面，您应该看到已添加的所有 secrets（内容已加密不可见）

---

## 部署项目

### 方式 1：通过 GitHub Actions 自动部署（推荐）

1. **推送代码到 main 分支**

```bash
git checkout main
git pull origin main
git push origin main
```

2. **查看部署进度**
   - 在 GitHub 仓库页面，点击 "Actions" 标签
   - 查看最新的 workflow 运行
   - 等待所有步骤完成（约 2-3 分钟）

3. **获取部署 URL**
   - 部署成功后，在 Actions 日志中会显示 Cloudflare Pages URL
   - 或访问 Cloudflare Dashboard → Pages 查看

### 方式 2：本地手动部署

如果您想本地控制部署过程：

```bash
# 1. 安装依赖
npm install

# 2. 登录 Cloudflare
npx wrangler login

# 3. 设置 Workers secret
echo "your-deepseek-api-key" | npx wrangler secret put DEEPSEEK_API_KEY --env production

# 4. 构建前端
npm run build

# 5. 部署 Pages
npx wrangler pages deploy dist --project-name=kaluli

# 6. 部署 Workers
npx wrangler deploy --env production
```

---

## 验证部署

### 1. 访问应用

打开浏览器，访问您的 Cloudflare Pages URL（格式：`https://kaluli.pages.dev` 或您的自定义域名）

### 2. 测试基本功能

1. **本地用户登录**
   - 输入用户名（如 "测试用户"）
   - 点击"登录"按钮

2. **上传/拍照测试**
   - 点击"选择或拍照"
   - 选择一张食物图片
   - 点击"🔍 分析"
   - 等待结果返回

3. **保存记录**
   - 选择餐次类型（早餐/午餐/晚餐等）
   - 点击"✅ 保存"
   - 检查历史记录是否显示

### 3. 测试云同步（如果已配置）

1. **注册云账号**
   - 点击"☁️ 启用云同步"
   - 输入邮箱和密码
   - 点击"注册"
   - 查收邮件并确认

2. **登录云账号**
   - 使用注册的邮箱密码登录
   - 观察右上角是否显示"☁️ 已连接"

3. **多设备测试**
   - 在另一设备或浏览器上登录相同云账号
   - 确认数据能够同步

### 4. 测试 PWA 安装（移动端）

1. 在移动浏览器（Chrome/Safari）访问应用
2. 查看是否弹出"安装为 App"提示
3. 点击安装，添加到主屏幕
4. 从主屏幕启动，测试离线功能

---

## 故障排除

### 问题 1：GitHub Actions 部署失败

**症状**: Actions 标签显示红色 ❌

**解决方案**:
1. 点击失败的 workflow，查看详细错误
2. 常见问题：
   - **Missing secrets**: 检查所有必需的 Secrets 是否已正确添加
   - **Wrangler authentication failed**: CF_API_TOKEN 权限不足或已过期
   - **Build failed**: 检查代码是否有语法错误

### 问题 2：部署成功但 API 返回 500 错误

**症状**: 应用能打开，但分析功能失败

**解决方案**:
1. 检查 Cloudflare Workers 日志：
   - Cloudflare Dashboard → Workers & Pages → 您的 Worker
   - 点击 "Logs" 查看错误信息
2. 确认 DEEPSEEK_API_KEY 已正确设置：
   ```bash
   npx wrangler secret list --env production
   ```
3. 或临时启用 MOCK 模式测试：
   - 编辑 `wrangler.toml`
   - `[env.production]` 下设置 `MOCK = "true"`

### 问题 3：Supabase 云同步不工作

**症状**: 无法注册或登录云账号，或数据不同步

**解决方案**:
1. 检查 Supabase 配置：
   - 确认 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY` 正确
   - 重新部署前端（这些是编译时环境变量）
2. 检查 RLS 策略：
   - Supabase Dashboard → Authentication → Policies
   - 确认策略已启用且正确
3. 查看浏览器控制台是否有错误信息

### 问题 4：中国地区访问 Supabase 不稳定

**症状**: 云同步偶尔失败或很慢

**说明**: 
- Supabase 服务器在海外，中国访问可能不稳定
- 应用采用**离线优先**设计，不影响核心功能

**建议**:
1. 数据始终优先保存在本地
2. 有网络时会自动后台同步
3. 可以考虑使用代理或 VPN 改善连接
4. 或暂时禁用云同步功能（仅使用本地存储）

### 问题 5：PWA 无法安装

**症状**: 没有"添加到主屏幕"提示

**解决方案**:
1. 确认使用 HTTPS 访问（Cloudflare Pages 默认支持）
2. 检查 `public/manifest.json` 和 `public/sw.js` 是否正确部署
3. 使用浏览器开发者工具：
   - Chrome: Application → Manifest / Service Workers
   - 查看是否有错误

---

## 后续优化建议

### 1. 自定义域名

1. 在 Cloudflare Pages 设置中添加自定义域名
2. 配置 DNS 记录
3. 自动获得 SSL 证书

### 2. 监控与告警

1. 配置 Sentry 用于错误追踪
2. 设置 Cloudflare Analytics 监控流量
3. 配置 Uptime Robot 监控网站可用性

### 3. 性能优化

1. 启用 Cloudflare CDN 缓存
2. 压缩图片（使用 Cloudflare Images）
3. 启用 HTTP/3 和 Brotli 压缩

### 4. 数据备份

1. 定期导出 Supabase 数据
2. 设置自动备份计划
3. 提供用户数据导出功能

---

## 快速参考

### 重要链接

- **Cloudflare Dashboard**: https://dash.cloudflare.com
- **Supabase Dashboard**: https://supabase.com/dashboard
- **GitHub Actions**: https://github.com/{your-username}/kaluli/actions
- **Sentry Dashboard**: https://sentry.io

### 常用命令

```bash
# 本地开发
npm run dev          # 启动前端 (port 5173)
npm run workers      # 启动后端 API (port 8787)

# 构建与部署
npm run build        # 构建生产版本
npm run deploy       # 部署到 Cloudflare

# Wrangler 命令
npx wrangler login                                    # 登录 Cloudflare
npx wrangler secret put DEEPSEEK_API_KEY --env production  # 设置 secret
npx wrangler deploy --env production                  # 部署 Workers
npx wrangler pages deploy dist                        # 部署 Pages
```

### 环境变量清单

| 变量名 | 类型 | 用途 | 必需 |
|--------|------|------|------|
| `CF_API_TOKEN` | Secret | Cloudflare 部署 | ✅ 是 |
| `DEEPSEEK_API_KEY` | Secret | 图像识别 API | ✅ 是* |
| `VITE_SUPABASE_URL` | Secret | Supabase 连接 | ⭕ 可选 |
| `VITE_SUPABASE_ANON_KEY` | Secret | Supabase 认证 | ⭕ 可选 |
| `VITE_SENTRY_DSN` | Secret | 错误监控 | ⭕ 可选 |
| `CLOUDFLARE_ACCOUNT_ID` | Secret | Cloudflare 账户 | ⭕ 可选 |

*注：可使用 MOCK 模式代替

---

## 获取帮助

如果遇到无法解决的问题：

1. 查看项目文档：
   - [README.md](./README.md) - 项目介绍
   - [DEPLOYMENT.md](./DEPLOYMENT.md) - 详细部署指南
   - [docs/SUPABASE_SETUP.md](./docs/SUPABASE_SETUP.md) - Supabase 详细配置

2. 检查 CI/CD 日志：
   - GitHub Actions 标签页
   - Cloudflare Workers 日志
   - 浏览器开发者控制台

3. 提交 Issue：
   - 包含详细的错误信息
   - 附上相关日志和配置（注意脱敏）
   - 说明您的环境（浏览器、操作系统等）

祝您部署顺利！🎉
