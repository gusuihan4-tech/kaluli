# 食物卡路里记录 PWA（React + Cloudflare）

现代化的手机网页应用，使用 React + Vite 前端 + Cloudflare Workers 后端，集成 DeepSeek API 进行食物图像识别与卡路里估算。

## 架构

- **前端**：React 18 + Vite（本地开发）
- **后端**：Cloudflare Workers（无服务器 API）
- **图像识别**：DeepSeek API
- **存储**：localStorage（离线支持）+ 可选后端持久化
- **部署**：Cloudflare Pages（前端）+ Cloudflare Workers（后端）

## 快速开始

### 本地开发

1. 安装依赖：

```bash
cd /Users/chiye/kaluli
npm install
```

2. 配置 DeepSeek API key：
   - 编辑 `wrangler.toml`，在 `[env.development]` 中设置 `DEEPSEEK_API_KEY`：
   ```toml
   [env.development]
   vars = { DEEPSEEK_API_KEY = "sk-...", MOCK = "false" }
   ```
   - 或在开发时使用 `MOCK = "true"` 进行本地测试。

3. 启动开发服务器（两个终端）：

```bash
# 终端 1：启动 Cloudflare Workers（API 服务）
npm run workers

# 终端 2：启动 Vite 开发服务器（http://localhost:5173）
npm run dev
```

4. 打开浏览器访问 `http://localhost:5173`，允许相机权限，开始测试。

### 构建与部署

1. 构建前端：

```bash
npm run build
```

2. 部署到 Cloudflare Pages + Workers：

```bash
# 需要先登录 Cloudflare
npm run workers:deploy
```

详见 [Cloudflare Pages 部署指南](https://developers.cloudflare.com/pages/)。

### CI / GitHub Actions: 自动注入 Secrets 并部署

本仓库包含示例 workflow：`.github/workflows/deploy.yml`，用于在 push 到 `main` 时自动构建并部署。该 workflow 会：

- 从 GitHub Secrets 读取 `DEEPSEEK_API_KEY`，并通过 `wrangler secret put` 注入到 Workers 环境；
- 使用 `npm run deploy` 触发 Cloudflare Pages（前端）和 Workers（后端）部署。

请在 GitHub 仓库的 `Settings → Secrets` 中添加以下 Secrets：

- `DEEPSEEK_API_KEY`：DeepSeek 或其他视觉服务的 API Key
- `CF_API_TOKEN`：Cloudflare API Token（需包含 Pages 与 Workers 部署权限）

本地调试与手动部署示例：

```bash
# 在本地交互式设置 secret（开发或生产环境）
wrangler secret put DEEPSEEK_API_KEY --env production

# 手动触发部署
npm run deploy
```

安全建议：

- 不要将 API key 写入 `wrangler.toml` 或源码；如已误提交，请在服务方侧轮换密钥并清理 Git 历史。
- 为 CI 用的 `CF_API_TOKEN` 限制权限至最小必要范围。

### 本地 deploy 脚本

本仓库包含一个本地脚本用于在本地注入 secret 并执行部署：`scripts/deploy.sh`。

用法：

```bash
# 先赋予可执行权限（只需执行一次）
chmod +x scripts/deploy.sh

# 交互式注入生产环境 key 并部署
bash scripts/deploy.sh

# 注入开发环境 key 并部署
bash scripts/deploy.sh dev

# 也可以提前通过环境变量提供密钥，避免交互：
export DEEPSEEK_API_KEY="sk-..."
bash scripts/deploy.sh
```

脚本会使用 `npx wrangler secret put` 将密钥注入到指定 env，然后执行 `npm run deploy`。



## 功能

✅ 拍照或上传食物图片  
✅ 通过 DeepSeek 进行图像识别  
✅ 预估卡路里并保存记录  
✅ 历史记录查看与删除  
✅ 每日卡路里统计  
✅ PWA 支持（离线可用、可添加到主屏幕）  
✅ 移动端友好 UI  

## 环境变量

编辑 `wrangler.toml` 配置：

```toml
[env.development]
vars = { 
  DEEPSEEK_API_KEY = "your_key_here",
  MOCK = "false"  # 设置为 "true" 使用本地 mock 响应
}

[env.production]
vars = { 
  DEEPSEEK_API_KEY = "your_key_here",
  MOCK = "false"
}
```

## 项目结构

```
/Users/chiye/kaluli/
├── index.html              # HTML 入口
├── package.json            # 项目依赖
├── wrangler.toml           # Cloudflare Workers 配置
├── vite.config.js          # Vite 配置
├── src/
│   ├── main.jsx            # React 入口点
│   ├── App.jsx             # 主应用组件
│   ├── App.css             # 样式
│   └── worker.js           # Cloudflare Workers API 路由
├── public/
│   ├── manifest.json       # PWA 清单
│   └── sw.js               # Service Worker
└── README.md               # 本文件
```

## API 端点

### `/api/analyze` (POST)

分析食物图片并返回卡路里信息。

**请求**：
```json
{
  "image": "data:image/jpeg;base64,...或纯base64字符串"
}
```

**响应**（成功）：
```json
{
  "success": true,
  "predictions": [
    { "name": "Apple", "calories": 95, "confidence": 0.98, "portion_g": 150 }
  ]
}
```

**响应**（失败）：
```json
{
  "success": false,
  "error": "错误信息"
}
```

支持 mock 模式：访问 `/api/analyze?mock=true` 获取固定的测试响应。

## DeepSeek API 集成

当前 `src/worker.js` 中的 DeepSeek 调用使用占位端点 `https://api.deepseek.example/v1/analyze`。  
请根据 [DeepSeek 官方文档](https://deepseek.example) 调整：

1. 更新 endpoint URL
2. 调整请求体格式（如果需要）
3. 解析响应中的 food prediction 字段

## 错误监控与性能跟踪（Sentry）

本应用集成了 Sentry，用于捕获前端错误、性能问题和 Service Worker 故障。

### 配置

在 `.env` 或 `.env.local` 中添加 Sentry DSN：

```bash
VITE_SENTRY_DSN="https://your-sentry-dsn@sentry.io/your-project-id"
```

获取 DSN：登录 https://sentry.io → 创建新项目（选 React）→ 复制 DSN。

### 功能

- **错误捕获**：React 组件崩溃、JavaScript 异常、Service Worker 错误
- **性能监控**：页面加载、API 响应时间（sample rate 10%）
- **会话重放**：错误时自动录制用户操作（privacy-safe）
- **离线队列**：分析失败时上报到 Sentry

### 本地开发

若未设置 `VITE_SENTRY_DSN`，Sentry 会以非操作模式初始化（不上报，仅打印日志）。

## 云端同步（Supabase）

本应用支持可选的云端数据同步（Supabase），允许用户在多设备间同步食物记录。**采用离线优先设计**，即使无网络仍可正常使用。

### 启用云同步

1. 创建 Supabase 项目（见 [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md)）
2. 在 `.env.local` 中配置：
   ```bash
   VITE_SUPABASE_URL="https://your-project.supabase.co"
   VITE_SUPABASE_ANON_KEY="your-anon-key"
   ```
3. 应用启动时会自动初始化同步

### 关于中国使用

⚠️ Supabase 服务器可能在中国访问不稳定。应用的离线优先设计确保：
- 数据始终保存到本地 `localStorage`
- 有网络时后台无阻塞同步
- 无网络时完全可用

详见 [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md) 的完整配置与故障排查。

## 隐私与安全

- 图片在浏览器端转换为 base64 后才上传至 Cloudflare Workers
- 历史记录存储在本地 localStorage（不上传到服务器）
- 建议在生产环境中实现用户认证与加密存储
- Sentry 会话重放仅在错误时启用，且会自动掩盖文本与媒体内容
- Supabase 数据采用行级安全（RLS），每个用户只能访问自己的数据

## 后续改进

- 添加用户认证与云端同步
- 提供营养细节分析（蛋白质、脂肪、碳水化合物）
- 定时提醒与目标管理
- 多语言支持
