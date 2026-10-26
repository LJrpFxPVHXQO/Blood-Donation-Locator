CREATE DATABASE IF NOT EXISTS blooddonation
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE blooddonation;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY users_email_unique (email)
);

CREATE TABLE IF NOT EXISTS survey_responses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  name VARCHAR(100) NOT NULL,
  age SMALLINT UNSIGNED NOT NULL,
  contact VARCHAR(40) NOT NULL,
  email VARCHAR(254) NULL,
  gender VARCHAR(40) NULL,
  city VARCHAR(120) NULL,
  occupation VARCHAR(120) NULL,
  blood_type VARCHAR(10) NULL,
  eligibility_status VARCHAR(20) NOT NULL,
  eligibility_label VARCHAR(60) NOT NULL,
  eligibility_headline VARCHAR(160) NOT NULL,
  eligibility_summary VARCHAR(255) NOT NULL,
  next_eligible_date DATE NULL,
  answers JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY survey_responses_user_idx (user_id),
  KEY survey_responses_status_idx (eligibility_status),
  KEY survey_responses_created_idx (created_at),
  CONSTRAINT survey_responses_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS blood_centers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  city VARCHAR(120) NOT NULL,
  address VARCHAR(255) NULL,
  contact VARCHAR(60) NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  operating_hours VARCHAR(100) NULL,
  last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY blood_centers_city_idx (city)
);

CREATE TABLE IF NOT EXISTS blood_inventory (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  center_id BIGINT UNSIGNED NOT NULL,
  blood_type VARCHAR(10) NOT NULL,
  units_available INT UNSIGNED NOT NULL DEFAULT 0,
  units_reserved INT UNSIGNED NOT NULL DEFAULT 0,
  critical_threshold INT UNSIGNED NOT NULL DEFAULT 5,
  last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY blood_inventory_center_type_unique (center_id, blood_type),
  CONSTRAINT blood_inventory_center_fk FOREIGN KEY (center_id) REFERENCES blood_centers (id) ON DELETE CASCADE
);
