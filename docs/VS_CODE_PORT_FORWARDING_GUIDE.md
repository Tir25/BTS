# VS Code Port Forwarding Guide for Bus Tracking System

## 🚀 **What is VS Code Port Forwarding?**

VS Code's port forwarding feature creates secure tunnels that expose your local development servers to the internet, allowing you to access your application from anywhere without configuring firewalls or network settings.

## 🔧 **Setup Instructions**

### **Step 1: Start Your Servers**

1. **Start the Backend Server:**
   ```bash
   cd backend
   npm run dev
   ```
   - Backend will run on `http://localhost:3000`

2. **Start the Frontend Server:**
   ```bash
   cd frontend
   npm run dev
   ```
   - Frontend will run on `http://localhost:5173`

### **Step 2: Configure Port Forwarding**

1. **Open VS Code** and navigate to your project
2. **Open the Ports Panel:**
   - Click on the **Ports** tab in the bottom panel
   - Or use `Ctrl+Shift+P` → "Ports: Focus on Ports View"

3. **Forward the Backend Port:**
   - Click **"Forward a Port"** button
   - Enter port number: `3000`
   - Set visibility to **"Public"** (for external access)
   - Click **"Forward"**

4. **Forward the Frontend Port:**
   - Click **"Forward a Port"** again
   - Enter port number: `5173`
   - Set visibility to **"Public"**
   - Click **"Forward"**

### **Step 3: Access Your Application**

After forwarding both ports, you'll see URLs like:
- **Frontend:** `https://abc123-5173.inc1.devtunnels.ms`
- **Backend:** `https://abc123-3000.inc1.devtunnels.ms`

## ✅ **What I've Fixed**

### **1. Frontend API URL Detection**
Updated `frontend/src/config/environment.ts` to automatically detect VS Code tunnel URLs and use the correct backend tunnel URL.

### **2. CORS Configuration**
Updated both backend CORS middleware and WebSocket configuration to allow VS Code tunnel origins:
- `backend/src/middleware/cors.ts`
- `backend/src/server.ts`

### **3. Smart URL Detection**
The frontend now automatically:
- Detects when running on a VS Code tunnel
- Extracts the tunnel ID
- Constructs the correct backend tunnel URL
- Handles both HTTP and WebSocket connections

## 🎯 **Expected Results**

After the fixes:
- ✅ **No CORS errors** when accessing via tunnel
- ✅ **Frontend automatically connects** to tunneled backend
- ✅ **WebSocket connections work** through tunnel
- ✅ **Full functionality** accessible from anywhere

## 🔍 **Testing the Setup**

### **From Your Development Machine:**
1. Access frontend: `https://[tunnel-id]-5173.inc1.devtunnels.ms`
2. Check browser console for API URL detection
3. Verify backend health: `https://[tunnel-id]-3000.inc1.devtunnels.ms/health`

### **From Another Device:**
1. Use the same tunnel URLs
2. Test all features (login, bus management, etc.)
3. Verify real-time updates work

## 🚨 **Troubleshooting**

### **If You Still Get CORS Errors:**

1. **Check the tunnel URLs** in the VS Code Ports panel
2. **Verify both ports are forwarded** (3000 and 5173)
3. **Check browser console** for the detected API URL
4. **Restart both servers** after making changes

### **If Backend Connection Fails:**

1. **Verify backend is running** on localhost:3000
2. **Check tunnel status** in VS Code Ports panel
3. **Test backend directly:** `https://[tunnel-id]-3000.inc1.devtunnels.ms/health`

### **If Frontend Can't Load:**

1. **Check frontend is running** on localhost:5173
2. **Verify tunnel URL** is accessible
3. **Check browser console** for errors

## 🔧 **Manual Configuration (Alternative)**

If automatic detection doesn't work, you can manually set the API URL:

1. **Create `.env.local` in frontend directory:**
   ```env
   VITE_API_URL=https://[your-tunnel-id]-3000.inc1.devtunnels.ms
   VITE_WEBSOCKET_URL=wss://[your-tunnel-id]-3000.inc1.devtunnels.ms
   ```

2. **Replace `[your-tunnel-id]`** with your actual tunnel ID

## 📋 **Benefits of VS Code Port Forwarding**

- ✅ **No firewall configuration** needed
- ✅ **Secure HTTPS tunnels** automatically
- ✅ **Accessible from anywhere** on the internet
- ✅ **No network configuration** required
- ✅ **Built into VS Code** - no additional tools needed

## 🎉 **Success Indicators**

When everything is working correctly:
- Frontend loads without errors
- Backend health check returns 200 OK
- Admin login works
- All features function normally
- Real-time updates work via WebSocket

---

**VS Code port forwarding provides a secure, easy way to test your application from any device without complex network configuration!**
