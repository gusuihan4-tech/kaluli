# 如何运行此项目

本文档提供了运行此食物卡路里记录 PWA 应用的详细步骤。

## ✅ 项目状态

**此项目现在可以正常运行！** 所有依赖已安装，代码已修复兼容性问题。

## 📋 前置要求

- **Node.js**: 版本 16.x 或更高
- **npm**: 通常随 Node.js 一起安装

## 🚀 快速开始

### 1. 安装依赖

如果这是你第一次运行项目，或者 `node_modules` 目录不存在，请先安装依赖：

```bash
npm install
```

### 2. 启动开发服务器

项目需要同时运行两个服务：**Cloudflare Workers**（后端 API）和 **Vite**（前端开发服务器）。

#### 方式一：使用两个终端窗口（推荐）

**终端 1 - 启动 Cloudflare Workers API（端口 8787）：**
```bash
npm run workers
```

**终端 2 - 启动 Vite 开发服务器（端口 5173）：**
```bash
npm run dev
```

#### 方式二：使用后台进程

如果你只想使用一个终端：

```bash
# 后台启动 Workers
npm run workers &

# 启动 Vite（前台）
npm run dev
```

### 3. 访问应用

在浏览器中打开：
```
http://localhost:5173
```

## 🧪 测试功能

1. **登录**: 在首页输入用户名（例如：小明）
2. **拍照/上传**: 点击"选择或拍照"按钮上传食物图片
3. **分析**: 点击"🔍 分析"按钮（开发模式下使用 mock 数据）
4. **保存**: 查看识别结果后，选择餐次类型并点击"✅ 保存"

## 📦 构建生产版本

构建用于部署的生产版本：

```bash
npm run build
```

构建产物将生成在 `dist/` 目录中。

## 🔧 配置说明

### 开发模式（Mock 模式）

默认情况下，开发环境使用 **Mock 模式**，不需要真实的 DeepSeek API key。这在 `wrangler.toml` 中配置：

```toml
[env.development]
name = "food-calorie-pwa-dev"
vars = { MOCK = "true" }
```

Mock 模式会返回固定的测试数据（苹果和橙汁）。

### 生产模式（真实 API）

要使用真实的 DeepSeek API，需要：

1. 获取 DeepSeek API key
2. 使用 wrangler 设置密钥：
   ```bash
   wrangler secret put DEEPSEEK_API_KEY --env production
   ```
3. 在 `wrangler.toml` 中设置 `MOCK = "false"`

详见项目根目录的 `README.md` 了解完整的部署说明。

## 🐛 常见问题

### 问题：npm install 失败

**解决方案**：
- 确保 Node.js 版本为 16.x 或更高：`node --version`
- 尝试清除缓存：`npm cache clean --force`
- 删除 `node_modules` 和 `package-lock.json`，重新运行 `npm install`

### 问题：端口已被占用

如果看到 `EADDRINUSE` 错误，说明端口已被占用。

**解决方案**：
- 检查并停止占用端口的进程
- 或修改 `vite.config.js` 和 `wrangler.toml` 中的端口配置

### 问题：Workers API 无法访问

确保：
1. Workers 服务正在运行（终端 1）
2. 访问 http://localhost:8787/api/analyze 应该返回 `{"error":"Not Found"}`（这是正常的，因为需要 POST 请求）

测试 API：
```bash
curl -X POST http://localhost:8787/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"image":"test"}'
```

应该返回 mock 数据。

## 📱 PWA 功能

此应用支持 PWA（Progressive Web App）功能：

- **离线可用**：Service Worker 缓存资源
- **添加到主屏幕**：在移动设备上可以安装为独立应用
- **本地存储**：数据保存在 localStorage，支持离线使用

## 🔒 隐私说明

- 数据默认存储在浏览器本地（localStorage）
- 图片仅在分析时上传到 API，不会永久保存
- 可选的 Supabase 云同步功能需要单独配置

## 📚 更多信息

- 完整的功能说明：查看 `README.md`
- 部署指南：查看 `DEPLOYMENT.md`
- Supabase 配置：查看 `docs/SUPABASE_SETUP.md`

## ✅ 验证清单

- [x] 依赖已安装（`node_modules` 存在）
- [x] Cloudflare Workers 可以启动
- [x] Vite 开发服务器可以启动
- [x] 前端页面可以访问（http://localhost:5173）
- [x] API 端点正常响应（http://localhost:8787）
- [x] 生产构建成功（`npm run build`）

---

**项目现已就绪！开始使用吧！🎉**
