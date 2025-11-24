-- Create notification_history table to track sent notifications
CREATE TABLE public.notification_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  recipient_email TEXT,
  recipient_phone TEXT,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('email', 'sms', 'both')),
  change_type TEXT NOT NULL CHECK (change_type IN ('cancelled', 'modified', 'reminder', 'confirmation')),
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB
);

-- Enable RLS
ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;

-- Admins can view all notification history
CREATE POLICY "Admins can view all notification history"
  ON public.notification_history
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_notification_history_sent_at ON public.notification_history(sent_at DESC);
CREATE INDEX idx_notification_history_appointment_id ON public.notification_history(appointment_id);