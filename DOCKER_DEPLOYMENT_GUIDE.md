# 🐳 Docker Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the University Bus Tracking System using Docker and Docker Compose.

## 📁 File Structure

```
/c:/College Project/
├── Dockerfile                 # Multi-stage Docker build
├── docker-compose.yml         # Docker Compose configuration
├── .dockerignore             # Files to exclude from Docker build
├── nginx.conf                # Nginx reverse proxy configuration
├── frontend/                 # React frontend
├── backend/                  # Node.js backend
└── DOCKER_DEPLOYMENT_GUIDE.md # This file
```

## 🚀 Quick Start

### 1. Prerequisites

- Docker Desktop installed
- Docker Compose installed
- Environment variables configured

### 2. Environment Setup

Create a `.env` file in the root directory:

```bash
# Database Configuration
DATABASE_URL=your_supabase_database_url
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Application Configuration
NODE_ENV=production
PORT=3000
ADMIN_EMAILS=siddharthmali.211@gmail.com,tirthraval27@gmail.com
JWT_SECRET=your_jwt_secret_key
```

### 3. Build and Deploy

```bash
# Build the Docker image
docker-compose build

# Start the services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

## 🔧 Deployment Options

### Option 1: Simple Deployment (Recommended for Development)

```bash
# Build and run without Nginx
docker-compose up bus-tracking-system -d
```

**Access URLs:**
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:3000/api`
- Health Check: `http://localhost:3000/health`

### Option 2: Production Deployment with Nginx

```bash
# Build and run with Nginx reverse proxy
docker-compose up -d
```

**Access URLs:**
- Frontend: `http://localhost`
- Backend API: `http://localhost/api`
- Health Check: `http://localhost/health`

### Option 3: Custom Domain with SSL

1. Update `nginx.conf` with your domain
2. Add SSL certificates to `./ssl/` directory
3. Uncomment HTTPS configuration in `nginx.conf`
4. Deploy:

```bash
docker-compose up -d
```

## 🛠️ Management Commands

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f bus-tracking-system
docker-compose logs -f nginx
```

### Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Restart Services
```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart bus-tracking-system
```

### Update Application
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 🔍 Monitoring and Debugging

### Health Checks
```bash
# Check application health
curl http://localhost:3000/health

# Check detailed health
curl http://localhost:3000/health/detailed
```

### Container Status
```bash
# View running containers
docker ps

# View container resources
docker stats
```

### Access Container Shell
```bash
# Access application container
docker exec -it bus-tracking-system sh

# Access Nginx container
docker exec -it bus-tracking-nginx sh
```

## 🔒 Security Considerations

### Environment Variables
- Never commit `.env` files to version control
- Use Docker secrets for sensitive data in production
- Rotate JWT secrets regularly

### Network Security
- Use custom networks for service isolation
- Implement rate limiting (configured in nginx.conf)
- Enable HTTPS in production

### Container Security
- Run containers as non-root user
- Use multi-stage builds to reduce attack surface
- Keep base images updated

## 📊 Performance Optimization

### Resource Limits
Add to `docker-compose.yml`:

```yaml
services:
  bus-tracking-system:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### Caching
- Frontend assets are cached for 1 year
- API responses can be cached based on requirements
- Database connection pooling is configured

## 🚨 Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Check what's using the port
netstat -tulpn | grep :3000

# Kill the process or change ports in docker-compose.yml
```

#### 2. Build Failures
```bash
# Clean build
docker-compose build --no-cache

# Check Dockerfile syntax
docker build -t test .
```

#### 3. Environment Variables Not Loading
```bash
# Verify .env file exists
ls -la .env

# Check environment variables in container
docker exec bus-tracking-system env
```

#### 4. Database Connection Issues
```bash
# Test database connection
docker exec bus-tracking-system node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT NOW()', (err, res) => {
  console.log(err || res.rows[0]);
  pool.end();
});
"
```

### Log Analysis
```bash
# View application logs
docker-compose logs bus-tracking-system

# View Nginx logs
docker-compose logs nginx

# Follow logs in real-time
docker-compose logs -f --tail=100
```

## 🔄 CI/CD Integration

### GitHub Actions Example
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Build and deploy
        run: |
          docker-compose build
          docker-compose up -d
```

## 📈 Scaling

### Horizontal Scaling
```bash
# Scale backend service
docker-compose up -d --scale bus-tracking-system=3
```

### Load Balancing
Update `nginx.conf` for multiple backend instances:
```nginx
upstream backend {
    server bus-tracking-system:3000;
    server bus-tracking-system:3001;
    server bus-tracking-system:3002;
}
```

## 🎯 Production Checklist

- [ ] Environment variables configured
- [ ] SSL certificates installed (if using HTTPS)
- [ ] Domain configured in nginx.conf
- [ ] Resource limits set
- [ ] Monitoring configured
- [ ] Backup strategy implemented
- [ ] Security headers enabled
- [ ] Rate limiting configured
- [ ] Health checks working
- [ ] Logs being collected

## 📞 Support

For deployment issues:
1. Check the troubleshooting section
2. Review container logs
3. Verify environment configuration
4. Test individual components

---

**Happy Deploying! 🚀**
