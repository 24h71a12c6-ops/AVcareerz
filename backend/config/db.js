const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const { loadEnv } = require('../utils/loadEnv');

// Load environment variables
loadEnv(path.join(__dirname, '..', '.env'), { override: true });

const dbPort = parseInt(process.env.DB_PORT || '4000', 10);
// backend/config/db.js
// path.join(process.cwd(), 'ca.pem') badulu kinda line pettu:

const caPath = path.join(__dirname, '..', 'ca.pem');
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'test',
    port: dbPort,
    ssl: {
        // Direct ga root folder lo unna ca.pem ni chaduvuthundi
        ca: fs.readFileSync(caPath),
        rejectUnauthorized: true
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test connection logic
pool.getConnection()
    .then(connection => {
        console.log('✅ Connected to TiDB Database successfully!');
        connection.release();
    })
    .catch(err => {
        console.error('✗ TiDB connection error:', err.message);
    });

module.exports = pool;