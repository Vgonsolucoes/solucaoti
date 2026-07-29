const { createClient } = require('@supabase/supabase-js');
const { createApprovalToken, markTokenAsUsed } = require('../src/services/approval');
const { sendAssignmentApprovalEmail } = require('../src/services/email');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { assignment_id, user_email, user_name, devices_count } = req.body;

    if (!assignment_id || !user_email || !user_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get assignment details
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .select('*')
      .eq('id', assignment_id)
      .single();

    if (assignmentError || !assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Check if assignment is still pending approval (using term_accepted)
    if (assignment.term_accepted === true) {
      return res.status(400).json({ error: 'Assignment has already been approved' });
    }

    // Get device details
    const { data: devices, error: devicesError } = await supabase
      .from('devices')
      .select('name, serial_number')
      .in('id', assignment.device_ids);

    if (devicesError) {
      return res.status(500).json({ error: 'Failed to fetch device details' });
    }

    // Create new approval token
    const token = await createApprovalToken(assignment_id, user_email);

    // Send approval email
    await sendAssignmentApprovalEmail(user_email, user_name, devices || [], token);

    return res.status(200).json({ 
      success: true, 
      message: 'Approval email resent successfully' 
    });

  } catch (error) {
    console.error('Error resending approval email:', error);
    return res.status(500).json({ 
      error: 'Failed to resend approval email',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};