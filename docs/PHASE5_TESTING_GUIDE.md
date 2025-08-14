# Phase 5 Testing Guide - University Bus Tracking System

## 🎯 **Testing Overview**
This guide provides step-by-step instructions to test all Phase 5 admin features thoroughly.

## 📋 **Prerequisites**
- Backend server running on port 3000
- Frontend server running on port 5174
- Admin user configured in database
- All SQL scripts executed successfully

## 🔐 **1. Authentication Testing**

### **Test Case 1.1: Admin Login**
**Steps:**
1. Navigate to: http://localhost:5174/admin
2. Enter email: `admin@university.edu`
3. Enter password: `password123`
4. Click "Login"

**Expected Results:**
- ✅ Login successful
- ✅ Redirected to admin dashboard
- ✅ No error messages
- ✅ Admin role recognized

### **Test Case 1.2: Session Persistence**
**Steps:**
1. After successful login, refresh the page
2. Close and reopen browser
3. Navigate back to admin panel

**Expected Results:**
- ✅ Session maintained
- ✅ No need to re-login
- ✅ Dashboard loads automatically

### **Test Case 1.3: Logout Functionality**
**Steps:**
1. Click logout button
2. Try to access admin routes

**Expected Results:**
- ✅ Logout successful
- ✅ Redirected to login page
- ✅ Cannot access admin routes without login

## 📊 **2. Dashboard Analytics Testing**

### **Test Case 2.1: System Overview**
**Steps:**
1. Access admin dashboard
2. Check system overview section

**Expected Results:**
- ✅ Total buses count displayed
- ✅ Active buses count displayed
- ✅ Total routes count displayed
- ✅ Total drivers count displayed
- ✅ Average delay displayed

### **Test Case 2.2: Charts Loading**
**Steps:**
1. Check if charts are visible
2. Verify chart data is loading

**Expected Results:**
- ✅ Bus usage chart displayed
- ✅ Charts show real data
- ✅ No loading errors
- ✅ Responsive design

### **Test Case 2.3: Real-time Data**
**Steps:**
1. Refresh dashboard
2. Check if data updates

**Expected Results:**
- ✅ Data refreshes correctly
- ✅ No stale data
- ✅ Real-time updates working

## 🚌 **3. Bus Management Testing**

### **Test Case 3.1: View All Buses**
**Steps:**
1. Navigate to Bus Management section
2. Check bus list

**Expected Results:**
- ✅ All buses displayed
- ✅ Bus details shown (plate, capacity, model, etc.)
- ✅ Driver assignments visible
- ✅ Route assignments visible

### **Test Case 3.2: Add New Bus**
**Steps:**
1. Click "Add New Bus"
2. Fill in required fields:
   - Number Plate: `TEST-001`
   - Capacity: `50`
   - Model: `Test Model`
   - Year: `2024`
3. Click "Save"

**Expected Results:**
- ✅ Bus created successfully
- ✅ New bus appears in list
- ✅ No validation errors
- ✅ Success message displayed

### **Test Case 3.3: Edit Existing Bus**
**Steps:**
1. Click edit button on any bus
2. Modify some fields
3. Save changes

**Expected Results:**
- ✅ Bus updated successfully
- ✅ Changes reflected in list
- ✅ No data loss
- ✅ Success message displayed

### **Test Case 3.4: Delete Bus**
**Steps:**
1. Click delete button on a bus
2. Confirm deletion

**Expected Results:**
- ✅ Bus deleted successfully
- ✅ Bus removed from list
- ✅ Confirmation dialog works
- ✅ Success message displayed

## 👨‍💼 **4. Driver Management Testing**

### **Test Case 4.1: View All Drivers**
**Steps:**
1. Navigate to Driver Management section
2. Check driver list

**Expected Results:**
- ✅ All drivers displayed
- ✅ Driver details shown
- ✅ Bus assignments visible
- ✅ Contact information displayed

### **Test Case 4.2: Assign Driver to Bus**
**Steps:**
1. Select an unassigned driver
2. Select an available bus
3. Click "Assign"

**Expected Results:**
- ✅ Assignment successful
- ✅ Driver shows as assigned
- ✅ Bus shows driver assignment
- ✅ Success message displayed

### **Test Case 4.3: Unassign Driver**
**Steps:**
1. Select an assigned driver
2. Click "Unassign"

**Expected Results:**
- ✅ Unassignment successful
- ✅ Driver shows as unassigned
- ✅ Bus shows no driver
- ✅ Success message displayed

## 🛣️ **5. Route Management Testing**

### **Test Case 5.1: View All Routes**
**Steps:**
1. Navigate to Route Management section
2. Check route list

**Expected Results:**
- ✅ All routes displayed
- ✅ Route details shown
- ✅ Bus assignments visible
- ✅ Estimated duration displayed

### **Test Case 5.2: Route Details**
**Steps:**
1. Click on a route
2. Check route information

**Expected Results:**
- ✅ Route details displayed
- ✅ Assigned buses shown
- ✅ Route path visible
- ✅ Estimated times shown

## 🏥 **6. System Health Testing**

### **Test Case 6.1: System Status**
**Steps:**
1. Navigate to System Health section
2. Check system metrics

**Expected Results:**
- ✅ System status displayed
- ✅ Database connection status
- ✅ Active connections shown
- ✅ Response times displayed

### **Test Case 6.2: Health Checks**
**Steps:**
1. Check all health indicators
2. Verify system is healthy

**Expected Results:**
- ✅ All systems operational
- ✅ No critical errors
- ✅ Performance metrics normal
- ✅ Database queries working

## 🗺️ **7. Live Location Testing**

### **Test Case 7.1: Admin Map**
**Steps:**
1. Navigate to map section
2. Check map loading

**Expected Results:**
- ✅ Map loads correctly
- ✅ All buses visible on map
- ✅ Bus locations accurate
- ✅ Real-time updates working

### **Test Case 7.2: Bus Tracking**
**Steps:**
1. Click on a bus marker
2. Check bus information

**Expected Results:**
- ✅ Bus details displayed
- ✅ Current location shown
- ✅ Route information visible
- ✅ Driver information shown

## 🐛 **8. Error Handling Testing**

### **Test Case 8.1: Network Errors**
**Steps:**
1. Disconnect internet temporarily
2. Try to perform actions

**Expected Results:**
- ✅ Error messages displayed
- ✅ Graceful degradation
- ✅ No crashes
- ✅ Recovery after reconnection

### **Test Case 8.2: Invalid Data**
**Steps:**
1. Try to submit invalid data
2. Check validation

**Expected Results:**
- ✅ Validation errors shown
- ✅ No invalid data saved
- ✅ User-friendly error messages
- ✅ Form state preserved

## 📱 **9. Responsive Design Testing**

### **Test Case 9.1: Mobile View**
**Steps:**
1. Resize browser to mobile size
2. Test all features

**Expected Results:**
- ✅ Layout adapts correctly
- ✅ All features accessible
- ✅ Touch interactions work
- ✅ No horizontal scrolling

### **Test Case 9.2: Tablet View**
**Steps:**
1. Resize browser to tablet size
2. Test all features

**Expected Results:**
- ✅ Layout optimized for tablet
- ✅ All features accessible
- ✅ Good usability
- ✅ Proper spacing

## ✅ **10. Performance Testing**

### **Test Case 10.1: Load Times**
**Steps:**
1. Measure page load times
2. Check resource loading

**Expected Results:**
- ✅ Fast page loads (< 3 seconds)
- ✅ Charts load quickly
- ✅ No timeout errors
- ✅ Smooth interactions

### **Test Case 10.2: Data Refresh**
**Steps:**
1. Monitor data refresh performance
2. Check for lag

**Expected Results:**
- ✅ Real-time updates smooth
- ✅ No performance degradation
- ✅ Responsive interface
- ✅ No memory leaks

## 🎯 **Testing Checklist**

- [ ] Authentication working
- [ ] Dashboard analytics loading
- [ ] Bus management CRUD operations
- [ ] Driver management operations
- [ ] Route management working
- [ ] System health monitoring
- [ ] Live location tracking
- [ ] Error handling robust
- [ ] Responsive design working
- [ ] Performance acceptable

## 📝 **Reporting Issues**

If any test fails:
1. Note the specific test case
2. Describe the expected vs actual behavior
3. Include any error messages
4. Note browser/device information
5. Report to development team

## 🎉 **Success Criteria**

Phase 5 is considered complete when:
- ✅ All test cases pass
- ✅ No critical bugs found
- ✅ Performance meets requirements
- ✅ User experience is smooth
- ✅ All features work as expected

---

**Admin Access:**
- URL: http://localhost:5174/admin
- Email: admin@university.edu
- Password: password123
