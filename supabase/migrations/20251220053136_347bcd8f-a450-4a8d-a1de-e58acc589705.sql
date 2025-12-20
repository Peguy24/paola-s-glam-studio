-- Fix profiles table: Ensure only authenticated users can access
-- Drop existing SELECT policies and recreate with explicit authentication check
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create new policies that explicitly require authentication
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix contact_messages table: Ensure SELECT is explicitly admin-only and authenticated
DROP POLICY IF EXISTS "Admins can view all contact messages" ON public.contact_messages;

-- Recreate with explicit authenticated role
CREATE POLICY "Admins can view all contact messages"
ON public.contact_messages
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));