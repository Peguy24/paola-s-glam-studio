-- Add photos column to ratings table
ALTER TABLE public.ratings ADD COLUMN photos text[] DEFAULT '{}';

-- Create storage bucket for review photos
INSERT INTO storage.buckets (id, name, public) VALUES ('review-photos', 'review-photos', true);

-- Allow authenticated users to upload their own review photos
CREATE POLICY "Users can upload review photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'review-photos' AND auth.uid() IS NOT NULL);

-- Allow public to view review photos
CREATE POLICY "Anyone can view review photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'review-photos');

-- Allow users to delete their own review photos
CREATE POLICY "Users can delete own review photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'review-photos' AND auth.uid()::text = (storage.foldername(name))[1]);