# bot1

一个已经拆出配置层和 provider 层的聊天模板项目，当前默认接 Coze `stream_run` 接口。

当前支持两种运行方式：

- 本地 Node 直接启动
- Cloudflare Workers + Workers Static Assets 部署

## 当前结构

- `server.js`
  - 纯 Node 内置模块服务入口
  - 路由分发、静态资源服务、SSE 转发
- `worker.js`
  - Cloudflare Worker 入口
  - 通过 `cloudflare:node` 复用现有 Node HTTP 服务
- `server-config.js`
  - `.env` 加载
  - 本地 / Cloudflare 双运行时目录与后端配置读取
- `providers/coze-project.js`
  - Coze `stream_run` 请求构造
  - SSE 解析
  - 调试文件输出（本地目录或 Workers `/tmp`）
- `public/index.html`
  - 页面骨架和基础容器
- `public/app.js`
  - 前端状态、会话管理、流式渲染、交互事件
- `public/app-config.js`
  - 前端品牌文案、欢迎区、占位文案、存储命名空间
- `public/storage.js`
  - 本地会话与 UI 状态存储封装
- `public/message-format.js`
  - 助手消息轻量格式化与流式分段规则
- `public/styles.css`
  - ChatGPT 风格聊天界面样式

## 模板化时优先改这几个地方

### 1. 改页面品牌和文案

编辑 `public/app-config.js`：

- `brand`
  - 页面标题
  - 顶栏标题
  - 账号展示
- `welcome`
  - 欢迎区标题、描述、示例问题
- `composer`
  - 输入框占位和底部提示
- `share`
  - 分享标题与反馈文案

### 2. 改本地存储命名空间

也在 `public/app-config.js`：

```js
storage: {
  namespace: 'bot1_training_assistant',
}
```

换项目时建议改成新的 namespace，避免不同聊天模板共用同一份浏览器缓存。

### 3. 改后端对接 provider

当前默认 provider 是：

- `providers/coze-project.js`

如果后面接别的平台，建议保留 `server.js` 的路由结构，只替换：

- provider 文件
- `server-config.js` 里的配置读取

## 环境变量

本地 Node 运行时复制一份：

```powershell
Copy-Item .env.example .env
```

然后填写：

```env
PORT=3020
COZE_API_TOKEN=你的token
COZE_STREAM_URL=https://xxxx.coze.site/stream_run
COZE_PROJECT_ID=你的project_id
```

如果使用 `wrangler dev`，再复制一份：

```powershell
Copy-Item .dev.vars.example .dev.vars
```

然后填入同样的变量。

## 本地启动

```powershell
node .\server.js
```

启动后访问：

```text
http://localhost:3020
```

## Cloudflare 部署

项目已经补好了以下 Cloudflare 文件：

- `worker.js`
- `wrangler.jsonc`
- `.dev.vars.example`

推荐流程：

```powershell
wrangler login
wrangler dev
wrangler deploy
```

部署到 Cloudflare 后，建议这样配置：

- `COZE_API_TOKEN`
  - 用 `wrangler secret put COZE_API_TOKEN`
- `COZE_STREAM_URL`
  - 可放到 Cloudflare Worker 变量或 Secret
- `COZE_PROJECT_ID`
  - 可放到 Cloudflare Worker 变量或 Secret

当前 `wrangler.jsonc` 已按 Workers 最新推荐方式配置：

- `nodejs_compat`
- `enable_nodejs_http_server_modules`
- Workers Static Assets
- SPA fallback
- `/api/*` 先进入 Worker，其余静态资源直接走资产分发

## 已实现

- 类 ChatGPT 的浅色聊天界面
- 左侧历史会话
- 本地会话持久化
- 移动端抽屉 / 桌面端可拖拽侧栏
- Coze 流式输出
- 取消生成
- 回到底部
- 历史记录重命名 / 删除

## 当前注意点

- 当前 Codex 环境里的 `npm`/`wrangler` 还未完成安装校验，所以这里先完成了项目适配
- 本地调试时可查看 `debug/last-coze-sse.txt`，确认 Coze 原始 SSE 返回内容
- Cloudflare Worker 运行时会把调试文件写到临时目录 `/tmp/bot1-runtime/debug/last-coze-sse.txt`
