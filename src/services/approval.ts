import { supabase } from '../lib/supabase';

export interface ApprovalToken {
  id: string;
  assignment_id: string;
  token: string;
  user_email?: string;
  expires_at: string;
  used_at?: string;
  created_at: string;
}

// Generate a secure random token
const generateToken = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Create approval token for assignment
export const createApprovalToken = async (assignmentId: string, userEmail: string): Promise<string> => {
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // Token expires in 24 hours

  const { error } = await supabase
    .from('assignment_approval_tokens')
    .insert([{
      assignment_id: assignmentId,
      token: token,
      expires_at: expiresAt.toISOString(),
    }]);

  if (error) {
    console.error('Error creating approval token:', error);
    throw error;
  }

  return token;
};

// Validate approval token
export const validateApprovalToken = async (token: string): Promise<ApprovalToken | null> => {
  const { data, error } = await supabase
    .from('assignment_approval_tokens')
    .select('*')
    .eq('token', token)
    .single();

  if (error || !data) {
    return null;
  }

  // Check if token is expired
  const now = new Date();
  const expiresAt = new Date(data.expires_at);
  
  if (now > expiresAt) {
    return null;
  }

  // Check if token was already used
  if (data.used_at) {
    return null;
  }

  return data;
};

// Mark token as used
export const markTokenAsUsed = async (tokenId: string): Promise<void> => {
  const { error } = await supabase
    .from('assignment_approval_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', tokenId);

  if (error) {
    console.error('Error marking token as used:', error);
    throw error;
  }
};

// Get assignment by token
export const getAssignmentByToken = async (token: string) => {
  const { data: tokenData, error: tokenError } = await supabase
    .from('assignment_approval_tokens')
    .select('assignment_id')
    .eq('token', token)
    .single();

  if (tokenError || !tokenData) {
    return null;
  }

  const { data: assignmentData, error: assignmentError } = await supabase
    .from('assignments')
    .select('*')
    .eq('id', tokenData.assignment_id)
    .single();

  if (assignmentError || !assignmentData) {
    return null;
  }

  // Fetch user info for display (email and full name)
  let userEmail: string | undefined = undefined;
  let userFullName: string | undefined = undefined;
  if (assignmentData.user_id) {
    const { data: userData } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', assignmentData.user_id)
      .single();
    userEmail = userData?.email;
    userFullName = userData?.full_name;
  }

  const assignmentEnriched = {
    ...assignmentData,
    user: userFullName ? { full_name: userFullName } : undefined,
  };

  return {
    assignment: assignmentEnriched,
    userEmail: userEmail || '',
  };
};
