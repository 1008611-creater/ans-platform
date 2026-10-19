# 画布服务端 API（账号 / 项目 / 素材 / 媒体）
# 构建上下文：服务器上 /opt/infinite-canvas/api（publish.sh 会把 canvas-api/ 拷过去）
#
# 依赖全选纯 JS 实现（bcryptjs 而不是 bcrypt），避免在不同架构上编译原生模块——
# 本机 package-lock 是 macOS 生成的、Windows 原生包装不上，这个坑已经踩过一次。

FROM node:22-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY server.js db.js auth.js schema.sql ./

ENV PORT=8790
ENV MEDIA_ROOT=/data/media
ENV SYNC_ROOT=/data/sync
ENV NODE_ENV=production

EXPOSE 8790

CMD ["node", "server.js"]
