const supabase = require('../config/supabaseClient');
const crypto = require('crypto');

const healthCheck = async (req, res) => {
  try {
    const { error } = await supabase.from('registrations').select('count', { count: 'exact', head: true });
    if (error) throw error;
    res.json({ ok: true, status: 'Live', db: 'Connected', timestamp: new Date() });
  } catch (err) {
    res.status(500).json({
      ok: false,
      status: 'Live',
      db: 'Disconnected',
      error: err.message,
      timestamp: new Date()
    });
  }
};

const register = async (req, res) => {
  try {
    const { fullName, email, phone, password } = req.body;
    if (!fullName || !email || !phone || !password) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    const { data, error } = await supabase
      .from('registrations')
      .insert([{
        full_name: fullName,
        email,
        phone,
        password
      }])
      .select();

    if (error) {
      if (error.message.includes('duplicate') || error.code === '23505') {
        return res.status(409).json({
          success: false,
          error: 'This email is already registered. Please log in.'
        });
      }
      throw error;
    }

    res.status(201).json({ success: true, message: 'Registration successful!', userId: data[0].id });
  } catch (error) {
    console.error('Reg Error:', error);
    res.status(500).json({ success: false, error: 'Registration failed: ' + error.message });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

  try {
    const { data: users, error: findError } = await supabase
      .from('registrations')
      .select('*')
      .eq('email', email)
      .limit(1);

    if (findError || !users || users.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Email not registered. Please sign up first.'
      });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`🔑 DEBUG: Password reset code for ${email}: ${code}`);

    const codeHash = crypto.createHash('sha256').update(code + process.env.RESET_PASSWORD_PEPPER).digest('hex');
    const expiresAt = new Date(Date.now() + 1 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase
      .from('password_reset_codes')
      .insert([{
        email,
        code_hash: codeHash,
        expires_at: expiresAt
      }]);

    if (insertError) throw insertError;

    const { sendLoginCodeEmail } = require('../services/emailService');
    await sendLoginCodeEmail(email, code);

    return res.json({ success: true, message: 'Code sent successfully via email.' });
  } catch (error) {
    console.error('Forgot password error details:', error.message, error.stack);
    return res.status(500).json({
      success: false,
      error: 'Server error during password reset: ' + error.message
    });
  }
};

module.exports = {
  healthCheck,
  register,
  forgotPassword
};
