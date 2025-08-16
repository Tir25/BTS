# Cross-Laptop Testing Guide for Live Location

## 🎯 Overview
This guide will help you test the live location functionality between two laptops connected to the same WiFi network.

## 📍 Current Setup
- **Your Laptop IP Address**: `192.168.1.2`
- **Backend Server**: `http://192.168.1.2:3000` ✅ Running
- **Frontend Server**: `http://192.168.1.2:5175` ✅ Running (Port 5175)
- **WebSocket**: `ws://192.168.1.2:3000` ✅ Running

## 🚀 Testing Steps

### Step 1: Driver Interface (Current Laptop)
1. Open your browser and go to: `http://192.168.1.2:5175`
2. Navigate to the **Driver Interface**
3. Login with driver credentials:
   - **Email**: `driver1@university.edu`
   - **Password**: `password123`
4. Click **"Start Location Tracking"**
5. Allow location permissions when prompted
6. You should see your current location on the map

### Step 2: Student Map (Second Laptop)
1. On your second laptop, open a browser
2. Go to: `http://192.168.1.2:5175`
3. Navigate to the **Student Map**
4. You should see the live bus location updating in real-time

## 🔧 Troubleshooting

### If Driver Interface doesn't work:
- Check if location permissions are granted
- Try refreshing the page
- Check browser console for errors

### If Student Map doesn't show live location:
- Verify both laptops are on the same WiFi network
- Check if the WebSocket connection is established
- Try accessing `http://192.168.1.2:3000/health` on second laptop
- **Fixed**: Authentication errors should no longer occur - Student Map now works without login

### If WebSocket connection fails:
- Check Windows Firewall settings
- Ensure port 3000 is not blocked
- Try disabling antivirus temporarily

## 📊 Expected Behavior

### Driver Interface:
- Shows current location on map
- Updates location every few seconds
- Displays tracking status and update count

### Student Map:
- Shows all active buses
- Real-time location updates
- Bus information (number, route, driver)

## 🎯 Test Scenarios

1. **Basic Location Tracking**: Verify driver location appears on student map
2. **Real-time Updates**: Move around and see location updates
3. **Multiple Buses**: Login with different driver accounts
4. **Network Stability**: Test connection over time
5. **Cross-Browser**: Test on different browsers

## 🔍 Debug Information

### Backend Health Check:
```bash
curl http://192.168.1.2:3000/health
```

### WebSocket Connection:
- Open browser developer tools
- Check Network tab for WebSocket connections
- Look for `ws://192.168.1.2:3000` connection

### Frontend Logs:
- Open browser console
- Look for WebSocket connection messages
- Check for any error messages

## 📱 Alternative Testing

If cross-laptop testing doesn't work, you can test on the same laptop:
1. Open Driver Interface in one browser tab
2. Open Student Map in another browser tab
3. Login as driver and start tracking
4. Switch to Student Map tab to see updates

## 🆘 Support

If you encounter issues:
1. Check the browser console for errors
2. Verify both servers are running
3. Test network connectivity between laptops
4. Check Windows Firewall settings
