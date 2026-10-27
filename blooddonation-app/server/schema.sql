CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS survey_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users (id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  contact TEXT NOT NULL,
  email TEXT,
  gender TEXT,
  city TEXT,
  occupation TEXT,
  blood_type TEXT,
  eligibility_status TEXT NOT NULL,
  eligibility_label TEXT NOT NULL,
  eligibility_headline TEXT NOT NULL,
  eligibility_summary TEXT NOT NULL,
  next_eligible_date TEXT,
  answers TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS survey_responses_user_idx ON survey_responses (user_id);
CREATE INDEX IF NOT EXISTS survey_responses_status_idx ON survey_responses (eligibility_status);
CREATE INDEX IF NOT EXISTS survey_responses_created_idx ON survey_responses (created_at);

CREATE TABLE IF NOT EXISTS blood_centers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  contact TEXT,
  latitude REAL,
  longitude REAL,
  status TEXT NOT NULL DEFAULT 'open',
  operating_hours TEXT,
  last_updated TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (name, city)
);

CREATE INDEX IF NOT EXISTS blood_centers_city_idx ON blood_centers (city);

CREATE TABLE IF NOT EXISTS blood_inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  center_id INTEGER NOT NULL REFERENCES blood_centers (id) ON DELETE CASCADE,
  blood_type TEXT NOT NULL,
  units_available INTEGER NOT NULL DEFAULT 0,
  units_reserved INTEGER NOT NULL DEFAULT 0,
  critical_threshold INTEGER NOT NULL DEFAULT 5,
  last_updated TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (center_id, blood_type)
);
