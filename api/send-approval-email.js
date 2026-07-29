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
    const { assignment_id, user_email, user_name, devices } = req.body;

    if (!assignment_id || !user_email || !user_name || !devices) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create approval token
    const token = await createApprovalToken(assignment_id, user_email);

    // Send approval email
    await sendAssignmentApprovalEmail(user_email, user_name, devices, token);

    return res.status(200).json({ 
      success: true, 
      message: 'Approval email sent successfully' 
    });

  } catch (error) {
    console.error('Error sending approval email:', error);
    return res.status(500).json({ 
      error: 'Failed to send approval email',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};