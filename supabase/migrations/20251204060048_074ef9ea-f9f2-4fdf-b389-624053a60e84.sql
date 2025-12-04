-- Create site_settings table for editable footer info
CREATE TABLE public.site_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can view settings
CREATE POLICY "Everyone can view site settings"
ON public.site_settings
FOR SELECT
USING (true);

-- Only admins can update settings
CREATE POLICY "Admins can update site settings"
ON public.site_settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert settings
CREATE POLICY "Admins can insert site settings"
ON public.site_settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default values
INSERT INTO public.site_settings (key, value) VALUES
  ('phone', '(555) 123-4567'),
  ('email', 'info@paolabeautyglam.com'),
  ('address_line1', '123 Beauty Lane, Suite 100'),
  ('address_line2', 'City, State 12345'),
  ('instagram_url', 'https://instagram.com'),
  ('facebook_url', 'https://facebook.com'),
  ('hours_weekday', '9:00 AM - 7:00 PM'),
  ('hours_saturday', '10:00 AM - 6:00 PM'),
  ('hours_sunday', 'Closed');