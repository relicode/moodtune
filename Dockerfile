# ── deps ──────────────────────────────────────────────────────────────────────
FROM node:24-alpine AS deps
WORKDIR /app

ARG NPM_CONFIG_REGISTRY=https://registry.npmjs.org
ENV NPM_CONFIG_REGISTRY=${NPM_CONFIG_REGISTRY}

COPY package.json package-lock.json ./
RUN npm ci

# ── builder ───────────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

RUN cp -r public .next/standalone/public && \
    cp -r .next/static .next/standalone/.next/static

# ffmpeg-static supports FFMPEG_BIN env var so the binary can live anywhere.
# ffprobe-static resolves relative to __dirname so it must be in node_modules.
RUN ARCH=$(node -p "process.arch") && \
    cp node_modules/ffmpeg-static/ffmpeg .next/standalone/ffmpeg && \
    mkdir -p .next/standalone/node_modules/ffprobe-static/bin/linux/$ARCH && \
    cp node_modules/ffprobe-static/bin/linux/$ARCH/ffprobe \
       .next/standalone/node_modules/ffprobe-static/bin/linux/$ARCH/ffprobe

# ── runner ────────────────────────────────────────────────────────────────────
FROM node:24-alpine AS runner
WORKDIR /app

RUN apk add --no-cache tini

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV FFMPEG_BIN=/app/ffmpeg

COPY --from=builder /app/.next/standalone ./
RUN chmod +x ffmpeg && \
    find node_modules/ffprobe-static/bin -name ffprobe -exec chmod +x {} +

USER 1001:100

EXPOSE 3000

ENTRYPOINT ["tini", "--"]
CMD ["node", "server.js"]
