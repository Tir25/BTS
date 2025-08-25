# 🔧 NETLIFY ENVIRONMENT CLEANUP GUIDE

## 🚨 **IMMEDIATE ACTION REQUIRED**

The frontend is still using Render backend because of environment variables set in Netlify. We need to clear these.

---

## ✅ **STEP-BY-STEP CLEANUP**

### **Step 1: Access Netlify Dashboard**
1. Go to [netlify.com](https://netlify.com)
2. Sign in to your account
3. Navigate to your site: `gantpat-bts`

### **Step 2: Clear Environment Variables**
1. Go to **Site settings** → **Environment variables**
2. **Delete or update** these variables:

#### **Variables to DELETE or UPDATE:**
- `VITE_API_URL` - **DELETE** this variable
- `VITE_WEBSOCKET_URL` - **DELETE** this variable
- `VITE_BACKEND_URL` - **DELETE** if exists
- `API_URL` - **DELETE** if exists

#### **Variables to KEEP:**
- `VITE_SUPABASE_URL` - Keep this
- `VITE_SUPABASE_ANON_KEY` - Keep this

### **Step 3: Redeploy**
1. After clearing the variables
2. Go to **Deploys** tab
3. Click **Trigger deploy** → **Deploy site**
4. Wait for deployment to complete

---

## 🔍 **VERIFICATION**

After cleanup, the logs should show:
```
🔧 Environment variable detected, but forcing local backend for development
🔧 Production WebSocket detected, but using local backend for development
```

Instead of:
```
🔧 Using environment variable API URL: https://bus-tracking-backend-1u04.onrender.com
```

---

## 🚀 **ALTERNATIVE: QUICK FIX**

If you can't access Netlify dashboard right now:

### **Option 1: Force Local Backend (Already Done)**
The code changes I made will force local backend regardless of environment variables.

### **Option 2: Set Correct Environment Variables**
In Netlify dashboard, set:
- `VITE_API_URL` = `http://localhost:3000`
- `VITE_WEBSOCKET_URL` = `ws://localhost:3000`

---

## ✅ **EXPECTED RESULT**

After cleanup:
- ✅ Frontend will use `http://localhost:3000` for API calls
- ✅ WebSocket will use `ws://localhost:3000`
- ✅ Admin dashboard will work with local backend
- ✅ No more CORS errors from Render

---

## 🎯 **NEXT STEPS**

1. **Clear Netlify environment variables** (Step 2 above)
2. **Redeploy frontend** (Step 3 above)
3. **Start local backend:** `cd backend && npm run dev`
4. **Test admin dashboard** functionality

**🚀 Your admin dashboard will work perfectly once environment variables are cleared!**
