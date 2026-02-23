-- Supabase Migration Script for Abroad Vision Carrerz
-- Copy and paste this SQL into your Supabase SQL Editor

-- registrations table
CREATE TABLE IF NOT EXISTS registrations (
  id BIGSERIAL PRIMARY KEY,
  full_name VARCHAR NOT NULL,
  email VARCHAR NOT NULL UNIQUE,
  phone VARCHAR(15) NOT NULL,
  password VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
//function
-- users table
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  full_name VARCHAR NOT NULL,
  email VARCHAR NOT NULL UNIQUE,
  phone VARCHAR(15) NOT NULL,
  country VARCHAR,
  qualification VARCHAR,
  preferred_country VARCHAR,
  budget VARCHAR,
  work_experience VARCHAR,
  registration_status VARCHAR DEFAULT 'step1_complete',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- password_reset_codes table
CREATE TABLE IF NOT EXISTS password_reset_codes (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR NOT NULL,
  code_hash CHAR(64) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- logins table
CREATE TABLE IF NOT EXISTS logins (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT,
  email VARCHAR NOT NULL UNIQUE,
  username VARCHAR,
  password VARCHAR NOT NULL,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- next_form table
CREATE TABLE IF NOT EXISTS next_form (
  id BIGSERIAL PRIMARY KEY,
  fullName VARCHAR NOT NULL,
  dob DATE,
  gender VARCHAR,
  nationality VARCHAR,
  phone VARCHAR(15),
  email VARCHAR,
  city VARCHAR,
  passportStatus VARCHAR,
  passport_id VARCHAR,
  highestQualification VARCHAR,
  currentCourse VARCHAR,
  specialization VARCHAR,
  collegeName VARCHAR,
  yearOfPassing VARCHAR,
  cgpa VARCHAR,
  preferredCountry VARCHAR,
  levelOfStudy VARCHAR,
  coaching VARCHAR,
  preferredIntake VARCHAR,
  desiredCourse VARCHAR,
  budgetRange VARCHAR,
  fundingSource VARCHAR,
  loanStatus VARCHAR,
  declaration INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- additional_info table
CREATE TABLE IF NOT EXISTS additional_info (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR,
  fullName VARCHAR,
  dob DATE,
  gender VARCHAR,
  nationality VARCHAR,
  phone VARCHAR(15),
  city VARCHAR,
  passportStatus VARCHAR,
  passport_id VARCHAR,
  highestQualification VARCHAR,
  currentCourse VARCHAR,
  specialization VARCHAR,
  collegeName VARCHAR,
  yearOfPassing VARCHAR,
  cgpa VARCHAR,
  preferredCountry VARCHAR,
  levelOfStudy VARCHAR,
  coaching VARCHAR,
  preferredIntake VARCHAR,
  desiredCourse VARCHAR,
  budgetRange VARCHAR,
  fundingSource VARCHAR,
  loanStatus VARCHAR,
  declaration INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_registrations_email ON registrations(email);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_codes_email ON password_reset_codes(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_codes_expires_at ON password_reset_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_next_form_email ON next_form(email);
CREATE INDEX IF NOT EXISTS idx_additional_info_email ON additional_info(email);
