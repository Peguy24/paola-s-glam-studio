-- Create ratings table
CREATE TABLE public.ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(appointment_id)
);

-- Enable RLS
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Clients can view all ratings
CREATE POLICY "Anyone can view ratings"
ON public.ratings
FOR SELECT
USING (true);

-- Clients can create ratings for their own completed appointments
CREATE POLICY "Clients can create ratings for own appointments"
ON public.ratings
FOR INSERT
WITH CHECK (
  client_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.appointments
    WHERE appointments.id = appointment_id
    AND appointments.client_id = auth.uid()
    AND appointments.status = 'completed'
  )
);

-- Clients can update their own ratings
CREATE POLICY "Clients can update own ratings"
ON public.ratings
FOR UPDATE
USING (client_id = auth.uid());

-- Admins can view all ratings
CREATE POLICY "Admins can view all ratings"
ON public.ratings
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete ratings
CREATE POLICY "Admins can delete ratings"
ON public.ratings
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_ratings_updated_at
BEFORE UPDATE ON public.ratings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();