-- Create recurring patterns table
CREATE TABLE recurring_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  days_of_week JSONB NOT NULL DEFAULT '[]'::jsonb,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  weeks_ahead INTEGER NOT NULL DEFAULT 4,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE recurring_patterns ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view all patterns"
  ON recurring_patterns
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create patterns"
  ON recurring_patterns
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update patterns"
  ON recurring_patterns
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete patterns"
  ON recurring_patterns
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_recurring_patterns_updated_at
  BEFORE UPDATE ON recurring_patterns
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Add comment
COMMENT ON TABLE recurring_patterns IS 'Stores recurring patterns for automatic slot generation';

-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;