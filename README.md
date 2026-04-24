# bot1

一个已经拆出配置层和 provider 层的聊天模板项目，当前默认接 Coze `stream_run` 接口。

## 当前结构

- `server.js`
  - 纯 Node 内置模块服务入口
  - 路由分发、静态资源服务、SSE 转发
- `server-config.js`
  - `.env` 加载
  - 运行目录与后端配置读取
- `providers/coze-project.js`
  - Coze `stream_run` 请求构造
  - SSE 解析
  - 调试文件输出
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

复制一份：

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

## 启动

```powershell
node .\server.js
```

启动后访问：

```text
http://localhost:3020
```

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

- Codex 当前环境里的 `node` 校验命令会系统级崩溃，无法在这里完成本地运行态校验
- 代码已按无第三方依赖处理，正常情况下只需要本机 `node.exe` 能运行即可
- 调试时可查看 `debug/last-coze-sse.txt`，确认 Coze 原始 SSE 返回内容
