-- Create database
CREATE DATABASE IF NOT EXISTS `abroad_vision_carrerz`;

-- Use the database
USE `abroad_vision_carrerz`;

-- Create registrations table
CREATE TABLE IF NOT EXISTS registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(15) NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX idx_email ON registrations(email);
CREATE INDEX idx_created_at ON registrations(created_at);

-- Create logins table (used by /api/login)
CREATE TABLE IF NOT EXISTS `logins` (
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

-- Create next form table (used by /api/abroad-registration from next-form.html)
CREATE TABLE IF NOT EXISTS `next_form` (
    id INT AUTO_INCREMENT PRIMARY KEY,
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
    cgpa VARCHAR(20),
    backlogs VARCHAR(10),
    preferredCountry VARCHAR(50),
    levelOfStudy VARCHAR(50),
    coaching VARCHAR(50) DEFAULT 'None',
    preferredIntake VARCHAR(50),
    desiredCourse VARCHAR(100),
    budgetRange VARCHAR(50),
    workExperience VARCHAR(50),
    companyName VARCHAR(100),
    role VARCHAR(100),
    duration VARCHAR(50),
    fundingSource VARCHAR(100),
    familyIncome VARCHAR(50),
    loanStatus VARCHAR(20),
    resume LONGBLOB,
    transcripts LONGBLOB,
    passportCopy LONGBLOB,
    testScoreCard LONGBLOB,
    declaration TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_next_form_email ON next_form(email);
CREATE INDEX idx_next_form_created_at ON next_form(created_at);

-- Password reset codes (used by /api/forgot-password)
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

-- Display success message
SELECT 'Database setup complete!' AS message;
