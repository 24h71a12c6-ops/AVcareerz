const supabase = require('./supabaseClient');

// Test connection
async function testConnection() {
    try {
        const { data, error } = await supabase.from('registrations').select('count', { count: 'exact', head: true });
        if (error) throw error;
        console.log('✅ Connected to Supabase successfully!');
    } catch (err) {
        console.error('✗ Supabase connection error:', err.message);
    }
}

testConnection();

module.exports = supabase;