# 构建阶段
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制项目文件
COPY . .

# 构建项目
RUN npm run build

# 运行阶段
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 全局安装 pm2
RUN npm install -g pm2

# 从构建阶段复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/vite.config.js ./

# 安装依赖（包括 vite，因为 vite preview 需要它）
RUN npm ci && npm cache clean --force

# 复制 pm2 配置文件
COPY ecosystem.config.cjs ./

# 暴露端口（vite preview 默认使用 4173）
EXPOSE 4173

# 使用 pm2 启动应用
CMD ["pm2-runtime", "start", "ecosystem.config.cjs"]
