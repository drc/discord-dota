# Use the official Bun image as the base
FROM oven/bun:1.4.0 AS base
WORKDIR /usr/src/app

# --- New Step: Install ffmpeg ---
# We do this in a separate layer to keep things organized
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    rm -rf /var/lib/apt/lists/*
# -------------------------------

# Install all dependencies (incl. dev) for building the web UI
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Build the web UI
FROM base AS build
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
RUN bun run build:web

# Install production-only dependencies
FROM base AS prod-deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Copy everything into final image
FROM base AS release
COPY . .
COPY --from=prod-deps /usr/src/app/node_modules node_modules
COPY --from=build /usr/src/app/web/dist ./web/dist

USER bun
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "run", "src/index.ts" ]
