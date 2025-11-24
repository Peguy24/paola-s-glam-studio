-- Add service_id column to appointments table
ALTER TABLE public.appointments
ADD COLUMN service_id UUID REFERENCES public.services(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_appointments_service_id ON public.appointments(service_id);

-- Update existing appointments to link to services where service_type matches service name
UPDATE public.appointments
SET service_id = (
  SELECT id FROM public.services
  WHERE LOWER(public.services.name) = LOWER(public.appointments.service_type)
  LIMIT 1
)
WHERE service_id IS NULL AND service_type IS NOT NULL;