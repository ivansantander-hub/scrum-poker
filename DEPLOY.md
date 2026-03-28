# Build and push to Railway

## Option 1: Two services on Railway

### Backend Service
- Root directory: `/backend`
- Build command: `pnpm install && pnpm build`
- Start command: `node dist/main.js`
- Environment variable: `NODE_ENV=production`

### Frontend Service  
- Root directory: `/frontend`
- Build command: `pnpm install && pnpm build`
- Start command: `pnpm start` (requires serving)

## Option 2: Single monorepo with nginx

1. Build frontend static files
2. Serve via nginx with backend proxy

## Railway Configuration

Create `railway.json` in root:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "numReplicas": 1,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

## Docker Commands (local testing)

```bash
# Build images
docker build -f Dockerfile.backend -t scrum-poker-backend .
docker build -f Dockerfile.frontend -t scrum-poker-frontend .

# Run with docker-compose
docker-compose up -d

# Stop
docker-compose down
```
