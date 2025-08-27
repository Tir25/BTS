# 🚀 Vercel Deployment Guide for Bus Tracking System

## 📋 Overview

This guide provides detailed instructions for deploying your bus tracking system frontend on Vercel. The backend will remain on Render, and the frontend will be deployed on Vercel for optimal performance and global CDN distribution.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (Vercel)      │◄──►│   (Render)      │◄──►│   (Supabase)    │
│                 │    │                 │    │                 │
│ • React App     │    │ • Express API   │    │ • PostgreSQL    │
│ • Real-time UI  │    │ • WebSocket     │    │ • Auth          │
│ • Map Interface │    │ • Location API  │    │ • Storage       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## ✅ Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Your code must be in a GitHub repository
3. **Backend Deployed**: Ensure your backend is running on Render
4. **Supabase Setup**: Database and authentication configured

## 🔧 Pre-Deployment Checklist

### 1. Environment Variables Setup

Create a `.env.local` file in your project root with the following variables:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://gthwmwfwvhyriygpcdlr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aHdtd2Z3dmh5cml5Z3BjZGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NzE0NTUsImV4cCI6MjA3MDU0NzQ1NX0.gY0ghDtKZ9b8XlgE7XtbQsT3efXYOBizGQKPJABGvAI

# Backend API URLs (for production)
VITE_API_URL=https://bus-tracking-backend-sxh8.onrender.com
VITE_WEBSOCKET_URL=wss://bus-tracking-backend-sxh8.onrender.com

# Environment
NODE_ENV=production
```

### 2. Build Configuration

Your `frontend/vite.config.ts` is already optimized for production:

```typescript
export default defineConfig({
  plugins: [react()],
  envDir: path.resolve(__dirname, '..'),
  build: {
    outDir: 'dist',
    sourcemap: true,
    cssCodeSplit: false,
    assetsInlineLimit: 4096,
    minify: 'esbuild',
  },
  // ... other optimizations
});
```

### 3. Package.json Scripts

Your `frontend/package.json` includes optimized build scripts:

```json
{
  "scripts": {
    "build": "tsc && vite build",
    "build:optimized": "tsc && vite build --mode production",
    "predeploy": "npm run build:optimized"
  }
}
```

## 🚀 Deployment Steps

### Step 1: Connect to Vercel

1. **Install Vercel CLI** (optional but recommended):
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

### Step 2: Configure Project

1. **Initialize Vercel** (if using CLI):
   ```bash
   vercel
   ```

2. **Select Configuration**:
   - Framework Preset: `Vite`
   - Root Directory: `./frontend`
   - Build Command: `npm run build:optimized`
   - Output Directory: `dist`
   - Install Command: `npm install`

### Step 3: Set Environment Variables

In your Vercel dashboard or via CLI:

```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_API_URL
vercel env add VITE_WEBSOCKET_URL
```

**Environment Variables to Set:**

| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_SUPABASE_URL` | `https://gthwmwfwvhyriygpcdlr.supabase.co` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Supabase anonymous key |
| `VITE_API_URL` | `https://bus-tracking-backend-sxh8.onrender.com` | Backend API URL |
| `VITE_WEBSOCKET_URL` | `wss://bus-tracking-backend-sxh8.onrender.com` | WebSocket URL |

### Step 4: Deploy

**Option A: Via Vercel Dashboard**
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Configure build settings:
   - Framework Preset: `Vite`
   - Root Directory: `frontend`
   - Build Command: `npm run build:optimized`
   - Output Directory: `dist`
5. Add environment variables
6. Click "Deploy"

**Option B: Via CLI**
```bash
vercel --prod
```

**Option C: Via GitHub Integration**
1. Connect your GitHub repository to Vercel
2. Configure build settings in Vercel dashboard
3. Push to main branch triggers automatic deployment

## 🔍 Post-Deployment Verification

### 1. Check Build Logs

Monitor the build process in Vercel dashboard:
- ✅ TypeScript compilation
- ✅ Vite build process
- ✅ Asset optimization
- ✅ Environment variable injection

### 2. Test Functionality

After deployment, test these features:

- [ ] **Homepage Loading**: Main interface loads correctly
- [ ] **Authentication**: Login/logout works
- [ ] **Real-time Features**: WebSocket connections
- [ ] **Map Integration**: MapLibre GL loads
- [ ] **API Calls**: Backend communication
- [ ] **Responsive Design**: Mobile/desktop compatibility

### 3. Performance Check

Use Vercel Analytics to monitor:
- Page load times
- Core Web Vitals
- Error rates
- User experience metrics

## 🔧 Configuration Files

### vercel.json (Root Directory)

```json
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "frontend/dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "functions": {
    "frontend/dist/**/*.js": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### frontend/vite.config.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  envDir: path.resolve(__dirname, '..'),
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    cssCodeSplit: false,
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/css/i.test(ext)) {
            return `assets/css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
    minify: 'esbuild',
  },
  assetsInclude: ['**/*.svg', '**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.webp'],
});
```

## 🚨 Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Check build logs
   vercel logs
   
   # Local build test
   cd frontend && npm run build:optimized
   ```

2. **Environment Variables Not Loading**
   ```bash
   # Verify environment variables
   vercel env ls
   
   # Redeploy with new env vars
   vercel --prod
   ```

3. **CORS Issues**
   - Ensure backend CORS includes Vercel domains
   - Check WebSocket URL configuration

4. **Map Loading Issues**
   - Verify MapLibre GL assets are included
   - Check network requests in browser dev tools

### Performance Optimization

1. **Bundle Analysis**
   ```bash
   npm run analyze
   ```

2. **Image Optimization**
   - Use WebP format where possible
   - Implement lazy loading for images

3. **Code Splitting**
   - Ensure proper route-based splitting
   - Optimize vendor bundles

## 📊 Monitoring & Analytics

### Vercel Analytics

Enable Vercel Analytics for:
- Real user monitoring
- Performance insights
- Error tracking
- User behavior analysis

### Custom Monitoring

Implement custom monitoring for:
- WebSocket connection status
- API response times
- User authentication flows
- Map interaction metrics

## 🔄 Continuous Deployment

### GitHub Integration

1. Connect GitHub repository to Vercel
2. Configure automatic deployments
3. Set up preview deployments for PRs
4. Configure branch protection rules

### Deployment Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build:optimized
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          working-directory: ./frontend
```

## 🎯 Best Practices

1. **Environment Management**
   - Use different environments for dev/staging/prod
   - Never commit sensitive environment variables
   - Use Vercel's environment variable management

2. **Performance**
   - Optimize bundle size
   - Implement proper caching strategies
   - Use CDN for static assets

3. **Security**
   - Enable security headers
   - Implement proper CORS policies
   - Use HTTPS for all connections

4. **Monitoring**
   - Set up error tracking
   - Monitor performance metrics
   - Track user experience

## 📞 Support

If you encounter issues:

1. **Vercel Documentation**: [vercel.com/docs](https://vercel.com/docs)
2. **Vercel Community**: [github.com/vercel/vercel/discussions](https://github.com/vercel/vercel/discussions)
3. **Project Issues**: Check your GitHub repository issues

---

**Deployment URL**: Your app will be available at `https://your-project-name.vercel.app`

**Custom Domain**: You can add a custom domain in the Vercel dashboard for a professional URL.
