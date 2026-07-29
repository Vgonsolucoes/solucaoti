-- Create table for email approval tokens
CREATE TABLE IF NOT EXISTS assignment_approval_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_approval_tokens_assignment_id ON assignment_approval_tokens(assignment_id);
CREATE INDEX IF NOT EXISTS idx_approval_tokens_token ON assignment_approval_tokens(token);
CREATE INDEX IF NOT EXISTS idx_approval_tokens_user_email ON assignment_approval_tokens(user_email);
CREATE INDEX IF NOT EXISTS idx_approval_tokens_expires_at ON assignment_approval_tokens(expires_at);

-- Enable RLS
ALTER TABLE assignment_approval_tokens ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT ON assignment_approval_tokens TO anon;
GRANT ALL ON assignment_approval_tokens TO authenticated;

-- Create policies
CREATE POLICY "Anyone can view approval tokens" ON assignment_approval_tokens FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage approval tokens" ON assignment_approval_tokens FOR ALL USING (auth.role() = 'authenticated');