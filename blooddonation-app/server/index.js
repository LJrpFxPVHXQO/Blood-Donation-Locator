import 'dotenv/config';
import bcrypt from 'bcryptjs';
import express from 'express';
import db from './db.js';
import { evaluateEligibility } from '../src/services/eligibility.js';

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(express.json());

const insertUser = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)');
const findUserByEmail = db.prepare(
  'SELECT id, name, email, password_hash FROM users WHERE email = ? LIMIT 1',
);

app.post('/api/auth/signup', async (request, response) => {
  const email = typeof request.body.email === 'string' ? request.body.email.trim().toLowerCase() : '';
  const password = typeof request.body.password === 'string' ? request.body.password : '';
  // Signup only asks for an email, so the display name defaults to the part before the @.
  const providedName = typeof request.body.name === 'string' ? request.body.name.trim() : '';
  const name = providedName || email.split('@')[0];

  if (!name || name.length > 100) {
    return response.status(400).json({ message: 'Enter a name between 1 and 100 characters.' });
  }

  if (!email || email.length > 254) {
    return response.status(400).json({ message: 'Enter an email address up to 254 characters.' });
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

// Profiles
const findProfileUser = db.prepare(
  'SELECT id, email, phone, address FROM users WHERE id = ? LIMIT 1',
);
const latestSurveyForUser = db.prepare(
  `SELECT name, age, gender, city, occupation, contact, blood_type FROM survey_responses
    WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
);
const listContacts = db.prepare(
  'SELECT id, name, phone, relationship FROM emergency_contacts WHERE user_id = ? ORDER BY id ASC',
);
const updateUserContact = db.prepare('UPDATE users SET phone = ?, address = ? WHERE id = ?');
const deleteContacts = db.prepare('DELETE FROM emergency_contacts WHERE user_id = ?');
const insertContact = db.prepare(
  'INSERT INTO emergency_contacts (user_id, name, phone, relationship) VALUES (?, ?, ?, ?)',
);

// A fresh account only has an ID and an email; the rest fills in from the donor survey.
const readProfile = (userId) => {
  const user = findProfileUser.get(userId);
  if (!user) {
    return null;
  }

  const survey = latestSurveyForUser.get(userId);

  return {
    id: user.id,
    email: user.email,
    donorId: String(user.id).padStart(3, '0'),
    hasSurvey: Boolean(survey),
    name: survey?.name || '',
    age: survey?.age ?? null,
    gender: survey?.gender || '',
    city: survey?.city || '',
    occupation: survey?.occupation || '',
    bloodType: survey?.blood_type || '',
    phone: user.phone || survey?.contact || '',
    address: user.address || '',
    emergencyContacts: listContacts.all(userId).map((contact) => ({
      id: contact.id,
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship || '',
    })),
  };
};

app.get('/api/profile/:id', (request, response) => {
  const userId = toUserId(request.params.id);
  const profile = userId ? readProfile(userId) : null;

  if (!profile) {
    return response.status(404).json({ message: 'Profile not found.' });
  }

  return response.json({ profile });
});

app.put('/api/profile/:id', (request, response) => {
  const userId = toUserId(request.params.id);

  if (!userId || !findProfileUser.get(userId)) {
    return response.status(404).json({ message: 'Profile not found.' });
  }

  const contacts = Array.isArray(request.body?.emergencyContacts) ? request.body.emergencyContacts : [];
  const cleanedContacts = contacts
    .map((contact) => ({
      name: cleanText(contact?.name, 100),
      phone: cleanText(contact?.phone, 40),
      relationship: cleanText(contact?.relationship, 60),
    }))
    .filter((contact) => contact.name && contact.phone);

  try {
    db.exec('BEGIN');
    try {
      updateUserContact.run(
        cleanText(request.body?.phone, 40),
        cleanText(request.body?.address, 255),
        userId,
      );
      deleteContacts.run(userId);
      cleanedContacts.forEach((contact) => {
        insertContact.run(userId, contact.name, contact.phone, contact.relationship);
      });
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }

    return response.json({ message: 'Profile saved.', profile: readProfile(userId) });
  } catch (error) {
    console.error('Unable to save the profile:', error);
    return response.status(500).json({ message: 'Unable to save your profile.' });
  }
});

const server = app.listen(port, '127.0.0.1', () => {
  console.log(`Authentication and survey API listening on http://127.0.0.1:${port}`);
  console.log('Live blood center tracking is served by the Java service on port 3002.');
});

export { app, server };
