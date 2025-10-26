# University Bus Tracking System - Complete Deployment Guide

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Local Development Setup](#local-development-setup)
4. [Production Deployment](#production-deployment)
5. [Docker Deployment](#docker-deployment)
6. [Cloud Deployment](#cloud-deployment)
7. [Monitoring and Maintenance](#monitoring-and-maintenance)
8. [Troubleshooting](#troubleshooting)
9. [Security Considerations](#security-considerations)

## Overview

This guide provides comprehensive instructions for deploying the University Bus Tracking System across different environments, from local development to production cloud deployment.

## Prerequisites

### System Requirements
- **Node.js:** 18.x or higher
- **npm:** 8.x or higher
- **PostgreSQL:** 15.x or higher
- **Redis:** 7.x or higher (optional, for caching)
- **Docker:** 20.x or higher (for containerized deployment)
- **Git:** Latest version

### Environment Variables
Create the following environment files:

#### Backend (.env)
```bash
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/bustracking
POSTGRES_PASSWORD=secure_password

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_key
JWT_EXPIRES_IN=24h

# Server Configuration
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://your-frontend-domain.com

# Redis (optional)
REDIS_URL=redis://localhost:6379

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# WebSocket
WS_CORS_ORIGIN=https://your-frontend-domain.com
```

#### Frontend (.env)
```bash
# API Configuration
VITE_API_URL=https://api.your-domain.com
VITE_WS_URL=wss://api.your-domain.com

# Map Configuration
VITE_MAP_DEFAULT_ZOOM=13
VITE_MAP_MAX_ZOOM=18
VITE_MAP_MIN_ZOOM=10

# Feature Flags
VITE_ENABLE_CLUSTERING=true
VITE_ENABLE_HEATMAP=true
VITE_ENABLE_OFFLINE_MODE=true
VITE_ENABLE_PUSH_NOTIFICATIONS=true

# Performance
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_SLOW_RENDER_THRESHOLD=16
VITE_MAX_RENDER_COUNT=100
```

## Local Development Setup

### 1. Clone Repository
```bash
git clone https://github.com/your-org/bustracking.git
cd bustracking
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Database Setup
```bash
# Start PostgreSQL
sudo systemctl start postgresql

# Create database
createdb bustracking

# Run migrations
cd backend
npm run migrate
```

### 4. Start Development Servers
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 5. Verify Installation
- Backend: http://localhost:3001/health
- Frontend: http://localhost:5173
- API Documentation: http://localhost:3001/api-docs

## Production Deployment

### 1. Build Applications
```bash
# Build backend
cd backend
npm run build

# Build frontend
cd ../frontend
npm run build:optimized
```

### 2. Database Setup
```bash
# Create production database
createdb bustracking_prod

# Run migrations
cd backend
NODE_ENV=production npm run migrate
```

### 3. Process Management with PM2
```bash
# Install PM2
npm install -g pm2

# Start backend
cd backend
pm2 start dist/server.js --name "bustracking-backend"

# Start frontend (if serving statically)
cd frontend
pm2 serve dist 5173 --name "bustracking-frontend"

# Save PM2 configuration
pm2 save
pm2 startup
```

### 4. Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Frontend
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

## Docker Deployment

### 1. Using Docker Compose
```bash
# Clone repository
git clone https://github.com/your-org/bustracking.git
cd bustracking

# Create environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Start services
docker-compose -f deploy/docker-compose.yml up -d
```

### 2. Individual Container Deployment
```bash
# Build backend image
cd backend
docker build -t bustracking-backend .

# Build frontend image
cd ../frontend
docker build -t bustracking-frontend .

# Run containers
docker run -d --name bustracking-backend -p 3001:3001 bustracking-backend
docker run -d --name bustracking-frontend -p 5173:80 bustracking-frontend
```

### 3. Docker Compose with Monitoring
```bash
# Start with monitoring stack
docker-compose -f deploy/docker-compose.yml up -d

# Access services
# - Application: http://localhost
# - Grafana: http://localhost:3000 (admin/admin)
# - Prometheus: http://localhost:9090
```

## Cloud Deployment

### 1. Render.com Deployment

#### Backend Deployment
```yaml
# render.yaml
services:
  - type: web
    name: bustracking-backend
    env: node
    buildCommand: cd backend && npm install && npm run build
    startCommand: cd backend && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: bustracking-db
          property: connectionString
```

#### Frontend Deployment
```yaml
  - type: web
    name: bustracking-frontend
    env: static
    buildCommand: cd frontend && npm install && npm run build
    publishPath: frontend/dist
    envVars:
      - key: VITE_API_URL
        value: https://bustracking-backend.onrender.com
```

### 2. Vercel Deployment

#### Frontend
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy frontend
cd frontend
vercel --prod
```

#### Backend (Vercel Functions)
```bash
# Deploy backend as serverless functions
cd backend
vercel --prod
```

### 3. AWS Deployment

#### Using AWS App Runner
```yaml
# apprunner.yaml
version: 1.0
runtime: nodejs18
build:
  commands:
    build:
      - cd backend
      - npm install
      - npm run build
run:
  runtime-version: 18
  command: npm start
  network:
    port: 3001
    env: PORT
  env:
    - name: NODE_ENV
      value: production
```

#### Using AWS ECS
```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name bustracking

# Create task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create service
aws ecs create-service --cluster bustracking --service-name bustracking-service --task-definition bustracking:1 --desired-count 2
```

### 4. Google Cloud Platform

#### Using Cloud Run
```bash
# Build and push to Container Registry
gcloud builds submit --tag gcr.io/PROJECT-ID/bustracking-backend
gcloud builds submit --tag gcr.io/PROJECT-ID/bustracking-frontend

# Deploy to Cloud Run
gcloud run deploy bustracking-backend --image gcr.io/PROJECT-ID/bustracking-backend --platform managed --region us-central1
gcloud run deploy bustracking-frontend --image gcr.io/PROJECT-ID/bustracking-frontend --platform managed --region us-central1
```

## Monitoring and Maintenance

### 1. Health Checks
```bash
# Backend health
curl http://localhost:3001/health

# Frontend health
curl http://localhost:5173/health

# Database health
psql -d bustracking -c "SELECT 1"
```

### 2. Log Monitoring
```bash
# PM2 logs
pm2 logs bustracking-backend
pm2 logs bustracking-frontend

# Docker logs
docker logs bustracking-backend
docker logs bustracking-frontend
```

### 3. Performance Monitoring
```bash
# Install monitoring tools
npm install -g clinic

# Analyze performance
clinic doctor -- node dist/server.js
clinic flame -- node dist/server.js
```

### 4. Database Maintenance
```sql
-- Check database size
SELECT pg_size_pretty(pg_database_size('bustracking'));

-- Analyze tables
ANALYZE;

-- Vacuum database
VACUUM ANALYZE;
```

### 5. Backup Strategy
```bash
# Database backup
pg_dump bustracking > backup_$(date +%Y%m%d_%H%M%S).sql

# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump bustracking > /backups/bustracking_$DATE.sql
find /backups -name "bustracking_*.sql" -mtime +7 -delete
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check database connectivity
psql -h localhost -U postgres -d bustracking

# Reset database
dropdb bustracking
createdb bustracking
```

#### 2. Port Conflicts
```bash
# Check port usage
netstat -tulpn | grep :3001
netstat -tulpn | grep :5173

# Kill processes on ports
sudo fuser -k 3001/tcp
sudo fuser -k 5173/tcp
```

#### 3. Build Issues
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node.js version
node --version
npm --version
```

#### 4. Docker Issues
```bash
# Clean Docker system
docker system prune -a

# Rebuild containers
docker-compose down
docker-compose up --build
```

### Performance Issues

#### 1. High Memory Usage
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head

# Optimize Node.js memory
export NODE_OPTIONS="--max-old-space-size=4096"
```

#### 2. Slow Database Queries
```sql
-- Enable query logging
ALTER SYSTEM SET log_statement = 'all';
SELECT pg_reload_conf();

-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

## Security Considerations

### 1. Environment Security
```bash
# Secure environment files
chmod 600 .env
chmod 600 .env.production

# Use secrets management
# AWS Secrets Manager
# Azure Key Vault
# HashiCorp Vault
```

### 2. Database Security
```sql
-- Create application user
CREATE USER bustracking_app WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE bustracking TO bustracking_app;
GRANT USAGE ON SCHEMA public TO bustracking_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bustracking_app;
```

### 3. Network Security
```bash
# Configure firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Use SSL/TLS certificates
# Let's Encrypt
certbot --nginx -d your-domain.com
```

### 4. Application Security
```bash
# Regular security updates
npm audit
npm audit fix

# Dependency scanning
npm install -g snyk
snyk test
snyk monitor
```

## Deployment Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] SSL certificates installed
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Monitoring setup
- [ ] Backup strategy implemented

### Post-Deployment
- [ ] Health checks passing
- [ ] All services running
- [ ] Database connectivity verified
- [ ] API endpoints responding
- [ ] Frontend loading correctly
- [ ] WebSocket connections working
- [ ] Monitoring dashboards active
- [ ] Backup verification

### Maintenance
- [ ] Regular security updates
- [ ] Database optimization
- [ ] Log rotation configured
- [ ] Performance monitoring
- [ ] Backup verification
- [ ] Disaster recovery testing

---

*Last updated: January 2024*
*Version: 1.0.0*
