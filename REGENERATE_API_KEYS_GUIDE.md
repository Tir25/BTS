# 🔑 REGENERATE API KEYS GUIDE
**Step-by-step instructions to secure your application**

---

## 🚨 **IMMEDIATE ACTION REQUIRED**

Your API keys and passwords have been exposed in the codebase. Follow this guide to regenerate them and secure your application.

---

## 📋 **STEP-BY-STEP REGENERATION PROCESS**

### **Step 1: Supabase Dashboard Access**

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Sign in with your account
   - Select your project: `gthwmwfwvhyriygpcdlr`

### **Step 2: Regenerate Service Role Key** ⚠️ **CRITICAL**

1. **Navigate to API Settings**
   - Click **"Settings"** in the left sidebar
   - Click **"API"** in the settings menu

2. **Find Service Role Key**
   - Look for **"service_role"** key section
   - This key has **full database access**

3. **Regenerate the Key**
   - Click **"Regenerate"** button
   - **Copy the new key immediately** (you won't see it again)
   - Store it securely (password manager recommended)

4. **Update Backend Environment**
   ```bash
   # Edit backend/.env
   SUPABASE_SERVICE_ROLE_KEY=your_new_service_role_key_here
   ```

### **Step 3: Regenerate Anon Key** ⚠️ **RECOMMENDED**

1. **In the same API settings page**
   - Find **"anon"** key section
   - Click **"Regenerate"** button
   - **Copy the new key immediately**

2. **Update Both Environments**
   ```bash
   # Edit backend/.env
   SUPABASE_ANON_KEY=your_new_anon_key_here
   
   # Edit frontend/.env
   VITE_SUPABASE_ANON_KEY=your_new_anon_key_here
   ```

### **Step 4: Reset Database Password** ⚠️ **CRITICAL**

1. **Navigate to Database Settings**
   - Click **"Settings"** → **"Database"**
   - Find **"Connection string"** section

2. **Reset Database Password**
   - Click **"Reset Database Password"**
   - Enter a **strong new password** (12+ characters, mixed case, numbers, symbols)
   - Click **"Reset Password"**

3. **Update Database URL**
   ```bash
   # Edit backend/.env
   DATABASE_URL=postgresql://postgres.gthwmwfwvhyriygpcdlr:NEW_PASSWORD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
   ```

### **Step 5: Change User Passwords** ⚠️ **CRITICAL**

1. **Navigate to Authentication**
   - Click **"Authentication"** → **"Users"**

2. **Change Driver Password**
   - Find user: `tirthraval27@gmail.com`
   - Click **"Edit"** (three dots menu)
   - Set a **new strong password**
   - Save changes

3. **Change Admin Password**
   - Find admin user
   - Set a **new strong password**
   - Save changes

4. **Update Script Environment Variables**
   ```bash
   # Edit backend/.env
   DRIVER_PASSWORD=new_driver_password_here
   ADMIN_PASSWORD=new_admin_password_here
   ```

---

## 🔧 **ENVIRONMENT SETUP**

### **Create Environment Files**

1. **Copy Templates**
   ```bash
   # Copy backend template
   cp backend/env.template backend/.env
   
   # Copy frontend template
   cp frontend/env.template frontend/.env
   ```

2. **Fill in New Credentials**
   ```bash
   # Edit backend/.env with your new credentials
   SUPABASE_URL=https://gthwmwfwvhyriygpcdlr.supabase.co
   SUPABASE_ANON_KEY=your_new_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_new_service_role_key
   DATABASE_URL=postgresql://postgres.gthwmwfwvhyriygpcdlr:NEW_PASSWORD@...
   DRIVER_PASSWORD=new_driver_password
   ADMIN_PASSWORD=new_admin_password
   
   # Edit frontend/.env
   VITE_SUPABASE_URL=https://gthwmwfwvhyriygpcdlr.supabase.co
   VITE_SUPABASE_ANON_KEY=your_new_anon_key
   ```

---

## ✅ **VERIFICATION STEPS**

### **Test Backend Connection**
```bash
cd backend
npm run dev
# Check for connection errors
```

### **Test Frontend Connection**
```bash
cd frontend
npm run dev
# Try logging in with new credentials
```

### **Test User Login**
1. **Driver Login**
   - Email: `tirthraval27@gmail.com`
   - Password: `[new_driver_password]`

2. **Admin Login**
   - Email: `[admin_email]`
   - Password: `[new_admin_password]`

---

## 🚨 **CRITICAL SECURITY REMINDERS**

### **DO NOT:**
- ❌ Share new keys with anyone
- ❌ Commit .env files to git
- ❌ Store keys in plain text files
- ❌ Use the same keys across environments

### **DO:**
- ✅ Store keys in a password manager
- ✅ Use different keys for dev/staging/prod
- ✅ Rotate keys regularly (every 90 days)
- ✅ Monitor for unauthorized access

---

## 📞 **IF SOMETHING GOES WRONG**

### **Backup Plan:**
1. **Check Supabase Dashboard** for connection issues
2. **Verify environment variables** are set correctly
3. **Check application logs** for error messages
4. **Test database connection** directly

### **Emergency Contacts:**
- **Supabase Support**: https://supabase.com/support
- **Documentation**: https://supabase.com/docs

---

## 🔒 **POST-REGENERATION SECURITY**

### **Immediate Actions:**
1. **Delete old credential files**
2. **Update all team members** with new credentials
3. **Test all functionality** with new keys
4. **Monitor logs** for any issues

### **Ongoing Security:**
1. **Set up key rotation** schedule
2. **Monitor access logs**
3. **Set up alerts** for suspicious activity
4. **Regular security audits**

---

**⚠️ IMPORTANT: Complete all steps before deploying to production!**

