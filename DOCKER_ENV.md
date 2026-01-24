# Docker 环境变量配置说明

## 概述

本项目已配置为支持运行时环境变量注入，允许您在不重新构建 Docker 镜像的情况下更改环境变量。

## 工作原理

1. **构建时**：应用被构建为静态文件
2. **运行时**：`docker-entrypoint.sh` 脚本将环境变量注入到 `/app/dist/env-config.js` 文件中
3. **应用启动**：`index.html` 加载 `env-config.js`，使环境变量在 `window.ENV` 对象中可用
4. **代码访问**：应用代码通过 `src/config/env.js` 模块访问环境变量

## 构建和运行

### 1. 构建 Docker 镜像

```bash
docker build -t assistantcard:v1.0.2 .
```

### 2. 使用 Docker Compose 运行

```bash
# 复制示例配置
cp docker-compose.example.yml docker-compose.yml

# 编辑配置文件，设置您的环境变量
nano docker-compose.yml

# 启动容器
docker-compose up -d

# 查看日志
docker-compose logs -f assistantcard
```

### 3. 或使用 docker run 命令

```bash
docker run -d \
  --name assistantcard \
  -p 4173:4173 \
  -e SUPABASE_URL="https://your-project.supabase.co" \
  -e SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" \
  # 如仍需在前端直接使用 Supabase（不推荐），可额外设置以下变量
  # -e VITE_SUPABASE_URL="https://your-project.supabase.co" \
  # -e VITE_SUPABASE_ANON_KEY="your-anon-key" \
  -e VITE_CHAT_API_URL="https://your-api.com/v1/chat-messages" \
  -e VITE_CHAT_API_TOKEN="your-token" \
  -e VITE_RELATED_QUESTIONS_API_URL="https://your-api.com/v1/chat-messages" \
  -e VITE_RELATED_QUESTIONS_API_TOKEN="your-token" \
  -e VITE_DOCUMENT_SUMMARY_API_URL="https://your-api.com/v1/chat-messages" \
  -e VITE_DOCUMENT_SUMMARY_API_TOKEN="your-token" \
  assistantcard:v1.0.2
```

## 环境变量说明

| 变量名 | 说明 | 必需 |
|--------|------|------|
| `SUPABASE_URL` | Supabase 项目 URL（后端使用） | 是 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role 密钥（仅在后端使用，不会暴露到前端） | 是 |
| `VITE_SUPABASE_URL` | （可选）旧版前端 Supabase 项目 URL | 否 |
| `VITE_SUPABASE_ANON_KEY` | （可选）旧版前端 Supabase 匿名密钥 | 否 |
| `VITE_CHAT_API_URL` | 聊天 API 端点 | 是 |
| `VITE_CHAT_API_TOKEN` | 聊天 API 令牌 | 是 |
| `VITE_RELATED_QUESTIONS_API_URL` | 相关问题 API 端点 | 是 |
| `VITE_RELATED_QUESTIONS_API_TOKEN` | 相关问题 API 令牌 | 是 |
| `VITE_DOCUMENT_SUMMARY_API_URL` | 文档摘要 API 端点 | 是 |
| `VITE_DOCUMENT_SUMMARY_API_TOKEN` | 文档摘要 API 令牌 | 是 |

## 验证环境变量

启动容器后，您可以验证环境变量是否正确注入：

```bash
# 查看生成的配置文件
docker exec assistantcard cat /app/dist/env-config.js

# 或在浏览器控制台中检查
# 打开 http://localhost:4173
# 在控制台输入: window.ENV
```

## 本地开发

本地开发时，继续使用 `.env` 文件：

```bash
# 复制示例文件
cp .env.example .env

# 编辑 .env 文件
nano .env

# 启动开发服务器
npm run dev
```

## 故障排除

### 环境变量未生效

1. 检查容器日志：`docker logs assistantcard`
2. 验证 env-config.js 文件：`docker exec assistantcard cat /app/dist/env-config.js`
3. 确保需要注入到前端的环境变量名称以 `VITE_` 开头（例如 `VITE_CHAT_API_URL`）

### 应用无法启动

1. 检查 PM2 日志：`docker exec assistantcard pm2 logs`
2. 验证端口是否被占用：`lsof -i :4173`
3. 检查健康状态：`docker inspect assistantcard | grep Health`

## 更新环境变量

要更新环境变量，只需重启容器：

```bash
# 使用 Docker Compose
docker-compose restart assistantcard

# 或使用 docker
docker restart assistantcard
```

**注意**：如果使用 `docker run` 启动的容器，需要先删除旧容器再创建新容器才能更新环境变量。
