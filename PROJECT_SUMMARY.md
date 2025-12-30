# 项目完成总结：Kaluli 食物卡路里记录应用

## 项目概览

**Kaluli** 是一个现代化的 PWA 应用，用于拍照识别食物并记录卡路里。适合小规模团队（你和朋友们）使用，完全离线可用，支持可选的云端多设备同步。

**GitHub**: https://github.com/gusuihan4-tech/kaluli

---

## 已实现的功能

### 🎯 核心功能
- ✅ **食物识别**：拍照或上传图片，通过 AI（DeepSeek）识别食物和卡路里
- ✅ **记录管理**：按早午晚夜宵分类，保存食物识别结果
- ✅ **统计展示**：今日卡路里、餐次数、总记录数实时更新
- ✅ **历史查询**：查看所有记录，支持删除

### 📱 PWA & 离线体验
- ✅ **离线优先**：所有数据存储在本地 `localStorage`，无网络仍可使用
- ✅ **离线分析队列**：无网络时拍照分析请求自动入队，恢复连接后重试
- ✅ **Service Worker 缓存**：多层缓存策略（静态资源、API、页面）
- ✅ **PWA 安装**：可添加到主屏幕，离线运行
- ✅ **增强缓存**：precache + runtime cache，网络恢复时自动重试

### 👥 多用户支持
- ✅ **用户隔离**：输入用户名登录，每个用户数据完全独立存储
- ✅ **本地数据分离**：各用户的记录存储在不同的 `localStorage` key
- ✅ **无认证需求**：简单易用，朋友可直接使用

### ☁️ 云端同步（可选）
- ✅ **Supabase 集成**：可选的多设备云同步
- ✅ **离线优先设计**：数据先保本地，网络可用时后台无阻塞同步
- ✅ **邮箱认证**：用户可创建账号并启用云同步
- ✅ **同步状态指示**：显示"同步中..."、"已同步"、"同步失败"等状态
- ✅ **网络恢复自动重试**：离线后重新上线时自动尝试同步

### 🔒 安全与隐私
- ✅ **密钥管理**：所有敏感信息（API key、token）从源码和配置中移除
- ✅ **环境变量**：支持通过 `.env` 安全注入
- ✅ **GitHub Actions**：CI 中安全注入 secrets，不在日志中暴露
- ✅ **本地优先**：数据默认不上传，云同步可选

### 🚀 部署与 DevOps
- ✅ **GitHub Actions CI**：自动构建、注入 secrets、部署
- ✅ **本地部署脚本**：`scripts/deploy.sh` 简化本地部署流程
- ✅ **Cloudflare Pages + Workers**：前端部署在 Pages，API 部署在 Workers
- ✅ **环境隔离**：开发与生产环境分离

### 📊 监控与质量
- ✅ **Sentry 错误监控**：捕获前端异常、组件崩溃、Service Worker 错误
- ✅ **性能追踪**：页面加载、API 响应时间监控（10% 采样率）
- ✅ **会话重放**：错误时自动录制用户操作（privacy-safe）

### 📚 文档
- ✅ **README**：快速开始、功能说明、部署指南
- ✅ **docs/SECRETS.md**：API key 安全存储与注入方法
- ✅ **docs/SUPABASE_SETUP.md**：Supabase 配置完整指南（含中国使用提示）
- ✅ **.env.example**：环境变量模板

---

## 技术栈

| 层 | 技术 | 说明 |
|---|------|------|
| **前端** | React 18 + Vite | 快速开发与构建 |
| **PWA** | Service Worker | 离线优先、缓存策略 |
| **后端 API** | Cloudflare Workers | 无服务器函数，处理图像识别请求 |
| **静态托管** | Cloudflare Pages | 前端页面部署 |
| **AI 识别** | DeepSeek API | 食物图像识别与卡路里估算 |
| **云数据库** | Supabase（可选） | PostgreSQL + 实时认证 |
| **错误监控** | Sentry | 前端错误与性能追踪 |
| **CI/CD** | GitHub Actions | 自动构建、注入、部署 |

---

## 项目结构

```
/Users/chiye/kaluli/
├── .github/
│   └── workflows/
│       └── deploy.yml              # CI/CD 工作流
├── docs/
│   ├── SECRETS.md                  # API key 安全管理指南
│   └── SUPABASE_SETUP.md           # Supabase 配置指南
├── scripts/
│   └── deploy.sh                   # 本地部署辅助脚本
├── public/
│   ├── manifest.json               # PWA 清单
│   └── sw.js                       # Service Worker（缓存策略）
├── src/
│   ├── App.jsx                     # 主应用组件（含多用户、Supabase）
│   ├── App.css                     # 样式
│   ├── main.jsx                    # 入口点（Sentry 初始化）
│   ├── worker.js                   # Cloudflare Worker（API 路由）
│   └── supabaseClient.js           # Supabase SDK 初始化和函数
├── .env.example                    # 环境变量模板
├── .gitignore                      # Git 忽略规则
├── package.json                    # npm 依赖与脚本
├── vite.config.js                  # Vite 配置
├── wrangler.toml                   # Cloudflare Workers 配置
├── wrangler-pages.toml             # Cloudflare Pages 配置
├── index.html                      # HTML 入口
├── README.md                       # 主文档
└── DEPLOYMENT.md                   # 部署指南
```

---

## 快速开始

### 本地开发（推荐）

```bash
# 1. 克隆并进入项目
git clone https://github.com/gusuihan4-tech/kaluli.git
cd kaluli

# 2. 安装依赖
npm install

# 3. 配置环境（复制 .env.example）
cp .env.example .env.local
# 编辑 .env.local，填入你的配置（可选，使用 mock 模式可跳过）

# 4. 启动开发服务器
npm run dev    # 前端，访问 http://localhost:5173
npm run workers # 在另一个终端启动 Workers（API）

# 5. 打开浏览器访问 http://localhost:5173
```

### 部署到生产环境

#### 方式 1：使用部署脚本（本地）

```bash
# 1. 获取 Cloudflare API Token（见 README）
# 2. 运行部署脚本
bash scripts/deploy.sh
# 脚本会提示输入 DEEPSEEK_API_KEY，然后自动部署
```

#### 方式 2：GitHub Actions（推荐）

1. Fork 本仓库到你的 GitHub 账号
2. 进入 Settings → Secrets and variables → Actions
3. 添加以下 Secrets：
   - `DEEPSEEK_API_KEY`：DeepSeek API key
   - `CF_API_TOKEN`：Cloudflare API token
   - `VITE_SENTRY_DSN`：（可选）Sentry DSN
   - `VITE_SUPABASE_URL`：（可选）Supabase 项目 URL
   - `VITE_SUPABASE_ANON_KEY`：（可选）Supabase 匿名 key
4. 推送到 `main` 分支，GitHub Actions 会自动构建和部署

---

## 配置指南

### 必需配置

#### Cloudflare Workers & Pages
1. 注册 Cloudflare 账号
2. 创建 API Token（Settings → API Tokens → Create Custom Token）
3. 在 `wrangler.toml` 中配置项目名称和环境

#### DeepSeek API（可选，已内置 mock 模式）
1. 注册 https://deepseek.com
2. 获取 API key
3. 设置环境变量 `DEEPSEEK_API_KEY`

### 可选配置

#### Supabase 云同步
详见 [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md)

- 创建 Supabase 项目
- 运行 SQL 建设表
- 设置环境变量 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`

#### Sentry 错误监控
详见 [README](README.md#错误监控与性能跟踪sentry)

- 创建 Sentry 项目（选 React）
- 设置环境变量 `VITE_SENTRY_DSN`

---

## 使用场景

### 场景 1：本地多用户（无网络）
- 你和朋友在聚餐时，各自用同一个设备输入用户名
- 各自的记录完全隔离，离线可用
- **无需任何云配置**

### 场景 2：多设备同步
- 启用 Supabase 云同步（见配置指南）
- 在手机、平板、电脑间同步食物记录
- 网络不稳定时自动降级为离线模式

### 场景 3：小团队追踪
- 多个朋友各有各的账号（邮箱登录）
- 云端自动备份各自数据
- 可选分享记录或对比卡路里

---

## 后续改进方向

### 短期（1-2 周）
- [ ] **数据导出**：支持导出 JSON / CSV，便于分析或迁移
- [ ] **食物库缓存**：常见食物模板（米饭、面条等）加速识别
- [ ] **图表统计**：周/月卡路里趋势图
- [ ] **个人目标**：设置每日卡路里目标，实时进度

### 中期（2-4 周）
- [ ] **社交分享**：分享单个记录或统计到微信、微博
- [ ] **推荐系统**：基于历史记录推荐合适的食物
- [ ] **餐厅集成**：识别常见餐厅菜单，快速选择
- [ ] **多语言**：中英文双语支持

### 长期（1+ 月）
- [ ] **AI 营养分析**：详细的蛋白质、脂肪、碳水分析
- [ ] **健康建议**：基于记录的个性化建议
- [ ] **社区功能**：朋友间分享、排行榜、打卡挑战
- [ ] **第三方集成**：与运动 App、健康数据同步

---

## 常见问题

### Q: 为什么数据不上传到服务器？
**A**: 为了隐私和简化部署。应用采用离线优先设计，数据始终存储在本地浏览器。云同步是可选的，需要你主动配置 Supabase。

### Q: 中国用户可以使用吗？
**A**: 完全可以。应用完全离线可用。云同步需要访问 Supabase，在中国网络可能不稳定，但应用会自动降级到本地模式，无影响。

### Q: 如何备份数据？
**A**: 
- **本地**：浏览器 localStorage 会自动保存（同一浏览器）
- **云端**：启用 Supabase 同步自动备份
- **手动**：导出功能（后续添加）

### Q: 可以多个浏览器同时使用吗？
**A**: 可以。不同浏览器数据独立。若启用 Supabase，多浏览器会自动同步。

### Q: DeepSeek API 很贵吗？
**A**: 很便宜。按 token 计费，通常每 1000 张图片不超过 1 元。开发可用 mock 模式（免费，返回假数据）。

---

## 技术要点与最佳实践

### 1. 离线优先架构
```
用户操作 → 本地 localStorage → 网络可用 → 后台同步云端
           ↓
        无网络仍可用
```

### 2. Service Worker 缓存策略
- **静态资源**：cache-first（加快首屏）
- **页面**：network-first（保证最新）
- **API**：手动管理（离线队列）

### 3. 环境变量与 Secrets
- 所有密钥从源码中移除
- 开发用 `.env.local`（gitignore）
- CI 用 GitHub Secrets
- 生产用 Cloudflare / Supabase 管理

### 4. 错误恢复
- 网络错误：自动入队，待恢复时重试
- 同步失败：后台异步，不阻塞用户
- 页面崩溃：Sentry 自动上报，开发者可知

---

## 许可证 & 致谢

- **开源框架**：React、Vite、Service Worker
- **云服务**：Cloudflare、Supabase、Sentry
- **AI**：DeepSeek API

---

## 最后的话

Kaluli 展示了如何构建一个现代化、隐私友好、小规模团队友好的 PWA 应用。虽然功能相对简单（食物识别 + 记录），但架构中的离线优先、云同步、错误监控等设计可应用于其他类似项目。

如有问题或改进建议，欢迎提 Issue 或 PR！

---

**最后更新**：2025 年 12 月 30 日
**项目状态**：✅ MVP 完成，可投入使用
**下一步**：小范围内测，收集反馈，迭代改进
