FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

RUN pnpm install --frozen-lockfile

COPY backend ./backend
COPY frontend ./frontend

RUN pnpm build:frontend
RUN pnpm build:backend

RUN mkdir -p /app/backend/dist/public && \
    cp -r /app/frontend/dist/* /app/backend/dist/public/ && \
    cp -r /app/frontend/public/* /app/backend/dist/public/

FROM node:20-alpine

WORKDIR /app/backend

COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/package.json ./

RUN mkdir -p /app/backend/data

ENV NODE_ENV=production
ENV PORT=3000

USER node

EXPOSE 3000

CMD ["node", "dist/main.js"]
