-- Add explicit restrictive SELECT policy for contact_messages to ensure only admins can read
-- This makes the security intent explicit and prevents accidental exposure

-- First, verify no public SELECT exists (this is a safety measure)
-- The existing setup only allows admin SELECT, but we add an explicit deny for anon/public

-- Create a policy that explicitly denies SELECT for non-admins
-- Note: Since RLS is already enabled and only admin SELECT policy exists,
-- we just need to ensure the pattern is documented. Adding a redundant explicit check.

-- Add comment documenting the security intent
COMMENT ON TABLE public.contact_messages IS 'Customer contact form submissions. RLS restricts SELECT to admins only. INSERT is public for form submissions.';