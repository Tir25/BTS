# 🐳 Docker Deployment Guide
## University Bus Tracking System

This guide will help you deploy your backend using Docker with step-by-step instructions.

---

## 📋 **Prerequisites**

### **1. Docker Installation** ✅
- **Windows**: Docker Desktop
- **macOS**: Docker Desktop
- **Linux**: Docker Engine

### **2. Environment Setup** ✅
- Supabase database configured
- Environment variables ready
- Git repository cloned

---

## 🚀 **Quick Start**

### **Step 1: Environment Configuration**
```bash
# Copy environment template
cp backend/env.production .env

# Edit .env file with your actual values
notepad .env  # Windows
nano .env     # Linux/macOS
```

### **Step 2: Deploy Backend**
```bash
# Windows
deploy.bat prod

# Linux/macOS
./deploy.sh prod
```

### **Step 3: Verify Deployment**
```bash
# Check if containers are running
docker ps

# View logs
docker-compose logs -f backend

# Test health endpoint
curl http://localhost:3000/health
```

---

## 🔧 **Detailed Deployment Steps**

### **1. Environment Variables Setup**

Create `.env` file in the root directory:

```env
# Server Configuration
NODE_ENV=production
PORT=3000

# Database Configuration
DATABASE_URL=your_supabase_connection_string
DB_POOL_MAX=50

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# CORS Configuration
CORS_ORIGIN=https://ganpat-bts.netlify.app

# Security Configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging Configuration
LOG_LEVEL=warn
ENABLE_DEBUG_LOGS=false
```

### **2. Docker Build Process**

The Docker build uses a multi-stage approach:

```dockerfile
# Stage 1: Builder
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:18-alpine AS production
# ... production setup
```

### **3. Container Architecture**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Nginx Proxy   │    │   Backend       │
│   (Netlify)     │◄──►│   (Port 80)     │◄──►│   (Port 3000)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 🎯 **Deployment Options**

### **Option 1: Local Development**
```bash
# Deploy development environment
deploy.bat dev          # Windows
./deploy.sh dev         # Linux/macOS

# Features:
# - Hot reload enabled
# - Debug logging
# - Volume mounting for live code changes
```

### **Option 2: Production Deployment**
```bash
# Deploy production environment
deploy.bat prod         # Windows
./deploy.sh prod        # Linux/macOS

# Features:
# - Optimized build
# - Nginx reverse proxy
# - Security headers
# - Rate limiting
```

### **Option 3: Cloud Deployment**

#### **Vercel (Recommended - Free)**
```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy
vercel --prod
```

#### **Railway ($5/month)**
```bash
# 1. Install Railway CLI
npm i -g @railway/cli

# 2. Login and deploy
railway login
railway up
```

#### **DigitalOcean App Platform ($5/month)**
- Connect GitHub repository
- Select Docker deployment
- Configure environment variables

---

## 🔍 **Monitoring & Maintenance**

### **1. Container Management**
```bash
# View running containers
docker ps

# View container logs
docker-compose logs -f backend

# Stop containers
deploy.bat stop

# Restart containers
docker-compose restart backend
```

### **2. Health Monitoring**
```bash
# Health check endpoint
curl http://localhost:3000/health

# Detailed health check
curl http://localhost:3000/health/detailed
```

### **3. Resource Management**
```bash
# View resource usage
docker stats

# Clean up unused resources
deploy.bat cleanup
```

---

## 🛠️ **Troubleshooting**

### **Common Issues**

#### **1. Port Already in Use**
```bash
# Check what's using port 3000
netstat -ano | findstr :3000    # Windows
lsof -i :3000                   # Linux/macOS

# Kill process or change port in docker-compose.yml
```

#### **2. Environment Variables Missing**
```bash
# Check if .env file exists
ls -la .env

# Verify environment variables are loaded
docker-compose config
```

#### **3. Database Connection Issues**
```bash
# Check database connectivity
docker-compose logs backend | grep -i database

# Verify Supabase credentials
curl -H "apikey: YOUR_ANON_KEY" \
     https://your-project.supabase.co/rest/v1/
```

#### **4. CORS Issues**
```bash
# Check CORS configuration
docker-compose logs backend | grep -i cors

# Update CORS_ORIGIN in .env file
CORS_ORIGIN=https://ganpat-bts.netlify.app,http://localhost:5173
```

---

## 🔒 **Security Considerations**

### **1. Environment Variables**
- ✅ Never commit `.env` files to Git
- ✅ Use strong, unique API keys
- ✅ Rotate keys regularly

### **2. Container Security**
- ✅ Run containers as non-root user
- ✅ Use multi-stage builds
- ✅ Keep base images updated

### **3. Network Security**
- ✅ Use internal Docker networks
- ✅ Implement rate limiting
- ✅ Add security headers

---

## 📊 **Performance Optimization**

### **1. Container Optimization**
```dockerfile
# Use Alpine Linux for smaller images
FROM node:18-alpine

# Multi-stage builds
# Copy only production dependencies
# Use .dockerignore to exclude unnecessary files
```

### **2. Resource Limits**
```yaml
# docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
```

### **3. Caching Strategy**
```dockerfile
# Layer caching for faster builds
COPY package*.json ./
RUN npm ci --only=production
COPY . .
```

---

## 🚀 **Scaling Considerations**

### **1. Horizontal Scaling**
```bash
# Scale backend service
docker-compose up --scale backend=3 -d
```

### **2. Load Balancing**
```nginx
# nginx.conf
upstream backend {
    server backend:3000;
    server backend:3001;
    server backend:3002;
}
```

### **3. Database Scaling**
- Consider Supabase Pro plan for higher limits
- Implement connection pooling
- Use read replicas if needed

---

## 📝 **Deployment Checklist**

### **Pre-Deployment** ✅
- [ ] Docker installed and running
- [ ] Environment variables configured
- [ ] Supabase database ready
- [ ] Frontend deployed to Netlify
- [ ] CORS origins updated

### **Deployment** ✅
- [ ] Build Docker image
- [ ] Start containers
- [ ] Verify health checks
- [ ] Test API endpoints
- [ ] Check WebSocket connections

### **Post-Deployment** ✅
- [ ] Monitor logs
- [ ] Test all features
- [ ] Update frontend API URLs
- [ ] Configure monitoring
- [ ] Set up backups

---

## 🎯 **Next Steps**

1. **Deploy to Cloud Platform**
   - Choose Vercel (free) or Railway ($5/month)
   - Configure custom domain
   - Set up SSL certificates

2. **Monitoring Setup**
   - Implement logging aggregation
   - Set up alerting
   - Monitor performance metrics

3. **CI/CD Pipeline**
   - Automate deployments
   - Add testing
   - Implement rollback strategy

---

## 📞 **Support**

If you encounter issues:

1. **Check logs**: `docker-compose logs -f backend`
2. **Verify configuration**: `docker-compose config`
3. **Test connectivity**: `curl http://localhost:3000/health`
4. **Review this guide** for troubleshooting steps

**Happy Deploying! 🚀**
