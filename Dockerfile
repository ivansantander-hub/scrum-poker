FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace config
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy package.json files
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY backend ./backend
COPY frontend ./frontend

# Build frontend
RUN pnpm build:frontend

# Build backend
RUN pnpm build:backend

# Copy frontend dist and public assets to backend public folder for serving
RUN mkdir -p /app/backend/dist/public && \
    cp -r /app/frontend/dist/* /app/backend/dist/public/ && \
    cp -r /app/frontend/public/* /app/backend/dist/public/

# Production image
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace config
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY backend/package.json ./backend/

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built files
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/node_modules ./node_modules

WORKDIR /app/backend

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/main.js"]
