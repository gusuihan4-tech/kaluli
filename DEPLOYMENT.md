# 部署指南

## 前置条件

- Cloudflare 账户（[注册地址](https://dash.cloudflare.com/sign-up)）
- 已安装 `wrangler` CLI（已包含在 `package.json` 依赖中）
- 已验证 GitHub 账户（如果使用 GitHub Actions 自动部署）

## 步骤 1：部署前端到 Cloudflare Pages（手动）

### 1.1 生成生产构建

```bash
npm run build
```

这会在 `dist/` 目录生成优化后的静态文件。

### 1.2 登录 Cloudflare

```bash
npx wrangler login
```

这会打开浏览器进行授权。

### 1.3 部署到 Cloudflare Pages

```bash
npx wrangler pages deploy dist
```

Wrangler 会提示你选择或创建一个项目名称（建议使用 `food-calorie-pwa`）。

部署完成后，你会收到一个类似 `https://food-calorie-pwa.pages.dev` 的 URL。

## 步骤 2：部署 Workers 后端

### 2.1 配置生产环境变量

编辑 `wrangler.toml` 的 `[env.production]` 部分，确保设置正确的值：

```toml
[env.production]
name = "food-calorie-pwa"
vars = { 
  DEEPSEEK_API_KEY = "sk-your-actual-key-here",
  MOCK = "false"  # 生产环境关闭 mock
}
```

### 2.2 部署 Workers

```bash
npm run workers:deploy -- --env production
```

这会将后端 API 部署到 Cloudflare Workers。你可以在 Cloudflare Dashboard 中查看 Workers 日志。

## 步骤 3：连接前后端

部署完成后，需要更新前端指向正确的 Workers 端点。

### 3.1 获取 Workers 域名

登录 [Cloudflare Dashboard](https://dash.cloudflare.com)，进入 Workers & Pages > Workers，找到你的 Worker 的域名（通常为 `food-calorie-pwa.<your-subdomain>.workers.dev`）。

### 3.2 更新前端代理配置

编辑 `vite.config.js`，修改生产环境的 API 代理：

```javascript
const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://food-calorie-pwa.<your-subdomain>.workers.dev'
  : 'http://localhost:8787';

export default defineConfig({
  // ...
  server: {
    proxy: {
      '/api': {
        target: API_URL,
        changeOrigin: true,
      },
    },
  },
});
```

或在 `src/App.jsx` 中硬编码 Workers URL（简单方式）：

```javascript
const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://food-calorie-pwa.<your-subdomain>.workers.dev'
  : 'http://localhost:5173';

const resp = await fetch(`${API_URL}/api/analyze`, {
  // ...
});
```

### 3.3 重新构建并部署

```bash
npm run build
npx wrangler pages deploy dist
```

## 步骤 4：使用 GitHub Actions 自动部署（可选）

### 4.1 配置 GitHub Secrets

在 GitHub 仓库的 Settings > Secrets and variables > Actions 中添加以下密钥：

- `CLOUDFLARE_API_TOKEN`：从 [Cloudflare API 令牌页面](https://dash.cloudflare.com/profile/api-tokens) 创建
  - 权限：`Account.Workers KV Storage`, `Account.Cloudflare Pages`
- `CLOUDFLARE_ACCOUNT_ID`：你的 Cloudflare 账户 ID（可从 Dashboard URL 获取）
- `DEEPSEEK_API_KEY`：你的 DeepSeek API key

### 4.2 推送到 main 分支

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

GitHub Actions 会自动构建并部署到 Cloudflare Pages 与 Workers。

## 步骤 5：验证部署

1. 访问你的 Cloudflare Pages URL（例如 `https://food-calorie-pwa.pages.dev`）
2. 允许相机权限
3. 上传一张食物图片
4. 点击"🔍 分析"
5. 应该看到来自 DeepSeek API 的真实分析结果（如果 `MOCK = "false"`）或 mock 结果（如果 `MOCK = "true"`）

## 故障排除

### 问题：部署后 API 返回 500 错误

**检查清单**：
1. 确认 `DEEPSEEK_API_KEY` 已正确设置在生产环境
2. 在 Cloudflare Dashboard 的 Workers 日志中查看错误信息
3. 检查 DeepSeek endpoint 是否仍然正确

### 问题：页面无法加载

1. 检查 Cloudflare Pages 构建日志（Dashboard > Pages > 你的项目 > Deployments）
2. 确认 `npm run build` 在本地成功运行
3. 检查 `dist/` 目录中是否生成了 `index.html`

### 问题：PWA 安装不工作

1. 确认 `public/manifest.json` 已正确部署
2. 确认 `public/sw.js` 已正确部署
3. 使用浏览器开发者工具的 Application 标签检查 Service Worker 状态

## 环境变量管理

对于敏感信息（如 API key），建议：

1. **本地开发**：使用 `.env.local`（已在 `.gitignore` 中）
2. **生产环境**：通过 Cloudflare Dashboard 的 Environment Variables 设置
3. **CI/CD**：使用 GitHub Secrets

## 后续可选改进

- [ ] 添加 Cloudflare Workers KV 存储用于记录持久化
- [ ] 实现用户认证与多设备同步
- [ ] 使用 Cloudflare R2 存储食物图片
- [ ] 添加分析与监控（Sentry、LogRocket）
- [ ] 性能优化（图片压缩、CDN 缓存策略）

---

有任何部署问题，请查阅 [Cloudflare Pages 官方文档](https://developers.cloudflare.com/pages/) 或 [Wrangler 文档](https://developers.cloudflare.com/workers/cli-wrangler/)。
