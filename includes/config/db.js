const db = require('./firebaseClient');

// Test connection by fetching one document from a known collection
async function testConnection() {
    try {
        const snap = await db.collection('registrations').limit(1).get();
        console.log('✅ Connected to Firestore successfully! Document count:', snap.size);
    } catch (err) {
        console.error('✗ Firestore connection error:', err.message);
    }
}

testConnection();

module.exports = db;