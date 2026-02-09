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
