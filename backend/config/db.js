const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs'); // <--- Idi add cheyali
const { loadEnv } = require('../utils/loadEnv');

// Load environment variables
loadEnv(path.join(__dirname, '..', '.env'), { override: true });

const dbPort = parseInt(process.env.DB_PORT || '4000', 10);

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'test',
    port: dbPort,
    // TiDB CLOUD kosam SSL update:
    ssl: {
        // '../ca.pem' endukante: ee file 'config' folder lo undi, 'ca.pem' bayata undi.
        ca: fs.readFileSync(path.join(__dirname, '..', 'ca.pem')), 
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