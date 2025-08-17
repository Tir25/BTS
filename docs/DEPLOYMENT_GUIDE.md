# Deployment Guide

This guide covers deploying the University Bus Tracking System to various environments, from development to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Development Environment](#development-environment)
3. [Staging Environment](#staging-environment)
4. [Production Environment](#production-environment)
5. [Docker Deployment](#docker-deployment)
6. [Cloud Platform Deployment](#cloud-platform-deployment)
7. [SSL/HTTPS Setup](#sslhttps-setup)
8. [Monitoring and Logging](#monitoring-and-logging)
9. [Backup and Recovery](#backup-and-recovery)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Node.js**: 18.x or higher
- **PostgreSQL**: 14.x or higher with PostGIS extension
- **Redis**: 6.x or higher (optional, for session storage)
- **Nginx**: 1.18+ (for reverse proxy)
- **SSL Certificate**: For HTTPS in production

### Software Installation

#### Ubuntu/Debian
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib postgis -y

# Install Nginx
sudo apt install nginx -y

# Install Redis (optional)
sudo apt install redis-server -y
```

#### CentOS/RHEL
```bash
# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install PostgreSQL
sudo yum install postgresql-server postgresql-contrib postgis -y
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Install Nginx
sudo yum install nginx -y
```

#### Windows
- Download and install Node.js from [nodejs.org](https://nodejs.org/)
- Download and install PostgreSQL from [postgresql.org](https://www.postgresql.org/)
- Download and install Nginx from [nginx.org](http://nginx.org/)

## Development Environment

### Local Setup

1. **Clone Repository**
```bash
git clone <repository-url>
cd university-bus-tracking-system
```

2. **Install Dependencies**
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

3. **Environment Configuration**
```bash
# Backend
cp backend/env.example backend/env.local
# Edit backend/env.local with your configuration

# Frontend
cp frontend/env.example frontend/env.local
# Edit frontend/env.local with your configuration
```

4. **Database Setup**
```bash
# Create database
createdb bus_tracking_system

# Run migrations
cd sql
psql -d bus_tracking_system -f init-database-supabase.sql

# Add sample data
cd ../backend
node add-sample-buses.js
```

5. **Start Development Servers**
```bash
# Start both frontend and backend
npm run dev

# Or start individually
npm run dev:backend  # Backend on port 3001
npm run dev:frontend # Frontend on port 5173
```

## Staging Environment

### Setup Staging Server

1. **Server Preparation**
```bash
# Create staging user
sudo adduser staging
sudo usermod -aG sudo staging

# Switch to staging user
su - staging
```

2. **Application Setup**
```bash
# Clone repository
git clone <repository-url> /home/staging/bus-tracking-staging
cd /home/staging/bus-tracking-staging

# Install dependencies
npm install
cd backend && npm install
cd ../frontend && npm install
```

3. **Environment Configuration**
```bash
# Create staging environment files
cp backend/env.example backend/env.staging
cp frontend/env.example frontend/env.staging

# Configure staging environment variables
nano backend/env.staging
nano frontend/env.staging
```

4. **Build Application**
```bash
# Build both frontend and backend
npm run build

# Or build individually
npm run build:backend
npm run build:frontend
```

5. **Process Management with PM2**
```bash
# Install PM2
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'bus-tracking-backend-staging',
      script: './backend/dist/server.js',
      env: {
        NODE_ENV: 'staging',
        PORT: 3001
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    }
  ]
};
EOF

# Start application
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Production Environment

### Server Setup

1. **Security Hardening**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Configure firewall
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# Install fail2ban
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
```

2. **Database Setup**
```bash
# Create production database
sudo -u postgres createdb bus_tracking_production

# Create application user
sudo -u postgres createuser bus_tracking_app
sudo -u postgres psql -c "ALTER USER bus_tracking_app WITH PASSWORD 'secure_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE bus_tracking_production TO bus_tracking_app;"

# Enable PostGIS
sudo -u postgres psql -d bus_tracking_production -c "CREATE EXTENSION postgis;"
```

3. **Application Deployment**
```bash
# Create application directory
sudo mkdir -p /var/www/bus-tracking
sudo chown $USER:$USER /var/www/bus-tracking

# Clone repository
git clone <repository-url> /var/www/bus-tracking
cd /var/www/bus-tracking

# Install dependencies
npm install --production
cd backend && npm install --production
cd ../frontend && npm install --production

# Build application
npm run build
```

4. **Environment Configuration**
```bash
# Create production environment files
cp backend/env.example backend/env.production
cp frontend/env.example frontend/env.production

# Configure production environment
nano backend/env.production
nano frontend/env.production
```

5. **Process Management**
```bash
# Install PM2
npm install -g pm2

# Create production PM2 configuration
cat > ecosystem.production.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'bus-tracking-backend',
      script: './backend/dist/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/var/log/bus-tracking/err.log',
      out_file: '/var/log/bus-tracking/out.log',
      log_file: '/var/log/bus-tracking/combined.log',
      time: true
    }
  ]
};
EOF

# Create log directory
sudo mkdir -p /var/log/bus-tracking
sudo chown $USER:$USER /var/log/bus-tracking

# Start application
pm2 start ecosystem.production.config.js
pm2 save
pm2 startup
```

### Nginx Configuration

1. **Create Nginx Configuration**
```bash
sudo nano /etc/nginx/sites-available/bus-tracking
```

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Frontend
    location / {
        root /var/www/bus-tracking/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
    }

    # WebSocket
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3001/health;
        access_log off;
    }
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
```

2. **Enable Site**
```bash
sudo ln -s /etc/nginx/sites-available/bus-tracking /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Docker Deployment

### Dockerfile

1. **Backend Dockerfile**
```dockerfile
# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm ci --only=production
RUN cd backend && npm ci --only=production

# Copy source code
COPY backend/ ./backend/

# Build application
RUN cd backend && npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3001

CMD ["node", "backend/dist/server.js"]
```

2. **Frontend Dockerfile**
```dockerfile
# frontend/Dockerfile
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm ci
RUN cd frontend && npm ci

# Copy source code
COPY frontend/ ./frontend/

# Build application
RUN cd frontend && npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

3. **Docker Compose**
```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@db:5432/bus_tracking
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - JWT_SECRET=${JWT_SECRET}
    ports:
      - "3001:3001"
    depends_on:
      - db
    restart: unless-stopped

  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

  db:
    image: postgis/postgis:14-3.2
    environment:
      - POSTGRES_DB=bus_tracking
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./sql:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped

volumes:
  postgres_data:
```

4. **Deploy with Docker**
```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Cloud Platform Deployment

### Vercel (Frontend)

1. **Install Vercel CLI**
```bash
npm install -g vercel
```

2. **Deploy Frontend**
```bash
cd frontend
vercel --prod
```

3. **Configure Environment Variables**
```bash
vercel env add VITE_API_URL
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

### Railway (Backend)

1. **Install Railway CLI**
```bash
npm install -g @railway/cli
```

2. **Deploy Backend**
```bash
cd backend
railway login
railway init
railway up
```

3. **Configure Environment Variables**
```bash
railway variables set NODE_ENV=production
railway variables set DATABASE_URL=your_database_url
railway variables set SUPABASE_URL=your_supabase_url
```

### Heroku

1. **Install Heroku CLI**
```bash
# Ubuntu/Debian
sudo snap install heroku --classic

# macOS
brew tap heroku/brew && brew install heroku
```

2. **Deploy Backend**
```bash
cd backend
heroku create your-app-name
heroku addons:create heroku-postgresql:hobby-dev
heroku config:set NODE_ENV=production
git push heroku main
```

3. **Deploy Frontend**
```bash
cd frontend
heroku create your-frontend-app
heroku buildpacks:set mars/create-react-app
git push heroku main
```

## SSL/HTTPS Setup

### Let's Encrypt (Free SSL)

1. **Install Certbot**
```bash
sudo apt install certbot python3-certbot-nginx -y
```

2. **Obtain SSL Certificate**
```bash
sudo certbot --nginx -d your-domain.com
```

3. **Auto-renewal**
```bash
sudo crontab -e
# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet
```

### Custom SSL Certificate

1. **Upload Certificate Files**
```bash
sudo mkdir -p /etc/ssl/private
sudo cp your-certificate.crt /etc/ssl/certs/
sudo cp your-private-key.key /etc/ssl/private/
```

2. **Update Nginx Configuration**
```nginx
ssl_certificate /etc/ssl/certs/your-certificate.crt;
ssl_certificate_key /etc/ssl/private/your-private-key.key;
```

## Monitoring and Logging

### Application Monitoring

1. **PM2 Monitoring**
```bash
# Monitor application
pm2 monit

# View logs
pm2 logs

# Monitor system resources
pm2 status
```

2. **Nginx Logs**
```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log
```

3. **Database Monitoring**
```bash
# Connect to database
sudo -u postgres psql

# Check active connections
SELECT * FROM pg_stat_activity;

# Check database size
SELECT pg_size_pretty(pg_database_size('bus_tracking_production'));
```

### Log Rotation

1. **Configure Logrotate**
```bash
sudo nano /etc/logrotate.d/bus-tracking
```

```
/var/log/bus-tracking/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reloadLogs
    endscript
}
```

## Backup and Recovery

### Database Backup

1. **Automated Backup Script**
```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/var/backups/bus-tracking"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="bus_tracking_production"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create database backup
pg_dump -h localhost -U postgres $DB_NAME > $BACKUP_DIR/db_backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/db_backup_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: db_backup_$DATE.sql.gz"
```

2. **Setup Cron Job**
```bash
sudo crontab -e
# Add this line for daily backup at 2 AM:
0 2 * * * /path/to/backup.sh
```

### Application Backup

1. **Backup Application Files**
```bash
#!/bin/bash
# app_backup.sh

BACKUP_DIR="/var/backups/bus-tracking"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/var/www/bus-tracking"

# Create backup
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz -C $APP_DIR .

# Keep only last 7 days of backups
find $BACKUP_DIR -name "app_backup_*.tar.gz" -mtime +7 -delete
```

### Recovery Procedures

1. **Database Recovery**
```bash
# Restore database
psql -h localhost -U postgres bus_tracking_production < backup_file.sql
```

2. **Application Recovery**
```bash
# Restore application files
tar -xzf backup_file.tar.gz -C /var/www/bus-tracking/

# Restart application
pm2 restart all
```

## Troubleshooting

### Common Issues

1. **Application Won't Start**
```bash
# Check logs
pm2 logs

# Check environment variables
pm2 env 0

# Restart application
pm2 restart all
```

2. **Database Connection Issues**
```bash
# Test database connection
psql -h localhost -U postgres -d bus_tracking_production

# Check PostgreSQL status
sudo systemctl status postgresql

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

3. **Nginx Issues**
```bash
# Test configuration
sudo nginx -t

# Check Nginx status
sudo systemctl status nginx

# Reload configuration
sudo systemctl reload nginx
```

4. **SSL Certificate Issues**
```bash
# Check certificate validity
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Check certificate expiration
openssl x509 -in /etc/letsencrypt/live/your-domain.com/cert.pem -text -noout
```

### Performance Optimization

1. **Database Optimization**
```sql
-- Analyze tables
ANALYZE;

-- Check slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

2. **Application Optimization**
```bash
# Monitor memory usage
pm2 monit

# Check for memory leaks
node --inspect backend/dist/server.js
```

3. **Nginx Optimization**
```nginx
# Enable gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
```

### Security Checklist

- [ ] Firewall configured (UFW)
- [ ] SSL certificate installed
- [ ] Database user permissions restricted
- [ ] Environment variables secured
- [ ] Regular security updates
- [ ] Fail2ban configured
- [ ] Log monitoring enabled
- [ ] Backup procedures tested
- [ ] Rate limiting configured
- [ ] CORS properly configured

## Support

For deployment issues:
1. Check the logs: `pm2 logs` and `sudo journalctl -u nginx`
2. Verify environment variables
3. Test database connectivity
4. Check firewall settings
5. Review SSL certificate status

For additional help, refer to:
- [Nginx Documentation](https://nginx.org/en/docs/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
