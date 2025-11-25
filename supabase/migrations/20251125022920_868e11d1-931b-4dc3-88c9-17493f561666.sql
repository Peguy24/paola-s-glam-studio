-- Create transformations table for before/after gallery
CREATE TABLE public.transformations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  before_image_url TEXT NOT NULL,
  after_image_url TEXT NOT NULL,
  category TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.transformations ENABLE ROW LEVEL SECURITY;

-- Create policies for public viewing
CREATE POLICY "Everyone can view transformations"
ON public.transformations
FOR SELECT
USING (true);

-- Create policies for admin management
CREATE POLICY "Admins can insert transformations"
ON public.transformations
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update transformations"
ON public.transformations
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete transformations"
ON public.transformations
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_transformations_updated_at
BEFORE UPDATE ON public.transformations
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create storage bucket for transformation images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('transformations', 'transformations', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for transformation image uploads
CREATE POLICY "Anyone can view transformation images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'transformations');

CREATE POLICY "Admins can upload transformation images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'transformations' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update transformation images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'transformations' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete transformation images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'transformations' AND has_role(auth.uid(), 'admin'::app_role));