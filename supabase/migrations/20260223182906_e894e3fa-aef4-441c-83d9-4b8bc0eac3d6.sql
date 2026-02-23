
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Allow anonymous upload to face-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous delete from face-photos" ON storage.objects;

-- Restricted upload: only allows our naming pattern
CREATE POLICY "Allow restricted upload to face-photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'face-photos'
  AND (name ~ '^face-[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$')
);

-- No anonymous delete policy - backend uses service role key for cleanup

-- Enforce file size and MIME type limits on the bucket
UPDATE storage.buckets 
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'face-photos';
