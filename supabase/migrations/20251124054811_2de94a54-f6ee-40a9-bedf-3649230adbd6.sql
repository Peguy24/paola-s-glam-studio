-- Create activity log table
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  action_description TEXT NOT NULL,
  target_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all logs
CREATE POLICY "Admins can view all activity logs"
ON public.activity_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert logs
CREATE POLICY "Admins can create activity logs"
ON public.activity_logs
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for better performance
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_action_type ON public.activity_logs(action_type);

-- Create function to log role changes
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_logs (
      user_id,
      action_type,
      action_description,
      target_user_id,
      target_id,
      metadata
    ) VALUES (
      auth.uid(),
      'role_granted',
      'Granted ' || NEW.role || ' role to user',
      NEW.user_id,
      NEW.id,
      jsonb_build_object('role', NEW.role)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.activity_logs (
      user_id,
      action_type,
      action_description,
      target_user_id,
      target_id,
      metadata
    ) VALUES (
      auth.uid(),
      'role_revoked',
      'Revoked ' || OLD.role || ' role from user',
      OLD.user_id,
      OLD.id,
      jsonb_build_object('role', OLD.role)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for role changes
CREATE TRIGGER on_user_role_change
AFTER INSERT OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.log_role_change();

-- Create function to log appointment changes
CREATE OR REPLACE FUNCTION public.log_appointment_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO public.activity_logs (
      user_id,
      action_type,
      action_description,
      target_user_id,
      target_id,
      metadata
    ) VALUES (
      auth.uid(),
      'appointment_updated',
      'Changed appointment status from ' || OLD.status || ' to ' || NEW.status,
      NEW.client_id,
      NEW.id,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'service_type', NEW.service_type
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for appointment updates
CREATE TRIGGER on_appointment_status_change
AFTER UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.log_appointment_change();