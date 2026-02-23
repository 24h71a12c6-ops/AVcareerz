const { createClient } = require('@supabase/supabase-js');

const stripHidden = (value) => String(value || '')
  .replace(/^SUPABASE_URL=/i, '')
  .replace(/^SUPABASE_ANON_KEY=/i, '')
  .replace(/[\u200B-\u200D\uFEFF]/g, '')
  .replace(/\s+/g, '')
  .trim();

const supabaseUrl = stripHidden(process.env.SUPABASE_URL);
const supabaseKey = stripHidden(process.env.SUPABASE_ANON_KEY);

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment variables');
}

if (!/^https?:\/\//i.test(supabaseUrl)) {
  throw new Error('Invalid SUPABASE_URL format (must start with http/https).');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
