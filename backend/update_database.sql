
-- Make sure you're using the correct database
USE `Abroad Vision Carrerz`;

DROP TABLE IF EXISTS additional_info;

CREATE TABLE additional_info (
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
    collegeName VARCHAR(150),
    yearOfPassing VARCHAR(10),
    cgpa VARCHAR(20),
    backlogs INT,
    preferredCountry VARCHAR(100),
    visaType VARCHAR(50),
    visaNumber VARCHAR(50),
    levelOfStudy VARCHAR(50),
    preferredIntake VARCHAR(50),
    desiredCourse VARCHAR(100),
    budgetRange VARCHAR(50),
    workExperience VARCHAR(10),
    companyName VARCHAR(100),
    role VARCHAR(100),
    duration VARCHAR(50),
    fundingSource VARCHAR(50),
    familyIncome VARCHAR(50),
    loanStatus VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
