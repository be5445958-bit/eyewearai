-- Create storage bucket for face photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('face-photos', 'face-photos', true);

-- Allow anyone to upload photos (temporary for analysis)
CREATE POLICY "Anyone can upload face photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'face-photos');

-- Allow anyone to view photos
CREATE POLICY "Anyone can view face photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'face-photos');

-- Allow anyone to delete their uploaded photos
CREATE POLICY "Anyone can delete face photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'face-photos');

-- Create table for analysis history (optional, for future use)
CREATE TABLE public.face_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT NOT NULL,
  face_shape TEXT,
  skin_tone TEXT,
  recommendations JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS but allow public access for now (no auth required)
ALTER TABLE public.face_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert analyses"
ON public.face_analyses FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view analyses"
ON public.face_analyses FOR SELECT
USING (true);