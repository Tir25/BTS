# Frontend Deployment Guide

## Table of Contents
1. [Overview](#overview)
2. [Deployment Options](#deployment-options)
3. [Deployment Decision Tree](#deployment-decision-tree)
4. [Platform-Specific Guides](#platform-specific-guides)
5. [Environment Configuration](#environment-configuration)
6. [Troubleshooting](#troubleshooting)

## Overview

This guide provides comprehensive instructions for deploying the University Bus Tracking System frontend. The frontend supports multiple deployment platforms to accommodate various hosting requirements.

### Current Production Deployment
- **Platform:** Vercel
- **URL:** https://bts-frontend-navy.vercel.app
- **Status:** Active Production

## Deployment Options

### 1. Vercel (Recommended for Production) ✅

**Best for:**
- Production deployments
- Automatic deployments from Git
- Edge network performance
- Zero-configuration SSL

**Configuration Files:**
- `vercel.json` (root)
- `frontend/vercel.json` (overrides)

**Deployment Steps:**
```bash
# Automatic deployment (recommended)
# - Connect GitHub repository to Vercel
# - Vercel auto-deploys on push to main branch

# Manual deployment via CLI
cd frontend
vercel --prod
```

**Build Command:**
```bash
npm run build:vercel
```

**Environment Variables:**
Set these in Vercel dashboard:
- `VITE_API_URL` - Backend API URL
- `VITE_WEBSOCKET_URL` - WebSocket URL
- `VITE_SUPABASE_URL` - Supabase URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

### 2. Docker (For Self-Hosted Deployments) 🐳

**Best for:**
- Self-hosted infrastructure
- Kubernetes deployments
- Corporate firewalls
- Full control over infrastructure

**Configuration Files:**
- `frontend/Dockerfile`
- `frontend/nginx.conf`
- `deploy/docker-compose.yml`

**Deployment Steps:**
```bash
# Build Docker image
cd frontend
docker build -t bus-tracking-frontend:latest .

# Run container
docker run -d \
  -p 80:80 \
  -e VITE_API_URL=http://backend-url:3001 \
  -e VITE_WEBSOCKET_URL=ws://backend-url:3001 \
  --name bus-tracking-frontend \
  bus-tracking-frontend:latest

# Using Docker Compose (recommended)
cd deploy
docker-compose up -d
```

**Build Command:**
```bash
npm run build:docker
```

### 3. Render (Static Site) 📦

**Best for:**
- Alternative cloud hosting
- Budget-conscious deployments
- Simple static hosting

**Configuration Files:**
- `render.yaml` (root - frontend commented out)

**Note:** Currently not used in production. To enable:

1. Uncomment frontend section in `render.yaml`
2. Update build command if needed
3. Configure environment variables in Render dashboard

**Deployment Steps:**
```bash
# Automatic deployment via Git
# - Connect repository to Render
# - Configure build settings
# - Deploy automatically
```

### 4. Custom/Development 🛠️

**Best for:**
- Local development
- Testing
- Debugging

**Deployment Steps:**
```bash
# Development server
npm run dev

# Production preview
npm run build
npm run preview
```

## Deployment Decision Tree

```
Start
  │
  ├─ Need automatic Git deployments?
  │     │
  │     ├─ YES → Use Vercel
  │     │
  │     └─ NO → Continue
  │
  ├─ Need self-hosted infrastructure?
  │     │
  │     ├─ YES → Use Docker
  │     │
  │     └─ NO → Continue
  │
  ├─ Need alternative cloud hosting?
  │     │
  │     ├─ YES → Use Render (needs configuration)
  │     │
  │     └─ NO → Use Vercel (default)
```

## Platform-Specific Guides

### Vercel Deployment

**Prerequisites:**
- GitHub repository connected to Vercel
- Vercel account with project created

**Configuration:**
1. Vercel automatically detects Vite project
2. Root `vercel.json` provides configuration
3. `frontend/vercel.json` can provide overrides

**Environment Variables:**
Set in Vercel project settings:
- Production
- Preview
- Development

**Build Settings:**
- Framework Preset: Vite
- Build Command: `cd frontend && npm run build:vercel`
- Output Directory: `frontend/dist`
- Install Command: `cd frontend && npm ci`

**Features:**
- Automatic deployments on push
- Preview deployments for PRs
- Edge network caching
- Zero-downtime deployments
- Rollback capability

### Docker Deployment

**Prerequisites:**
- Docker installed
- Docker Compose (optional but recommended)

**Configuration:**
Multi-stage build for optimization:
1. Build stage: Install dependencies and build
2. Production stage: Serve with Nginx

**Environment Variables:**
Pass via `-e` flag or environment file:
```bash
-e VITE_API_URL=http://backend:3001
-e VITE_WEBSOCKET_URL=ws://backend:3001
```

**Nginx Configuration:**
- Security headers
- Gzip compression
- Static asset caching
- SPA routing support

**Health Checks:**
```bash
# Check container health
docker ps

# View logs
docker logs bus-tracking-frontend

# Execute in container
docker exec -it bus-tracking-frontend sh
```

## Environment Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://api.example.com` |
| `VITE_WEBSOCKET_URL` | WebSocket URL | `wss://api.example.com` |
| `VITE_SUPABASE_URL` | Supabase URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJ...` |

### Environment Files

| File | Purpose | When to Use |
|------|---------|-------------|
| `.env.local` | Local development | Never commit |
| `.env.template` | Template for env vars | Source control |
| `.env.production` | Production overrides | Deployed environments |

### Setting Environment Variables

**Vercel:**
1. Go to Project Settings
2. Navigate to Environment Variables
3. Add variables for Production, Preview, Development

**Docker:**
```bash
# Via command line
docker run -e VITE_API_URL=http://backend:3001 ...

# Via .env file
docker run --env-file .env.production ...
```

**Local Development:**
```bash
# Copy template
cp .env.template .env.local

# Edit .env.local with your values
nano .env.local
```

## Troubleshooting

### Common Issues

#### 1. Build Fails on Vercel

**Symptoms:**
- Build fails with errors
- Missing environment variables

**Solutions:**
```bash
# Check build logs in Vercel
# Verify environment variables are set
# Ensure build command is correct
npm run build:vercel  # Test locally first
```

#### 2. Docker Container Won't Start

**Symptoms:**
- Container exits immediately
- Port conflicts

**Solutions:**
```bash
# Check logs
docker logs bus-tracking-frontend

# Check port availability
lsof -i :80

# Check environment variables
docker exec bus-tracking-frontend env
```

#### 3. SPA Routing Not Working

**Symptoms:**
- 404 errors on refresh
- Routes don't work

**Solutions:**
- Verify Nginx configuration (Docker)
- Check Vercel rewrites configuration
- Ensure all routes redirect to index.html

#### 4. Environment Variables Not Loading

**Symptoms:**
- Undefined values
- Variables not accessible

**Solutions:**
- Verify variable names start with `VITE_`
- Restart development server after changes
- Clear build cache: `npm run build --force`
- Check deployment environment settings

### Debugging Commands

```bash
# Check environment variables
printenv | grep VITE

# Test build locally
npm run build:vercel

# Preview production build
npm run build
npm run preview

# Docker health check
docker inspect bus-tracking-frontend | grep Health

# Network debugging
curl -I https://your-domain.com
```

## Best Practices

### 1. Environment Separation
- Never commit `.env.local`
- Use different env values for each environment
- Keep production keys secure

### 2. Build Optimization
- Enable production builds only
- Use build caching when possible
- Monitor bundle sizes

### 3. Security
- Keep dependencies updated
- Use environment variables for secrets
- Enable security headers
- Regular security audits

### 4. Monitoring
- Set up error tracking (Sentry, etc.)
- Monitor deployment health
- Track performance metrics
- Set up alerts

### 5. Deployment Workflow
- Use feature branches
- Test locally before deploying
- Deploy to staging first
- Monitor production after deployment

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Docker Documentation](https://docs.docker.com/)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [Nginx Documentation](https://nginx.org/en/docs/)

## Support

For deployment issues:
1. Check this guide
2. Review platform-specific documentation
3. Check build logs
4. Contact the development team

---

**Last Updated:** 2024-12-19
**Maintained by:** Development Team
