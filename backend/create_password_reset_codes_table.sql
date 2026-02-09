-- Password reset codes table (used by /api/forgot-password and /api/reset-password)
-- Stores a hashed 6-digit code (never store plaintext passwords).

USE `abroad_vision_carrerz`;

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
