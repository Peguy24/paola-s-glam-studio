-- Add admin response fields to ratings table
ALTER TABLE public.ratings
ADD COLUMN admin_response TEXT,
ADD COLUMN admin_response_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN admin_responder_id UUID REFERENCES public.profiles(id);

-- Add index for better query performance
CREATE INDEX idx_ratings_admin_response ON public.ratings(admin_responder_id) WHERE admin_response IS NOT NULL;

-- Update RLS policies to allow admins to update admin_response field
-- (existing update policy for admins already covers this)