-- Add payment tracking to appointments
ALTER TABLE public.appointments 
ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'pay_later')),
ADD COLUMN payment_intent_id TEXT,
ADD COLUMN stripe_session_id TEXT;