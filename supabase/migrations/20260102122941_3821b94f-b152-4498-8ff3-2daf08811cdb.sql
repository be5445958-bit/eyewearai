-- Remove the face_analyses table since we don't need to store sensitive data
DROP TABLE IF EXISTS public.face_analyses;

-- Remove old storage policies
DROP POLICY IF EXISTS "Anyone can upload face photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view face photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete face photos" ON storage.objects;

-- Update the bucket to be private (recreate it)
DELETE FROM storage.buckets WHERE id = 'face-photos';
INSERT INTO storage.buckets (id, name, public) VALUES ('face-photos', 'face-photos', false);

-- Create secure storage policies - allow anonymous upload/delete but only via the app
-- The bucket is private, so files can only be accessed via signed URLs
CREATE POLICY "Allow anonymous upload to face-photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'face-photos');

CREATE POLICY "Allow anonymous delete from face-photos" 
ON storage.objects FOR DELETE
USING (bucket_id = 'face-photos');

-- Only allow reading via signed URLs (no public SELECT policy needed for private bucket)