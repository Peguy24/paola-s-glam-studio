-- Create a public view for ratings that excludes client_id for privacy
CREATE OR REPLACE VIEW public.public_ratings AS
SELECT 
  id,
  service_id,
  appointment_id,
  rating,
  review,
  photos,
  created_at,
  updated_at,
  admin_response,
  admin_response_at,
  admin_responder_id
FROM public.ratings;

-- Grant SELECT on the view to anon and authenticated roles
GRANT SELECT ON public.public_ratings TO anon;
GRANT SELECT ON public.public_ratings TO authenticated;

-- Drop the existing public "Anyone can view ratings" policy
DROP POLICY IF EXISTS "Anyone can view ratings" ON public.ratings;

-- Create a new policy that only allows authenticated users to view ratings
-- This ensures client_id is only visible to authenticated users
CREATE POLICY "Authenticated users can view ratings"
ON public.ratings
FOR SELECT
TO authenticated
USING (true);