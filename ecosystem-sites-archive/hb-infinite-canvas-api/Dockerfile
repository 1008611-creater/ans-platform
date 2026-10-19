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

# ⚠️ 新增后端文件必须同时改这一行 —— 漏了会表现为「构建成功但运行时 MODULE_NOT_FOUND」，
#    而发布日志可能全绿（历史上一字排开 COPY 就是为了出问题时一眼看出缺谁）。
COPY server.js db.js auth.js schema.sql credits.js ldxp-redeem.js ziyu.js routes-credits.js email.js email-verify.js unified-auth.js unified-quota.js unified-quota-client.mjs ./

ENV PORT=8790
ENV MEDIA_ROOT=/data/media
ENV SYNC_ROOT=/data/sync
ENV NODE_ENV=production

EXPOSE 8790

CMD ["node", "server.js"]
