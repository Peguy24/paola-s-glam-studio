-- Create cancellation_policies table
CREATE TABLE public.cancellation_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hours_before INTEGER NOT NULL,
  refund_percentage INTEGER NOT NULL CHECK (refund_percentage >= 0 AND refund_percentage <= 100),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cancellation_policies ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admins can CRUD, everyone can view active policies
CREATE POLICY "Admins can manage cancellation policies"
ON public.cancellation_policies
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Everyone can view active cancellation policies"
ON public.cancellation_policies
FOR SELECT
USING (is_active = true);

-- Add refund columns to appointments table
ALTER TABLE public.appointments 
ADD COLUMN refund_status TEXT DEFAULT NULL,
ADD COLUMN refund_amount NUMERIC DEFAULT NULL,
ADD COLUMN refunded_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create trigger for updated_at on cancellation_policies
CREATE TRIGGER update_cancellation_policies_updated_at
BEFORE UPDATE ON public.cancellation_policies
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Seed default cancellation policies
INSERT INTO public.cancellation_policies (hours_before, refund_percentage, display_order, is_active)
VALUES 
  (48, 100, 1, true),
  (24, 50, 2, true),
  (0, 0, 3, true);