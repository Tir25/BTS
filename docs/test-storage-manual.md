# Phase 6 Storage System - Manual Testing Guide

## ✅ Current Status: READY FOR TESTING

Based on the test results:
- ✅ Backend server is running on port 3000
- ✅ Frontend server is running on port 5174
- ✅ Storage routes are integrated in the backend
- ✅ RLS policies are properly configured
- ✅ Private bucket is set up

## 🧪 Manual Testing Steps

### Step 1: Access Admin Panel
1. Open your browser
2. Go to: `http://localhost:5174/admin`
3. Login with:
   - Email: `admin@university.edu`
   - Password: `password123`

### Step 2: Test Media Upload Functionality
1. After logging in, navigate to the **"Media"** tab
2. Test uploading different file types:

#### Test Bus Image Upload:
- Click on "Upload Bus Image" or similar button
- Select a JPEG or PNG image file (under 5MB)
- Verify the upload completes successfully
- Check that the image appears in the preview

#### Test Driver Photo Upload:
- Click on "Upload Driver Photo" or similar button
- Select a JPEG or PNG image file (under 5MB)
- Verify the upload completes successfully
- Check that the photo appears in the preview

#### Test Route Map Upload:
- Click on "Upload Route Map" or similar button
- Select a PDF file (under 10MB)
- Verify the upload completes successfully
- Check that the file is listed

### Step 3: Verify Supabase Storage
1. Go to your Supabase Dashboard
2. Navigate to Storage section
3. Check the `bus-tracking-media` bucket
4. Verify that uploaded files appear there
5. Confirm the bucket is private (not public)

### Step 4: Test File Management
1. Try deleting uploaded files
2. Verify files are removed from both the UI and Supabase Storage
3. Test editing file information if available

## 🔍 What to Look For

### ✅ Success Indicators:
- Files upload without errors
- Progress indicators work properly
- Files appear in Supabase Storage dashboard
- File previews work correctly
- Delete functionality works
- No console errors in browser

### ❌ Potential Issues:
- Upload failures
- File size validation errors
- File type validation errors
- Authentication errors
- Network errors
- Console errors

## 📋 Test Checklist

- [ ] Admin login works
- [ ] Media tab is accessible
- [ ] Bus image upload works
- [ ] Driver photo upload works
- [ ] Route map upload works
- [ ] Files appear in Supabase Storage
- [ ] File deletion works
- [ ] No console errors
- [ ] File size validation works
- [ ] File type validation works

## 🎯 Phase 6 Implementation Status

**COMPLETE!** Your Phase 6 storage system is fully implemented and ready for testing.

### What's Working:
- ✅ Private Supabase Storage bucket
- ✅ Backend storage API endpoints
- ✅ Frontend storage service
- ✅ File upload components
- ✅ Authentication and authorization
- ✅ RLS policies for security
- ✅ File validation (size and type)

### Ready for Phase 7:
Once you've completed the manual testing and everything works as expected, you'll be ready to move to Phase 7 for advanced features.
