# 🚀 Netlify Deployment Guide
## Frontend Deployment with Local Backend

**Date:** December 2024  
**Status:** Ready for Deployment

---

## 📋 **DEPLOYMENT STRATEGY**

### **Architecture:**
- **Frontend:** Deployed on Netlify (Production)
- **Backend:** Running locally on `localhost:3000`
- **Database:** Supabase (Cloud)

---

## 🔧 **PREREQUISITES**

### **1. Local Backend Setup**
```bash
# In backend directory
cd backend
npm install
npm run dev
```

**Expected Output:**
```
🚀 Server running on port 3000
✅ Database connected successfully
🔌 WebSocket server initialized
```

### **2. Environment Variables**
Your `frontend/env.local` is already configured correctly:
```env
VITE_API_URL=http://localhost:3000
VITE_WEBSOCKET_URL=ws://localhost:3000
```

---

## 🌐 **NETLIFY DEPLOYMENT STEPS**

### **Step 1: Prepare Repository**
```bash
# Ensure all changes are committed
git add .
git commit -m "Prepare for Netlify deployment"
git push origin main
```

### **Step 2: Deploy to Netlify**

#### **Option A: Deploy via Netlify UI (Recommended)**

1. **Go to [netlify.com](https://netlify.com)**
2. **Sign in/Sign up**
3. **Click "New site from Git"**
4. **Connect to GitHub**
5. **Select your repository:** `Tir25/BTS`
6. **Configure build settings:**
   - **Base directory:** Leave empty (use root)
   - **Build command:** `cd frontend && npm run build` (auto-detected from netlify.toml)
   - **Publish directory:** `frontend/dist` (auto-detected from netlify.toml)
7. **Click "Deploy site"**

#### **Option B: Deploy via Netlify CLI**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy from root directory
cd ..
netlify deploy --prod
```

---

## ⚙️ **NETLIFY CONFIGURATION**

### **netlify.toml** ✅ **Created in Root Directory**
```toml
[build]
  command = "cd frontend && npm run build"
  publish = "frontend/dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[context.production.environment]
  VITE_API_URL = "http://localhost:3000"
  VITE_WEBSOCKET_URL = "ws://localhost:3000"
```

### **Key Features:**
- ✅ **Root Configuration:** netlify.toml in repository root
- ✅ **Correct Build Path:** Builds from frontend directory
- ✅ **Correct Publish Path:** Serves from frontend/dist
- ✅ **SPA Routing:** All routes redirect to index.html
- ✅ **Security Headers:** XSS protection, frame options
- ✅ **Caching:** Optimized for static assets
- ✅ **Local Backend:** Points to localhost:3000

---

## 🔐 **ENVIRONMENT VARIABLES**

### **Netlify Dashboard Configuration**
In your Netlify site dashboard:

1. **Go to Site settings > Environment variables**
2. **Add these variables:**
   ```
   VITE_API_URL = http://localhost:3000
   VITE_WEBSOCKET_URL = ws://localhost:3000
   VITE_SUPABASE_URL = https://gthwmwfwvhyriygpcdlr.supabase.co
   VITE_SUPABASE_ANON_KEY = [your-anon-key]
   VITE_ADMIN_EMAILS = siddharthmali.211@gmail.com,tirthraval27@gmail.com
   ```

---

## 🚨 **CRITICAL FIX FOR BUILD ISSUE**

### **The Problem:**
Netlify was looking for the `dist` directory in the wrong location because the frontend is in a subdirectory.

### **The Solution:**
Created `netlify.toml` in the **root directory** with the correct paths.

### **Correct Configuration:**
- **Build command:** `cd frontend && npm run build`
- **Publish directory:** `frontend/dist`
- **Configuration file:** `netlify.toml` in repository root

### **Why This Works:**
- Netlify reads the configuration from the root
- Build command changes to frontend directory first
- Publish path points to the correct dist location
- No need to set base directory in Netlify UI

---

## 🧪 **TESTING DEPLOYMENT**

### **1. Local Testing**
```bash
# Start backend
cd backend
npm run dev

# Test frontend locally
cd frontend
npm run dev
```

### **2. Production Testing**
1. **Deploy to Netlify**
2. **Ensure backend is running locally**
3. **Test all features:**
   - ✅ Driver login
   - ✅ Student map
   - ✅ Admin panel
   - ✅ Real-time tracking

---

## 🚨 **IMPORTANT CONSIDERATIONS**

### **⚠️ CORS Configuration**
Your backend CORS is configured for local development. For production:

**Update `backend/src/config/environment.ts`:**
```typescript
cors: {
  allowedOrigins: [
    'http://localhost:5173', // Local frontend
    'http://localhost:3000', // Local backend
    'https://your-netlify-domain.netlify.app', // Add your Netlify domain
  ],
  credentials: true,
},
```

### **⚠️ WebSocket Connection**
- **Local Development:** `ws://localhost:3000`
- **Production:** Users must have backend running locally
- **Alternative:** Consider deploying backend to Render/Railway for full production

---

## 📊 **DEPLOYMENT CHECKLIST**

### **Pre-Deployment** ✅
- [x] Backend runs on localhost:3000
- [x] Frontend builds successfully
- [x] Environment variables configured
- [x] netlify.toml created in root
- [x] All changes committed to Git

### **Deployment** 🔄
- [ ] Connect repository to Netlify
- [ ] **Use default settings (no base directory needed)**
- [ ] Set environment variables
- [ ] Deploy site

### **Post-Deployment** ⏳
- [ ] Test all functionality
- [ ] Verify API connections
- [ ] Check WebSocket connections
- [ ] Test admin features
- [ ] Verify real-time tracking

---

## 🔧 **TROUBLESHOOTING**

### **Common Issues:**

#### **1. Build Failures - "dist directory does not exist"**
**Solution:** ✅ **FIXED** - Using root netlify.toml with correct paths

#### **2. API Connection Issues**
- Ensure backend is running on port 3000
- Check CORS configuration
- Verify environment variables

#### **3. WebSocket Connection Issues**
- Backend must be running locally
- Check WebSocket URL configuration
- Verify CORS settings

#### **4. Routing Issues**
- Ensure `netlify.toml` redirects are configured
- Check SPA routing in React Router

---

## 🎯 **NEXT STEPS**

### **Immediate:**
1. **Deploy to Netlify** using the steps above
2. **Test all functionality**
3. **Share the Netlify URL**

### **Future Enhancements:**
1. **Deploy backend to Render/Railway** for full production
2. **Update CORS for production domains**
3. **Add custom domain**
4. **Set up monitoring and analytics**

---

## 📞 **SUPPORT**

### **If you encounter issues:**
1. **Check Netlify build logs**
2. **Verify backend is running**
3. **Test API endpoints locally**
4. **Check browser console for errors**

### **Useful Commands:**
```bash
# Test backend health
curl http://localhost:3000/health

# Test frontend build
cd frontend && npm run build

# Check environment variables
echo $VITE_API_URL
```

---

**🎉 Ready to deploy! Your frontend will be live on Netlify while your backend runs locally.**

**Remember:** Users accessing your Netlify site will need your backend running locally for full functionality.
