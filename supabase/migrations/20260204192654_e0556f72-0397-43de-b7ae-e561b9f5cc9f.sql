-- Drop and recreate the view with security_invoker=on to fix SECURITY DEFINER warning
DROP VIEW IF EXISTS public.public_ratings;

CREATE VIEW public.public_ratings
WITH (security_invoker=on) AS
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