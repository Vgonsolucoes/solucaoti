-- Ensure status column exists in assignments table
-- This migration fixes the "Could not find the 'status' column" error

-- Add status column if it doesn't exist
ALTER TABLE assignments 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending_approval';

-- Update existing records to have proper status based on term_accepted
UPDATE assignments SET status = 'approved' WHERE term_accepted = true AND status IS NULL;
UPDATE assignments SET status = 'pending_approval' WHERE term_accepted = false AND status IS NULL;

-- Ensure all records have a status
UPDATE assignments SET status = 'pending_approval' WHERE status IS NULL;

-- Create index for performance if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);

-- Add constraint to ensure only valid statuses
ALTER TABLE assignments 
DROP CONSTRAINT IF EXISTS assignments_status_check;

ALTER TABLE assignments 
ADD CONSTRAINT assignments_status_check 
CHECK (status IN ('pending_approval', 'approved', 'rejected', 'pending'));

-- Update the updated_at timestamp
UPDATE assignments SET updated_at = NOW();