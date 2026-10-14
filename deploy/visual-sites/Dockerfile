FROM node:24-bookworm-slim
ARG ANS_VISUAL_SOURCE_REVISION
LABEL org.opencontainers.image.source="https://github.com/1008611-creater/ans-platform"
LABEL org.opencontainers.image.revision=$ANS_VISUAL_SOURCE_REVISION
WORKDIR /app
COPY --chown=node:node worker.mjs server.mjs ./
USER node
ENV NODE_ENV=production PORT=3102 ANS_GATEWAY_BIND=0.0.0.0
EXPOSE 3102
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:3102/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node","server.mjs"]
