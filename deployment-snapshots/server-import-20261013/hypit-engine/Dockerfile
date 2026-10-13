FROM node:24-bookworm-slim
COPY ca-bundle.crt /etc/ssl/certs/ca-certificates.crt
RUN --mount=type=tmpfs,target=/var/cache/apt --mount=type=tmpfs,target=/var/lib/apt/lists sed -i 's|http://deb.debian.org|https://deb.debian.org|g' /etc/apt/sources.list.d/debian.sources && apt-get update && apt-get install -y --no-install-recommends chromium ffmpeg fonts-noto-cjk ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /service
ENV NODE_ENV=production PORT=3022 DATA_ROOT=/data HOME=/tmp/hypit-home
USER node
CMD ["node", "server.mjs"]
