-- SQL to create a new table for the second form (abroad registration details)
USE `abroad_vision_carrerz`;

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