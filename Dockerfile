# CleanCollect — production Dockerfile (Render / Railway / Fly / any VPS)
#
# Build:    docker build -t cleancollect .
# Run:      docker run -p 3000:3000 -v cleancollect-data:/var/data cleancollect
#
# The volume mount keeps data/db.json across restarts; the same is true on
# Render with `disk: { mountPath: /var/data }` and on Fly with a `volume`.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev=false

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/var/data

# Production-only deps (smaller image)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Built artefacts
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist/server.cjs ./dist/server.cjs

# The API resolves the DB path from DATA_DIR (or cwd as a fallback).
# Mount a writable volume at /var/data so data persists across restarts.
RUN mkdir -p /var/data
VOLUME ["/var/data"]

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "dist/server.cjs"]
