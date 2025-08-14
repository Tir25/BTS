-- Make bus-tracking-media bucket public
UPDATE storage.buckets 
SET public = true 
WHERE name = 'bus-tracking-media';

-- Verify the bucket is now public
SELECT name, public, created_at 
FROM storage.buckets 
WHERE name = 'bus-tracking-media';

-- Create public access policy if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Access bus-tracking-media'
  ) THEN
    CREATE POLICY "Public Access bus-tracking-media" ON storage.objects
    FOR SELECT USING (bucket_id = 'bus-tracking-media');
  END IF;
END $$;

-- Verify the policy exists
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' AND policyname LIKE '%bus-tracking-media%';
