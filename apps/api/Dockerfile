# Built from the repository root: `docker build -f apps/api/Dockerfile .`
#
# A Dockerfile rather than letting the platform guess, because this is a
# workspace monorepo and the guess is usually "there is one package.json".
#
# node:24 specifically, not 22: the lock file was written by npm 11, and the
# npm 10 that ships with node:22 reads it as out of sync and refuses `npm ci`.
# The image has to match the toolchain that produced the lock.

# ---------------------------------------------------------------- build ----
FROM node:24-alpine AS build
WORKDIR /app

# bcrypt builds a native binding; alpine needs the toolchain to do it.
RUN apk add --no-cache python3 make g++

# Dependencies first, so a code change does not re-download the world.
COPY apps/api/package.json apps/api/package-lock.json ./
RUN npm ci

COPY apps/api/tsconfig*.json nest-cli.json* ./
COPY apps/api/src ./src
RUN npm run build

# Drop everything the running app does not need: test tooling, the Nest CLI,
# TypeScript. Roughly halves the image.
RUN npm prune --omit=dev

# ----------------------------------------------------------------- run -----
FROM node:24-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# Receipts live here (BR-10, NFR-11): outside any static route, and on a
# mounted volume in production — a container filesystem is discarded on every
# deploy, and the receipts with it.
RUN mkdir -p /data/uploads && chown -R node:node /data
ENV UPLOAD_DIR=/data/uploads
VOLUME ["/data"]

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./package.json

# Not root. A process that only has to read its own code and write one
# directory has no business being able to do more.
USER node

EXPOSE 3000

# The platform's health check points here; it reports the database too, so a
# container that cannot reach Postgres is reported unhealthy rather than
# serving 500s.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]
