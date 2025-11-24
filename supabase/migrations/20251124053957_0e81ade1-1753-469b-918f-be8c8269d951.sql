-- Add reminder_sent column to appointments table
ALTER TABLE public.appointments 
ADD COLUMN reminder_sent BOOLEAN NOT NULL DEFAULT false;

-- Add index for efficient querying of appointments needing reminders
CREATE INDEX idx_appointments_reminder 
ON public.appointments (reminder_sent, status)
WHERE reminder_sent = false AND status IN ('pending', 'confirmed');