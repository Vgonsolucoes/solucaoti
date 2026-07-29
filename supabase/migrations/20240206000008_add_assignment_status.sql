-- Add status column to assignments table
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending_approval';

-- Update existing records to have a status
UPDATE assignments SET status = 'approved' WHERE term_accepted = true;
UPDATE assignments SET status = 'pending_approval' WHERE term_accepted = false;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);