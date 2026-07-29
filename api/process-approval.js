const { createClient } = require('@supabase/supabase-js');
const { markTokenAsUsed } = require('../src/services/approval');

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
    const { token, action } = req.body;

    if (!token || !action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    // Get token data
    const { data: tokenData, error: tokenError } = await supabase
      .from('assignment_approval_tokens')
      .select('*')
      .eq('token', token)
      .is('used_at', null)
      .single();

    if (tokenError || !tokenData) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    // Check if token is expired (24 hours)
    const tokenAge = Date.now() - new Date(tokenData.created_at).getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    if (tokenAge > maxAge) {
      return res.status(400).json({ error: 'Token has expired' });
    }

    // Mark token as used
    await markTokenAsUsed(tokenData.id);

    if (action === 'approve') {
      // Update assignment status
      const { error: updateError } = await supabase
        .from('assignments')
        .update({ 
          status: 'approved',
          term_accepted: true,
          accepted_at: new Date().toISOString()
        })
        .eq('id', tokenData.assignment_id);

      if (updateError) throw updateError;

      // Update devices status to assigned
      const { data: assignment } = await supabase
        .from('assignments')
        .select('device_ids')
        .eq('id', tokenData.assignment_id)
        .single();

      if (assignment) {
        const { error: devicesError } = await supabase
          .from('devices')
          .update({ status: 'assigned' })
          .in('id', assignment.device_ids);

        if (devicesError) throw devicesError;
      }

    } else if (action === 'reject') {
      // Update assignment status to rejected
      const { error: updateError } = await supabase
        .from('assignments')
        .update({ 
          status: 'rejected',
          term_accepted: false
        })
        .eq('id', tokenData.assignment_id);

      if (updateError) throw updateError;

      // Update devices status back to available
      const { data: assignment } = await supabase
        .from('assignments')
        .select('device_ids')
        .eq('id', tokenData.assignment_id)
        .single();

      if (assignment) {
        const { error: devicesError } = await supabase
          .from('devices')
          .update({ status: 'available' })
          .in('id', assignment.device_ids);

        if (devicesError) throw devicesError;
      }
    }

    return res.status(200).json({ 
      success: true, 
      message: `Assignment ${action}d successfully` 
    });

  } catch (error) {
    console.error('Error processing approval:', error);
    return res.status(500).json({ 
      error: 'Failed to process approval',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};