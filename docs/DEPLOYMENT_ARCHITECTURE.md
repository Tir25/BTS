# Deployment Architecture

## Overview

This document provides detailed deployment architecture diagrams for the University Bus Tracking System, covering development, staging, and production environments with various deployment options.

## 1. Development Environment Architecture

```mermaid
graph TB
    subgraph "Developer Machine"
        subgraph "Frontend Development"
            A[Vite Dev Server<br/>Port 5173]
            B[React App]
            C[Hot Reload]
        end
        
        subgraph "Backend Development"
            D[Node.js Dev Server<br/>Port 3001]
            E[TypeScript Compiler]
            F[ts-node-dev]
        end
        
        subgraph "Local Database"
            G[PostgreSQL<br/>Port 5432]
            H[PostGIS Extension]
        end
        
        subgraph "Development Tools"
            I[ESLint]
            J[Prettier]
            K[TypeScript]
        end
    end
    
    subgraph "External Services"
        L[Supabase Project<br/>Development]
        M[Supabase Auth]
        N[Supabase Storage]
        O[Supabase Realtime]
    end
    
    A --> B
    B --> C
    D --> E
    E --> F
    F --> G
    G --> H
    
    B --> L
    D --> L
    L --> M
    L --> N
    L --> O
    
    I --> B
    J --> B
    K --> B
    I --> D
    J --> D
    K --> D
```

## 2. Staging Environment Architecture

```mermaid
graph TB
    subgraph "Staging Server"
        subgraph "Load Balancer"
            A[Nginx<br/>Port 80/443]
        end
        
        subgraph "Application Layer"
            B[PM2 Process Manager]
            C[Node.js Backend<br/>Port 3001]
            D[React Frontend<br/>Built Files]
        end
        
        subgraph "Database"
            E[PostgreSQL<br/>Port 5432]
            F[PostGIS Extension]
        end
        
        subgraph "Monitoring"
            G[PM2 Monitoring]
            H[Application Logs]
            I[Error Tracking]
        end
    end
    
    subgraph "External Services"
        J[Supabase Project<br/>Staging]
        K[Supabase Auth]
        L[Supabase Storage]
        M[Supabase Realtime]
    end
    
    subgraph "CI/CD Pipeline"
        N[GitHub Actions]
        O[Build Process]
        P[Deploy to Staging]
    end
    
    A --> B
    B --> C
    B --> D
    C --> E
    E --> F
    
    C --> J
    D --> J
    J --> K
    J --> L
    J --> M
    
    N --> O
    O --> P
    P --> A
    
    G --> C
    H --> C
    I --> C
```

## 3. Production Environment Architecture

```mermaid
graph TB
    subgraph "Production Infrastructure"
        subgraph "Load Balancer Layer"
            A[Nginx Load Balancer<br/>SSL Termination]
            B[Rate Limiting]
            C[Security Headers]
        end
        
        subgraph "Application Servers"
            D[Server 1<br/>Node.js Backend]
            E[Server 2<br/>Node.js Backend]
            F[Server 3<br/>Node.js Backend]
        end
        
        subgraph "Frontend CDN"
            G[Vercel/Cloudflare<br/>Static Assets]
            H[Global Distribution]
        end
        
        subgraph "Database Cluster"
            I[Primary PostgreSQL<br/>Master]
            J[Secondary PostgreSQL<br/>Replica]
            K[PostGIS Extension]
        end
        
        subgraph "Caching Layer"
            L[Redis Cache<br/>Session Storage]
            M[Application Cache]
        end
        
        subgraph "Monitoring & Logging"
            N[PM2 Process Manager]
            O[Application Monitoring]
            P[Error Tracking]
            Q[Performance Monitoring]
        end
    end
    
    subgraph "External Services"
        R[Supabase Production]
        S[Supabase Auth]
        T[Supabase Storage]
        U[Supabase Realtime]
    end
    
    subgraph "Backup & Recovery"
        V[Automated Backups]
        W[Disaster Recovery]
        X[Data Retention]
    end
    
    A --> D
    A --> E
    A --> F
    B --> A
    C --> A
    
    D --> I
    E --> I
    F --> I
    I --> J
    I --> K
    
    D --> L
    E --> L
    F --> L
    L --> M
    
    G --> H
    H --> A
    
    D --> R
    E --> R
    F --> R
    R --> S
    R --> T
    R --> U
    
    N --> D
    N --> E
    N --> F
    O --> D
    O --> E
    O --> F
    P --> D
    P --> E
    P --> F
    Q --> D
    Q --> E
    Q --> F
    
    I --> V
    V --> W
    W --> X
```

## 4. Docker Deployment Architecture

```mermaid
graph TB
    subgraph "Docker Environment"
        subgraph "Docker Compose"
            A[docker-compose.yml]
        end
        
        subgraph "Frontend Container"
            B[nginx:alpine<br/>Port 80]
            C[React Build Files]
        end
        
        subgraph "Backend Container"
            D[node:18-alpine<br/>Port 3001]
            E[Express App]
            F[TypeScript]
        end
        
        subgraph "Database Container"
            G[postgis/postgis:14<br/>Port 5432]
            H[PostgreSQL]
            I[PostGIS Extension]
        end
        
        subgraph "Cache Container"
            J[redis:7-alpine<br/>Port 6379]
            K[Redis Cache]
        end
        
        subgraph "Volume Mounts"
            L[PostgreSQL Data]
            M[Application Logs]
            N[Upload Files]
        end
    end
    
    subgraph "External Services"
        O[Supabase Project]
        P[Supabase Auth]
        Q[Supabase Storage]
        R[Supabase Realtime]
    end
    
    A --> B
    A --> D
    A --> G
    A --> J
    
    B --> C
    D --> E
    E --> F
    G --> H
    H --> I
    J --> K
    
    G --> L
    D --> M
    E --> N
    
    D --> O
    E --> O
    O --> P
    O --> Q
    O --> R
```

## 5. Cloud Platform Deployment

### 5.1 Vercel + Railway Deployment

```mermaid
graph TB
    subgraph "Vercel (Frontend)"
        A[Vercel Platform]
        B[React App Build]
        C[Global CDN]
        D[Edge Functions]
    end
    
    subgraph "Railway (Backend)"
        E[Railway Platform]
        F[Node.js Backend]
        G[PostgreSQL Database]
        H[Redis Cache]
    end
    
    subgraph "External Services"
        I[Supabase Project]
        J[Supabase Auth]
        K[Supabase Storage]
        L[Supabase Realtime]
    end
    
    subgraph "CI/CD Pipeline"
        M[GitHub Repository]
        N[GitHub Actions]
        O[Auto Deploy]
    end
    
    A --> B
    B --> C
    C --> D
    
    E --> F
    E --> G
    E --> H
    
    F --> I
    G --> I
    I --> J
    I --> K
    I --> L
    
    M --> N
    N --> O
    O --> A
    O --> E
```

### 5.2 AWS Deployment Architecture

```mermaid
graph TB
    subgraph "AWS Infrastructure"
        subgraph "Load Balancer"
            A[Application Load Balancer<br/>ALB]
            B[Target Groups]
            C[Health Checks]
        end
        
        subgraph "Compute Layer"
            D[EC2 Instance 1<br/>t3.medium]
            E[EC2 Instance 2<br/>t3.medium]
            F[EC2 Instance 3<br/>t3.medium]
        end
        
        subgraph "Database Layer"
            G[RDS PostgreSQL<br/>db.t3.micro]
            H[PostGIS Extension]
            I[Multi-AZ Deployment]
        end
        
        subgraph "Storage Layer"
            J[S3 Bucket<br/>Static Assets]
            K[CloudFront CDN]
            L[Route 53 DNS]
        end
        
        subgraph "Caching Layer"
            M[ElastiCache Redis<br/>Cache Layer]
        end
        
        subgraph "Monitoring"
            N[CloudWatch<br/>Monitoring]
            O[CloudWatch Logs]
            P[CloudWatch Alarms]
        end
    end
    
    subgraph "External Services"
        Q[Supabase Project]
        R[Supabase Auth]
        S[Supabase Storage]
        T[Supabase Realtime]
    end
    
    A --> B
    B --> D
    B --> E
    B --> F
    C --> D
    C --> E
    C --> F
    
    D --> G
    E --> G
    F --> G
    G --> H
    G --> I
    
    D --> J
    E --> J
    F --> J
    J --> K
    K --> L
    
    D --> M
    E --> M
    F --> M
    
    D --> Q
    E --> Q
    F --> Q
    Q --> R
    Q --> S
    Q --> T
    
    N --> D
    N --> E
    N --> F
    O --> D
    O --> E
    O --> F
    P --> D
    P --> E
    P --> F
```

## 6. Microservices Architecture (Future)

```mermaid
graph TB
    subgraph "API Gateway"
        A[Kong/Nginx<br/>API Gateway]
        B[Rate Limiting]
        C[Authentication]
        D[Request Routing]
    end
    
    subgraph "Microservices"
        E[User Service<br/>Port 3001]
        F[Bus Service<br/>Port 3002]
        G[Location Service<br/>Port 3003]
        H[Route Service<br/>Port 3004]
        I[Notification Service<br/>Port 3005]
        J[Analytics Service<br/>Port 3006]
    end
    
    subgraph "Database Layer"
        K[User Database<br/>PostgreSQL]
        L[Bus Database<br/>PostgreSQL]
        M[Location Database<br/>PostgreSQL]
        N[Route Database<br/>PostgreSQL]
    end
    
    subgraph "Message Queue"
        O[Redis/RabbitMQ<br/>Message Broker]
        P[Event Bus]
    end
    
    subgraph "External Services"
        Q[Supabase Auth]
        R[Supabase Storage]
        S[Supabase Realtime]
    end
    
    A --> B
    A --> C
    A --> D
    
    D --> E
    D --> F
    D --> G
    D --> H
    D --> I
    D --> J
    
    E --> K
    F --> L
    G --> M
    H --> N
    
    E --> O
    F --> O
    G --> O
    H --> O
    I --> O
    J --> O
    
    O --> P
    
    E --> Q
    F --> R
    G --> S
    H --> R
    I --> S
    J --> R
```

## 7. Security Architecture

```mermaid
graph TB
    subgraph "Security Layers"
        subgraph "Network Security"
            A[Firewall<br/>UFW/iptables]
            B[VPN Access]
            C[SSH Key Authentication]
        end
        
        subgraph "Application Security"
            D[HTTPS/SSL<br/>Let's Encrypt]
            E[JWT Authentication]
            F[Role-Based Access Control]
            G[Input Validation]
        end
        
        subgraph "Database Security"
            H[Database Encryption]
            I[Connection Encryption]
            J[Row-Level Security]
        end
        
        subgraph "Monitoring & Alerting"
            K[Fail2ban<br/>Intrusion Detection]
            L[Security Logs]
            M[Alert System]
        end
    end
    
    subgraph "External Security"
        N[Supabase Security]
        O[API Rate Limiting]
        P[CORS Configuration]
    end
    
    A --> B
    B --> C
    
    D --> E
    E --> F
    F --> G
    
    H --> I
    I --> J
    
    K --> L
    L --> M
    
    N --> O
    O --> P
```

## 8. Scaling Architecture

```mermaid
graph TB
    subgraph "Horizontal Scaling"
        subgraph "Load Balancer"
            A[Nginx Load Balancer]
            B[Health Checks]
            C[Session Sticky]
        end
        
        subgraph "Application Instances"
            D[Instance 1<br/>Node.js]
            E[Instance 2<br/>Node.js]
            F[Instance 3<br/>Node.js]
            G[Instance N<br/>Node.js]
        end
        
        subgraph "Database Scaling"
            H[Primary DB<br/>Master]
            I[Replica 1<br/>Read]
            J[Replica 2<br/>Read]
            K[Connection Pooling]
        end
        
        subgraph "Caching Strategy"
            L[Redis Cluster]
            M[CDN Cache]
            N[Application Cache]
        end
    end
    
    subgraph "Auto Scaling"
        O[Auto Scaling Group]
        P[CPU/Memory Monitoring]
        Q[Scale Up/Down Rules]
    end
    
    A --> B
    A --> C
    A --> D
    A --> E
    A --> F
    A --> G
    
    D --> H
    E --> H
    F --> H
    G --> H
    
    H --> I
    H --> J
    H --> K
    
    D --> L
    E --> L
    F --> L
    G --> L
    
    L --> M
    M --> N
    
    O --> D
    O --> E
    O --> F
    O --> G
    
    P --> O
    Q --> O
```

## Deployment Configuration Files

### Docker Compose Configuration

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend
    environment:
      - VITE_API_URL=http://backend:3001
      - VITE_SUPABASE_URL=${SUPABASE_URL}
      - VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}

  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    ports:
      - "3001:3001"
    depends_on:
      - db
      - redis
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@db:5432/bus_tracking
      - REDIS_URL=redis://redis:6379
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - JWT_SECRET=${JWT_SECRET}

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

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Nginx Configuration

```nginx
# Main server configuration
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
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

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
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
```

This deployment architecture provides comprehensive coverage of different deployment scenarios, from simple development setups to complex production environments with high availability and scalability.
