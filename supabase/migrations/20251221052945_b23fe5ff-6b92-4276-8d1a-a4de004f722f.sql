-- Make review-photos bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'review-photos';

-- Drop existing public SELECT policy if it exists
DROP POLICY IF EXISTS "Anyone can view review photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view review photos" ON storage.objects;

-- Create new SELECT policy for authenticated users only
CREATE POLICY "Authenticated users can view review photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'review-photos');