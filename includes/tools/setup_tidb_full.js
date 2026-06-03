const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

// Load .env manual parse
const envPath = path.resolve(__dirname, '../backend/.env');
console.log('Resolved .env path:', envPath);

if (fs.existsSync(envPath)) {
    console.log('✅ .env file exists. Checking encoding...');
    const buffer = fs.readFileSync(envPath);
    console.log('First 20 bytes hex:', buffer.subarray(0, 20).toString('hex'));
    
    // Treat as UTF-8
    const content = Buffer.isBuffer(buffer) ? buffer.toString('utf8') : buffer;
    
    content.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=');
            if (key && valueParts.length > 0) {
                const val = valueParts.join('=').trim();
                process.env[key.trim()] = val;
                console.log(`Loaded Key: '${key.trim()}' Value Length: ${val.length}`); 
            }
        }
    });
    console.log('DB_HOST is:', process.env.DB_HOST);
} else {
    console.error('❌ .env file NOT found at:', envPath);
}

async function setupTables() {
    console.log('--- Setting up TiDB Tables ---');
    console.log(`Connecting to Host: ${process.env.DB_HOST}, User: ${process.env.DB_USER}, DB: ${process.env.DB_NAME}`);

    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined
        });

        console.log('✅ Connected to database.');

        // 1. Create Registrations Table
        const createRegistrationsTable = `
            CREATE TABLE IF NOT EXISTS registrations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                full_name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL UNIQUE,
                phone VARCHAR(15) NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_email (email),
                INDEX idx_created_at (created_at)
            );
        `;
        await connection.execute(createRegistrationsTable);
        console.log('✅ Registrations table checked/created.');

        // 2. Create Logins Table
        const createLoginsTable = `
            CREATE TABLE IF NOT EXISTS logins (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                username VARCHAR(150) DEFAULT NULL,
                password VARCHAR(255) NOT NULL,
                last_login TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES registrations(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `;
        await connection.execute(createLoginsTable);
        console.log('✅ Logins table checked/created.');

        // 3. Create Password Reset Codes Table
        const createResetTable = `
            CREATE TABLE IF NOT EXISTS password_reset_codes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                code_hash CHAR(64) NOT NULL,
                expires_at DATETIME NOT NULL,
                used_at DATETIME NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_prc_email (email),
                INDEX idx_prc_expires_at (expires_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `;
        await connection.execute(createResetTable);
        console.log('✅ Password reset codes table checked/created.');

        // 4. Create Next Form Table
        const createNextFormTable = `
            CREATE TABLE IF NOT EXISTS next_form (
                id INT AUTO_INCREMENT PRIMARY KEY,
                registration_id INT NULL,
                fullName VARCHAR(100) NOT NULL,
                dob DATE NOT NULL,
                gender VARCHAR(20) NOT NULL,
                nationality VARCHAR(50) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                email VARCHAR(100) NOT NULL,
                city VARCHAR(50) NOT NULL,
                passportStatus VARCHAR(20) NOT NULL,
                passport_id VARCHAR(30) NOT NULL,
                highestQualification VARCHAR(50) NOT NULL,
                currentCourse VARCHAR(100),
                specialization VARCHAR(100),
                collegeName VARCHAR(100),
                yearOfPassing VARCHAR(10),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (registration_id) REFERENCES registrations(id) ON DELETE SET NULL
            );
        `;
        await connection.execute(createNextFormTable);
        console.log('✅ Next Form table checked/created.');

        // 5. Create users table (found in create_users_table.sql, possibly used elsewhere)
        const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                full_name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                phone VARCHAR(50) NOT NULL,
                country VARCHAR(100) NOT NULL,
                qualification VARCHAR(255),
                preferred_country VARCHAR(100),
                budget VARCHAR(100),
                work_experience VARCHAR(255),
                registration_status ENUM('step1_complete', 'fully_registered') DEFAULT 'step1_complete',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );
        `;
        await connection.execute(createUsersTable);
        console.log('✅ Users table checked/created.');
        
        // 6. Create Additional Info Table (from update_database.sql)
        const createAdditionalInfoTable = `
        CREATE TABLE IF NOT EXISTS additional_info (
            id INT AUTO_INCREMENT PRIMARY KEY,
            fullName VARCHAR(100) NOT NULL,
            dob DATE NOT NULL,
            gender VARCHAR(20) NOT NULL,
            nationality VARCHAR(100) NOT NULL,
            phone VARCHAR(20) NOT NULL,
            email VARCHAR(255) NOT NULL,
            city VARCHAR(100) NOT NULL,
            passportStatus VARCHAR(50) NOT NULL,
            passport_id VARCHAR(50) NOT NULL,
            highestQualification VARCHAR(100) NOT NULL,
            currentCourse VARCHAR(100),
            specialization VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        `;
        await connection.execute(createAdditionalInfoTable);
         console.log('✅ Additional Info table checked/created.');


    } catch (error) {
        console.error('❌ Error setting up tables:', error);
    } finally {
        if (connection) await connection.end();
    }
}

setupTables();
