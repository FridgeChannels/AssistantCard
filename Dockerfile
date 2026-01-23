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

# 复制 package.json 文件
COPY package*.json ./

# 只安装生产依赖
RUN npm ci --omit=dev && \
    npm cache clean --force

# 从构建阶段复制构建产物
COPY --from=builder /app/dist ./dist

# 复制配置文件
COPY vite.config.js ./
COPY ecosystem.config.cjs ./

# 复制 entrypoint 脚本
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# 暴露端口（vite preview 默认使用 4173）
EXPOSE 4173

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4173/ || exit 1

# 设置 entrypoint
ENTRYPOINT ["docker-entrypoint.sh"]

# 使用 pm2 启动应用
CMD ["pm2-runtime", "start", "ecosystem.config.cjs"]
