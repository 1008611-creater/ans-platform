# Easel stays a separate, pinned upstream runtime; no source or secrets are copied from ANS.
FROM node:24-bookworm-slim AS source
ARG EASEL_COMMIT=bb3c8ff0463f36c202454d74171682ba6e470cb1
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates
WORKDIR /source
RUN git init && git remote add origin https://github.com/ZJU-REAL/Easel.git && git sparse-checkout init --no-cone && printf '/*\n!/assets/\n!/web/static/showcase/\n' > .git/info/sparse-checkout && git fetch --depth 1 --filter=blob:none origin "$EASEL_COMMIT" && git checkout --detach FETCH_HEAD && test "$(git rev-parse HEAD)" = "$EASEL_COMMIT"
COPY services/easel-worker/frontend-lock.patch /tmp/frontend-lock.patch
COPY services/easel-worker/frontend-owner.patch /tmp/frontend-owner.patch
RUN git apply /tmp/frontend-lock.patch /tmp/frontend-owner.patch
WORKDIR /source/web/frontend
RUN npm ci && npm run build
WORKDIR /source
RUN mkdir /seed && tar --exclude=.git --exclude=web/frontend/node_modules -cf - . | tar -xf - -C /seed

FROM scratch AS frontend
COPY --from=source /source/web/frontend/dist /
COPY --from=source /source/web/static/easel-icon-transparent.png /static/easel-icon-transparent.png

FROM python:3.12-slim-bookworm
ARG OPENCLAW_VERSION=2026.10.3
ARG EASEL_COMMIT=bb3c8ff0463f36c202454d74171682ba6e470cb1
LABEL org.opencontainers.image.source="https://github.com/ZJU-REAL/Easel" org.opencontainers.image.revision="$EASEL_COMMIT"
COPY --from=source /usr/local/bin/node /usr/local/bin/node
COPY --from=source /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/npm
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm && ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg git curl iproute2 util-linux fonts-noto-cjk ca-certificates && npm install -g "openclaw@${OPENCLAW_VERSION}"
RUN useradd --uid 10001 --create-home easel
COPY --from=source --chown=10001:10001 /seed /workspace
WORKDIR /workspace
ENV HOME=/home/easel PLAYWRIGHT_BROWSERS_PATH=/opt/browsers PYTHONUNBUFFERED=1
RUN pip install --no-cache-dir . && python -m playwright install --with-deps chromium
COPY services/easel-worker/entrypoint.py /opt/ans-easel-entrypoint.py
USER 10001:10001
EXPOSE 7860
ENTRYPOINT ["python", "/opt/ans-easel-entrypoint.py"]
