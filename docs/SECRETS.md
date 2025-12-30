## 安全存储与注入环境变量（DEEPSEEK_API_KEY）

不要在 `wrangler.toml` 或源码中提交明文 API key。请使用下面方法安全注入到 Cloudflare Worker / Pages 环境中。

1) 使用 `wrangler secret put`（推荐）

  - 本地 / 开发环境：
```bash
wrangler secret put DEEPSEEK_API_KEY --env development
```
  命令会交互式提示输入密钥内容并安全存储到 Workers 环境。

  - 生产环境：
```bash
wrangler secret put DEEPSEEK_API_KEY --env production
```

2) Cloudflare Pages（若使用 Pages 部署）

  在 Pages 项目的「Settings → Environment variables & secrets」中添加名为 `DEEPSEEK_API_KEY` 的 secret（Environment variables / Secrets 区分）。

3) CI / 自动化

  - 在 CI（例如 GitHub Actions）中，将密钥保存为仓库 Secrets（例如 `CF_DEEPSEEK_API_KEY`），并在 workflow 中通过 `wrangler secret put` 或 Pages 的 API 将其注入到目标环境。

4) 本仓库的注意事项

  - 我已从 `wrangler.toml` 中移除明文 `DEEPSEEK_API_KEY`（保留 `MOCK` 变量），开发时可继续使用 mock 模式：`wrangler dev --env development`。
  - 如果密钥已被提交到 Git，建议立即：
    - 在云平台（DeepSeek）侧撤销/轮换该密钥；
    - 从 Git 历史中删除敏感信息（例如使用 `git filter-repo` 或 `bfg`），但注意这会重写历史。

5) 验证

  - 部署后可通过 Worker 中 `console.log(env.DEEPSEEK_API_KEY ? 'OK' : 'MISSING')` 验证（仅临时用于验证，不要保留该日志）。

如需我为你生成 GitHub Actions 的示例 workflow，自动在 CI 中注入并部署 worker/pages，请回复 “生成 CI 示例”。
