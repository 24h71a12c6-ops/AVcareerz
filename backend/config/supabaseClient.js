const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_ANON_KEY || '').trim();

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment variables');
}

if (!/^https?:\/\//i.test(supabaseUrl)) {
  throw new Error('Invalid SUPABASE_URL format (must start with http/https).');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
