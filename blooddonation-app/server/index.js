import 'dotenv/config';
import bcrypt from 'bcryptjs';
import express from 'express';
import db, { bloodTypes } from './db.js';
import { evaluateEligibility } from '../src/services/eligibility.js';

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(express.json());

const insertUser = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)');
const findUserByEmail = db.prepare(
  'SELECT id, name, email, password_hash FROM users WHERE email = ? LIMIT 1',
);

app.post('/api/auth/signup', async (request, response) => {
  const name = typeof request.body.name === 'string' ? request.body.name.trim() : '';
  const email = typeof request.body.email === 'string' ? request.body.email.trim().toLowerCase() : '';
  const password = typeof request.body.password === 'string' ? request.body.password : '';

  if (!name || name.length > 100) {
    return response.status(400).json({ message: 'Enter a name between 1 and 100 characters.' });
  }

  if (!email || email.length > 254) {
    return response.status(400).json({ message: 'Enter an email address or username up to 254 characters.' });
  }

  if (password.length < 4 || Buffer.byteLength(password, 'utf8') > 72) {
    return response.status(400).json({ message: 'Password must be 4 to 72 bytes long.' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    insertUser.run(name, email, passwordHash);
    return response.status(201).json({ message: 'Account created. You can now log in.' });
  } catch (error) {
    if (error && /UNIQUE constraint failed/i.test(error.message)) {
      return response.status(409).json({ message: 'An account with that email already exists.' });
    }

    console.error('Unable to create user account:', error);
    return response.status(500).json({ message: 'Unable to create your account. Please try again.' });
  }
});

app.post('/api/auth/login', async (request, response) => {
  const email = typeof request.body.email === 'string' ? request.body.email.trim().toLowerCase() : '';
  const password = typeof request.body.password === 'string' ? request.body.password : '';

  if (!email || !password) {
    return response.status(400).json({ message: 'Enter your email address or username and password.' });
  }

  try {
    const user = findUserByEmail.get(email);

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return response.status(401).json({ message: 'Email address or password is incorrect.' });
    }

    return response.json({
      message: 'Login successful.',
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error('Unable to log in user:', error);
    return response.status(500).json({ message: 'Unable to log in. Please try again.' });
  }
});

const cleanText = (value, maxLength) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
};

const toUserId = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const findUserById = db.prepare('SELECT id FROM users WHERE id = ? LIMIT 1');

// Unknown users are stored as anonymous instead of failing the foreign key.
const existingUserId = (value) => {
  const id = toUserId(value);
  return id && findUserById.get(id) ? id : null;
};

const toEligibilityPayload = (evaluation) => ({
  status: evaluation.status,
  label: evaluation.label,
  shortLabel: evaluation.shortLabel,
  headline: evaluation.headline,
  summary: evaluation.summary,
  complete: evaluation.complete,
  nextEligibleDate: evaluation.nextEligibleDate ? evaluation.nextEligibleDate.toISOString() : null,
  blockers: evaluation.blockers.map((check) => ({ ...check, nextEligibleDate: null })),
  reviews: evaluation.reviews.map((check) => ({ ...check, nextEligibleDate: null })),
  advisories: evaluation.advisories.map((check) => ({ ...check, nextEligibleDate: null })),
  passed: evaluation.passed.map((check) => ({ ...check, nextEligibleDate: null })),
  pending: evaluation.pending.map((check) => ({ ...check, nextEligibleDate: null })),
});

const insertSurvey = db.prepare(
  `INSERT INTO survey_responses
    (user_id, name, age, contact, email, gender, city, occupation, blood_type,
     eligibility_status, eligibility_label, eligibility_headline, eligibility_summary,
     next_eligible_date, answers)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
);
const latestSurvey = db.prepare(
  'SELECT id, answers, created_at FROM survey_responses ORDER BY id DESC LIMIT 1',
);
const listSurveys = db.prepare(
  `SELECT id, user_id, name, age, contact, blood_type, eligibility_status, eligibility_label,
          eligibility_headline, next_eligible_date, created_at
     FROM survey_responses
    WHERE ? IS NULL OR eligibility_status = ?
    ORDER BY id DESC
    LIMIT ?`,
);

app.post('/api/surveys', (request, response) => {
  const answers = request.body?.answers;

  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return response.status(400).json({ message: 'Send the survey answers in an "answers" object.' });
  }

  const name = cleanText(answers.name, 100);
  const contact = cleanText(answers.contact, 40);
  const age = Number(answers.age);

  if (!name || !contact || !Number.isFinite(age) || age < 1 || age > 120) {
    return response
      .status(400)
      .json({ message: 'A name, contact number and age are required to save a survey.' });
  }

  // The same rules module the frontend uses, so both sides always agree.
  const evaluation = evaluateEligibility(answers);

  try {
    const result = insertSurvey.run(
      existingUserId(request.body?.userId),
      name,
      Math.round(age),
      contact,
      cleanText(answers.email, 254),
      cleanText(answers.gender, 40),
      cleanText(answers.city, 120),
      cleanText(answers.occupation, 120),
      cleanText(answers.bloodType, 10),
      evaluation.status,
      evaluation.label,
      evaluation.headline,
      evaluation.summary,
      evaluation.nextEligibleDate ? evaluation.nextEligibleDate.toISOString().slice(0, 10) : null,
      JSON.stringify(answers),
    );

    return response.status(201).json({
      message: 'Survey saved.',
      id: Number(result.lastInsertRowid),
      eligibility: toEligibilityPayload(evaluation),
    });
  } catch (error) {
    console.error('Unable to save the survey response:', error);
    return response.status(500).json({ message: 'Unable to save your survey response.' });
  }
});

app.get('/api/surveys/latest', (request, response) => {
  try {
    const row = latestSurvey.get();

    if (!row) {
      return response.status(404).json({ message: 'No survey has been submitted yet.' });
    }

    const answers = JSON.parse(row.answers);
    const evaluation = evaluateEligibility(answers || {});

    return response.json({
      id: row.id,
      createdAt: row.created_at,
      answers: answers || {},
      eligibility: toEligibilityPayload(evaluation),
    });
  } catch (error) {
    console.error('Unable to read the latest survey response:', error);
    return response.status(500).json({ message: 'Unable to read your saved survey response.' });
  }
});

app.get('/api/surveys', (request, response) => {
  const limit = Math.min(Math.max(Number(request.query.limit) || 50, 1), 200);
  const status = cleanText(request.query.status, 20);

  try {
    return response.json({ responses: listSurveys.all(status, status, limit) });
  } catch (error) {
    console.error('Unable to list survey responses:', error);
    return response.status(500).json({ message: 'Unable to list the survey responses.' });
  }
});

// Blood center live tracking APIs
const listCenters = db.prepare(
  'SELECT * FROM blood_centers WHERE ? IS NULL OR city = ? ORDER BY name ASC',
);
const findCenterById = db.prepare('SELECT * FROM blood_centers WHERE id = ? LIMIT 1');
const listInventory = db.prepare(
  `SELECT blood_type, units_available, units_reserved, critical_threshold, last_updated
     FROM blood_inventory WHERE center_id = ? ORDER BY blood_type ASC`,
);
const insertCenter = db.prepare(
  `INSERT INTO blood_centers (name, city, address, contact, latitude, longitude, status, operating_hours)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
);
const insertEmptyStock = db.prepare(
  'INSERT INTO blood_inventory (center_id, blood_type, units_available) VALUES (?, ?, 0)',
);
const upsertInventory = db.prepare(
  `INSERT INTO blood_inventory (center_id, blood_type, units_available, units_reserved, critical_threshold)
   VALUES (?, ?, ?, ?, ?)
   ON CONFLICT(center_id, blood_type) DO UPDATE SET
     units_available = excluded.units_available,
     units_reserved = excluded.units_reserved,
     critical_threshold = excluded.critical_threshold,
     last_updated = CURRENT_TIMESTAMP`,
);

app.get('/api/blood-centers', (request, response) => {
  const city = cleanText(request.query.city, 120);

  try {
    return response.json({ centers: listCenters.all(city, city) });
  } catch (error) {
    console.error('Unable to list blood centers:', error);
    return response.status(500).json({ message: 'Unable to list blood centers.' });
  }
});

app.get('/api/blood-centers/:id/inventory', (request, response) => {
  const centerId = Number(request.params.id);

  if (!Number.isInteger(centerId) || centerId < 1) {
    return response.status(400).json({ message: 'Invalid blood center ID.' });
  }

  try {
    const center = findCenterById.get(centerId);
    if (!center) {
      return response.status(404).json({ message: 'Blood center not found.' });
    }

    const inventory = listInventory.all(centerId);

    return response.json({
      center,
      inventory,
      lastUpdated: inventory.length ? inventory[0].last_updated : center.last_updated,
    });
  } catch (error) {
    console.error('Unable to fetch blood center inventory:', error);
    return response.status(500).json({ message: 'Unable to fetch blood center inventory.' });
  }
});

app.post('/api/blood-centers', (request, response) => {
  const name = cleanText(request.body?.name, 150);
  const city = cleanText(request.body?.city, 120);
  const address = cleanText(request.body?.address, 255);
  const contact = cleanText(request.body?.contact, 60);
  const status = cleanText(request.body?.status, 20) || 'open';
  const operatingHours = cleanText(request.body?.operating_hours, 100);
  const latitude = request.body?.latitude != null ? Number(request.body.latitude) : null;
  const longitude = request.body?.longitude != null ? Number(request.body.longitude) : null;

  if (!name || !city) {
    return response.status(400).json({ message: 'Name and city are required.' });
  }

  try {
    db.exec('BEGIN');
    try {
      const result = insertCenter.run(name, city, address, contact, latitude, longitude, status, operatingHours);
      const id = Number(result.lastInsertRowid);
      bloodTypes.forEach((bloodType) => insertEmptyStock.run(id, bloodType));
      db.exec('COMMIT');
      return response.status(201).json({ message: 'Blood center created.', id });
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  } catch (error) {
    if (error && /UNIQUE constraint failed/i.test(error.message)) {
      return response.status(409).json({ message: 'That blood center already exists in this city.' });
    }

    console.error('Unable to create blood center:', error);
    return response.status(500).json({ message: 'Unable to create blood center.' });
  }
});

app.put('/api/blood-inventory', (request, response) => {
  const centerId = Number(request.body?.center_id);
  const bloodType = cleanText(request.body?.blood_type, 10);
  const unitsAvailable = Number(request.body?.units_available);
  const unitsReserved = Number(request.body?.units_reserved) || 0;
  const criticalThreshold = Number(request.body?.critical_threshold) || 5;

  if (!Number.isInteger(centerId) || centerId < 1 || !bloodType || !Number.isFinite(unitsAvailable) || unitsAvailable < 0) {
    return response.status(400).json({ message: 'Valid center_id, blood_type, and non-negative units_available are required.' });
  }

  try {
    if (!findCenterById.get(centerId)) {
      return response.status(404).json({ message: 'Blood center not found.' });
    }

    upsertInventory.run(
      centerId,
      bloodType,
      Math.round(unitsAvailable),
      Math.round(unitsReserved),
      Math.round(criticalThreshold),
    );
    return response.json({ message: 'Inventory updated.' });
  } catch (error) {
    console.error('Unable to update blood inventory:', error);
    return response.status(500).json({ message: 'Unable to update blood inventory.' });
  }
});

const server = app.listen(port, '127.0.0.1', () => {
  console.log(`Authentication API listening on http://127.0.0.1:${port}`);
});

export { app, server };
