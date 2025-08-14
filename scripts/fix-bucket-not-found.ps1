# Fix "Bucket not found" Error
Write-Host "🔧 Fixing 'Bucket not found' Error..." -ForegroundColor Yellow

Write-Host "`n🚨 Problem Identified:" -ForegroundColor Red
Write-Host "• 404 'Bucket not found' error when accessing images" -ForegroundColor Gray
Write-Host "• The bucket 'bus-tracking-media' doesn't exist or isn't configured" -ForegroundColor Gray
Write-Host "• This is a Supabase configuration issue, not a code issue" -ForegroundColor Gray

Write-Host "`n✅ Solution Steps:" -ForegroundColor Green

Write-Host "`n1️⃣ Check Supabase Dashboard:" -ForegroundColor Cyan
Write-Host "1. Go to your Supabase project dashboard" -ForegroundColor White
Write-Host "2. Click 'Storage' in the left sidebar" -ForegroundColor White
Write-Host "3. Check if 'bus-tracking-media' bucket exists" -ForegroundColor White

Write-Host "`n2️⃣ Create Bucket (if it doesn't exist):" -ForegroundColor Cyan
Write-Host "1. Click 'Create a new bucket'" -ForegroundColor White
Write-Host "2. Name: bus-tracking-media" -ForegroundColor White
Write-Host "3. Make it PUBLIC (important!)" -ForegroundColor White
Write-Host "4. Click 'Create bucket'" -ForegroundColor White

Write-Host "`n3️⃣ Run SQL Script:" -ForegroundColor Cyan
Write-Host "1. Open Supabase SQL Editor" -ForegroundColor White
Write-Host "2. Run 'check-and-create-bucket.sql'" -ForegroundColor White
Write-Host "3. This will create bucket and policies if needed" -ForegroundColor White

Write-Host "`n4️⃣ Verify Bucket Configuration:" -ForegroundColor Cyan
Write-Host "1. Go to Storage → Buckets" -ForegroundColor White
Write-Host "2. Click on 'bus-tracking-media'" -ForegroundColor White
Write-Host "3. Verify it's set to Public" -ForegroundColor White
Write-Host "4. Check CORS settings if needed" -ForegroundColor White

Write-Host "`n5️⃣ Test Bucket Access:" -ForegroundColor Cyan
Write-Host "1. Try uploading a test file in the dashboard" -ForegroundColor White
Write-Host "2. Verify the file appears in the bucket" -ForegroundColor White
Write-Host "3. Test direct URL access" -ForegroundColor White

Write-Host "`n🔍 Debug Commands:" -ForegroundColor Yellow

Write-Host "`nBrowser Console Test:" -ForegroundColor Cyan
Write-Host @"
// Test bucket access
const testBucket = async () => {
  const supabaseUrl = 'https://gthwmwfwvhyriygpcdlr.supabase.co';
  const bucketName = 'bus-tracking-media';
  
  try {
    const response = await fetch(`${supabaseUrl}/storage/v1/bucket/${bucketName}`);
    console.log('Bucket status:', response.status);
    const data = await response.json();
    console.log('Bucket info:', data);
  } catch (error) {
    console.error('Bucket error:', error);
  }
};

testBucket();
"@ -ForegroundColor Gray

Write-Host "`nSQL Commands to Run:" -ForegroundColor Cyan
Write-Host @"
-- Check if bucket exists
SELECT name, public FROM storage.buckets WHERE name = 'bus-tracking-media';

-- Check storage policies
SELECT policyname, cmd FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';
"@ -ForegroundColor Gray

Write-Host "`n📋 Quick Fix Checklist:" -ForegroundColor Green
Write-Host "□ Bucket 'bus-tracking-media' exists" -ForegroundColor White
Write-Host "□ Bucket is set to Public" -ForegroundColor White
Write-Host "□ Storage policies are configured" -ForegroundColor White
Write-Host "□ Test upload works in dashboard" -ForegroundColor White
Write-Host "□ Direct URL access works" -ForegroundColor White
Write-Host "□ Restart backend server" -ForegroundColor White

Write-Host "`n🚨 Common Issues:" -ForegroundColor Red
Write-Host "• Bucket name mismatch - check actual bucket name" -ForegroundColor Gray
Write-Host "• Private bucket - make it public" -ForegroundColor Gray
Write-Host "• Missing policies - run the SQL script" -ForegroundColor Gray
Write-Host "• CORS issues - configure in bucket settings" -ForegroundColor Gray

Write-Host "`n✅ Expected Results:" -ForegroundColor Green
Write-Host "• No more 'Bucket not found' errors" -ForegroundColor Gray
Write-Host "• Images display properly in UI" -ForegroundColor Gray
Write-Host "• Direct image URLs work" -ForegroundColor Gray
Write-Host "• Upload functionality works" -ForegroundColor Gray
Write-Host "• No 404 errors in Network tab" -ForegroundColor Gray

Write-Host "`n🔧 If Still Not Working:" -ForegroundColor Yellow
Write-Host "1. Check bucket name in code vs dashboard" -ForegroundColor White
Write-Host "2. Verify bucket is public" -ForegroundColor White
Write-Host "3. Check storage policies" -ForegroundColor White
Write-Host "4. Test with different bucket name" -ForegroundColor White
Write-Host "5. Check Supabase project settings" -ForegroundColor White

Write-Host "`n🚀 Next Steps:" -ForegroundColor Green
Write-Host "1. Check Supabase Dashboard for bucket" -ForegroundColor White
Write-Host "2. Create bucket if it doesn't exist" -ForegroundColor White
Write-Host "3. Run the SQL script" -ForegroundColor White
Write-Host "4. Test the fix" -ForegroundColor White
Write-Host "5. Update code if bucket name is different" -ForegroundColor White

Write-Host "`n💡 Pro Tip:" -ForegroundColor Cyan
Write-Host "The 'Bucket not found' error is always a configuration issue." -ForegroundColor White
Write-Host "Once you create/configure the bucket properly, your images will work!" -ForegroundColor White
