# Student Map Testing Guide

## Overview

This guide helps you test the refactored StudentMap with MapService integration and clustering support.

## Test Checklist

### 1. Basic Marker Functionality ✅

**Test Steps:**
1. Open StudentMap in browser
2. Verify bus markers appear on map
3. Click on a marker - verify popup shows:
   - Bus number
   - Route name
   - Driver name
   - Last update time
   - Speed (if available)

**Expected Result:**
- All markers visible
- Popups show correct information
- No console errors

### 2. Marker Updates ✅

**Test Steps:**
1. Observe bus markers on map
2. Wait for location updates (via WebSocket)
3. Verify markers move smoothly to new positions
4. Check that popups update periodically (every 5 seconds)

**Expected Result:**
- Markers update positions smoothly
- Position updates only when bus moves >10m
- Popup updates throttled to 5s interval
- No performance issues

### 3. Clustering Functionality ✅

**Test Steps:**
1. Zoom out to see many buses (zoom < 14)
2. Verify clusters appear instead of individual markers
3. Zoom in (zoom >= 14)
4. Verify individual markers appear
5. Test zoom transitions are smooth

**Expected Result:**
- Clusters show at low zoom levels
- Individual markers at high zoom
- Smooth transitions between states
- Cluster sizes based on bus count
- Cluster colors: Green (1-5), Orange (6-10), Red (11+)

### 4. Clustering Performance ✅

**Test Steps:**
1. Load map with 50+ buses
2. Zoom out to see clusters
3. Pan the map smoothly
4. Verify no lag or performance issues

**Expected Result:**
- Smooth panning with many buses
- Clusters reduce rendering load
- No browser slowdown

### 5. MapService Integration ✅

**Test Steps:**
1. Open browser console
2. Check for MapService initialization logs
3. Verify "MapService using external map instance" log
4. Check for "Clustering enabled" log (if clustering enabled)

**Expected Result:**
- MapService initializes correctly
- Proper logging for debugging
- No errors in console

### 6. Cleanup on Unmount ✅

**Test Steps:**
1. Navigate to StudentMap
2. Navigate away from StudentMap
3. Check browser console for cleanup logs
4. Verify no memory leaks

**Expected Result:**
- Cleanup logs appear
- No markers left on map
- No memory leaks

## Browser Testing

### Chrome
```bash
# Test markers and clustering
- Open Developer Tools > Console
- Check for errors
- Monitor Performance tab for rendering time
```

### Firefox
```bash
# Test WebSocket connections
- Open Developer Tools > Network
- Verify WebSocket connections
- Check marker rendering
```

### Safari
```bash
# Test on mobile devices
- Test touch interactions
- Verify clustering on mobile zoom
- Check performance on slower devices
```

## Performance Testing

### Test with Many Buses

1. **10 buses:** Should see individual markers
2. **25 buses:** Clusters appear when zoomed out
3. **50+ buses:** Significant performance improvement with clustering

### Metrics to Monitor

- **Rendering time:** Should be < 16ms per frame
- **Memory usage:** Should be stable, not increasing
- **Marker count:** Should reduce with clustering

## Troubleshooting

### Markers Not Appearing
- Check WebSocket connection status
- Verify `enableRealTime` config is true
- Check browser console for errors

### Clustering Not Working
- Verify `enableClustering` config is true
- Check zoom level (should be < 14 for clusters)
- Check console for clustering logs

### Performance Issues
- Verify clustering is enabled
- Check number of buses (should be manageable)
- Monitor browser DevTools Performance tab

## Console Commands for Testing

```javascript
// Check MapService instance
window.mapService = // Access via React DevTools

// Check current zoom level
// Use map controls or DevTools

// Force cluster update
// Zoom in/out to trigger update
```

## Expected Console Logs

✅ **On Map Load:**
```
🗺️ Map loaded successfully
🗺️ MapService using external map instance
🗺️ Clustering enabled (if enabled)
```

✅ **On Clustering:**
```
🗺️ Clustering enabled
[Cluster updates on zoom/move]
```

✅ **On Cleanup:**
```
🧹 All markers cleaned up
🧹 StudentMap cleanup complete
```

## Success Criteria

✅ All markers appear correctly
✅ Markers update smoothly
✅ Clustering works at low zoom
✅ Individual markers at high zoom
✅ No console errors
✅ Good performance with many buses
✅ Proper cleanup on unmount

## Reporting Issues

If you find issues, report:
1. Browser and version
2. Number of buses visible
3. Console errors (if any)
4. Steps to reproduce
5. Expected vs actual behavior

