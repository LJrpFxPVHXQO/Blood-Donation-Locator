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
