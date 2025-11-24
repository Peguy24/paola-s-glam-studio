-- Add capacity column to availability_slots table
ALTER TABLE availability_slots 
ADD COLUMN capacity INTEGER NOT NULL DEFAULT 1;

-- Add comment to explain the column
COMMENT ON COLUMN availability_slots.capacity IS 'Maximum number of appointments allowed for this time slot';