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
# Keep package downloads across transient mirror failures and separate the npm layer.
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked --mount=type=cache,target=/var/lib/apt,sharing=locked \
    rm -f /etc/apt/apt.conf.d/docker-clean && sed -i 's|http://deb.debian.org|https://deb.debian.org|g' /etc/apt/sources.list.d/debian.sources && \
    apt-get -o Acquire::Retries=3 update && apt-get -o Acquire::Retries=3 install -y --no-install-recommends ffmpeg git curl iproute2 util-linux fonts-noto-cjk ca-certificates
RUN npm install -g "openclaw@${OPENCLAW_VERSION}"
RUN useradd --uid 10001 --create-home easel
COPY --from=source --chown=10001:10001 /seed /workspace
WORKDIR /workspace
ENV HOME=/home/easel PLAYWRIGHT_BROWSERS_PATH=/opt/browsers PYTHONUNBUFFERED=1
COPY services/easel-worker/constraints.txt /opt/easel-constraints.txt
RUN --mount=type=cache,target=/root/.cache/pip PIP_CACHE_DIR=/root/.cache/pip pip install --only-binary=biliup --constraint /opt/easel-constraints.txt .
RUN python -m playwright install --with-deps chromium
# npm guards install scripts; explicitly run the required installed package hooks.
RUN npm rebuild --global --allow-scripts=@google/genai,esbuild,koffi,protobufjs,openclaw
# Upstream skill instructions call this interpreter explicitly.
RUN python -m venv --system-site-packages /workspace/.venv && chown -R 10001:10001 /workspace/.venv
COPY services/easel-worker/entrypoint.py /opt/ans-easel-entrypoint.py
USER 10001:10001
EXPOSE 7860
ENTRYPOINT ["python", "/opt/ans-easel-entrypoint.py"]
