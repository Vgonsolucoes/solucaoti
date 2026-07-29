const { sendAssignmentConfirmedEmail } = require('../src/services/email');

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
    const { user_email, user_name, devices } = req.body;

    if (!user_email || !user_name || !devices) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Send confirmation email
    await sendAssignmentConfirmedEmail(user_email, user_name, devices);

    return res.status(200).json({ 
      success: true, 
      message: 'Confirmation email sent successfully' 
    });

  } catch (error) {
    console.error('Error sending confirmation email:', error);
    return res.status(500).json({ 
      error: 'Failed to send confirmation email',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};