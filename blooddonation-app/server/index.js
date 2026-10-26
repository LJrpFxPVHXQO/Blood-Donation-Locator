import 'dotenv/config';
import bcrypt from 'bcryptjs';
import express from 'express';
import mysql from 'mysql2/promise';
import { evaluateEligibility } from '../src/services/eligibility.js';

const app = express();
const port = Number(process.env.PORT || 3001);
let pool = null;
let useInMemory = false;

try {
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'blooddonation',
    waitForConnections: true,
    connectionLimit: 10,
  });
} catch (error) {
  console.warn('Could not initialize MySQL pool, using in-memory fallback:', error.message);
  pool = null;
  useInMemory = true;
}

app.use(express.json());

const surveyResponsesTable = `
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
  )
`;

const bloodCentersTable = `
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
  )
`;

const bloodInventoryTable = `
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
  )
`;

const inMemoryCenters = [
  { id: 1, name: 'East Avenue Medical Center Blood Bank', city: 'Quezon City', address: 'East Avenue, Diliman, Quezon City', contact: '+63 2 928-0611', status: 'open', operating_hours: '24/7', last_updated: new Date().toISOString() },
  { id: 2, name: 'National Kidney and Transplant Institute Blood Bank', city: 'Quezon City', address: 'East Avenue, Quezon City', contact: '+63 2 8981-0300', status: 'open', operating_hours: '24/7', last_updated: new Date().toISOString() },
  { id: 3, name: 'Philippine General Hospital Blood Bank', city: 'Manila', address: 'Taft Avenue, Ermita, Manila', contact: '+63 2 8554-8400', status: 'open', operating_hours: '24/7', last_updated: new Date().toISOString() },
  { id: 4, name: 'Manila Doctors Hospital Blood Bank', city: 'Manila', address: '667 United Nations Ave, Ermita, Manila', contact: '+63 2 558-0888', status: 'open', operating_hours: '24/7', last_updated: new Date().toISOString() },
  { id: 5, name: 'Caloocan City Medical Center Blood Bank', city: 'Caloocan City', address: 'Caloocan City', contact: '+63 2 961-4971', status: 'open', operating_hours: '24/7', last_updated: new Date().toISOString() },
  { id: 6, name: 'Makati Medical Center Blood Bank', city: 'Makati', address: '2 Amorsolo St, Legazpi Village, Makati', contact: '+63 2 8888-8999', status: 'open', operating_hours: '24/7', last_updated: new Date().toISOString() },
  { id: 7, name: 'San Juan De Dios Hospital Blood Bank', city: 'Pasay City', address: '2772 Roxas Blvd, Pasay City', contact: '+63 2 831-9731', status: 'open', operating_hours: '24/7', last_updated: new Date().toISOString() },
  { id: 8, name: 'Rizal Medical Center Blood Bank', city: 'Rizal Main', address: 'Pasig Boulevard, Pasig City', contact: '+63 2 8651-7800', status: 'open', operating_hours: '24/7', last_updated: new Date().toISOString() },
  { id: 9, name: 'Ospital ng Muntinlupa Blood Bank', city: 'Muntinlupa', address: 'Katarungan St, Poblacion, Muntinlupa', contact: '+63 2 8626-3931', status: 'open', operating_hours: '24/7', last_updated: new Date().toISOString() },
];
const inMemoryInventory = [];
const bloodTypesSeed = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
for (const center of inMemoryCenters) {
  for (const bt of bloodTypesSeed) {
    inMemoryInventory.push({
      center_id: center.id,
      blood_type: bt,
      units_available: Math.floor(Math.random() * 20) + 2,
      units_reserved: 0,
      critical_threshold: 5,
      last_updated: new Date().toISOString(),
    });
  }
}

// Creates tables on boot so the feature works without running schema.sql by hand.
const ensureSchema = async () => {
  if (!pool || useInMemory) {
    useInMemory = true;
    return;
  }
  try {
    await pool.query(surveyResponsesTable);
  } catch (error) {
    console.warn('Could not create the survey_responses table:', error.message);
  }
  try {
    await pool.query(bloodCentersTable);
  } catch (error) {
    console.warn('Could not create the blood_centers table:', error.message);
  }
  try {
    await pool.query(bloodInventoryTable);
  } catch (error) {
    console.warn('Could not create the blood_inventory table:', error.message);
  }
};
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
    await pool.execute(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name, email, passwordHash],
    );
    return response.status(201).json({ message: 'Account created. You can now log in.' });
  } catch (error) {
    if (error && error.code === 'ER_DUP_ENTRY') {
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
    const [users] = await pool.execute(
      'SELECT id, name, email, password_hash FROM users WHERE email = ? LIMIT 1',
      [email],
    );
    const user = users[0];

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

app.post('/api/surveys', async (request, response) => {
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
    const [result] = await pool.execute(
      `INSERT INTO survey_responses
        (user_id, name, age, contact, email, gender, city, occupation, blood_type,
         eligibility_status, eligibility_label, eligibility_headline, eligibility_summary,
         next_eligible_date, answers)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        toUserId(request.body?.userId),
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
      ],
    );

    return response.status(201).json({
      message: 'Survey saved.',
      id: result.insertId,
      eligibility: toEligibilityPayload(evaluation),
    });
  } catch (error) {
    console.error('Unable to save the survey response:', error);
    return response.status(500).json({ message: 'Unable to save your survey response.' });
  }
});

app.get('/api/surveys/latest', async (request, response) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, answers, created_at FROM survey_responses ORDER BY id DESC LIMIT 1',
    );
    const row = rows[0];

    if (!row) {
      return response.status(404).json({ message: 'No survey has been submitted yet.' });
    }

    const answers = typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers;
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

app.get('/api/surveys', async (request, response) => {
  const limit = Math.min(Math.max(Number(request.query.limit) || 50, 1), 200);
  const status = cleanText(request.query.status, 20);

  try {
    const [rows] = await pool.query(
      `SELECT id, user_id, name, age, contact, blood_type, eligibility_status, eligibility_label,
              eligibility_headline, next_eligible_date, created_at
         FROM survey_responses
        ${status ? 'WHERE eligibility_status = ?' : ''}
        ORDER BY id DESC
        LIMIT ${limit}`,
      status ? [status] : [],
    );

    return response.json({ responses: rows });
  } catch (error) {
    console.error('Unable to list survey responses:', error);
    return response.status(500).json({ message: 'Unable to list the survey responses.' });
  }
});

// Blood center live tracking APIs
app.get('/api/blood-centers', async (request, response) => {
  const city = cleanText(request.query.city, 120);

  if (useInMemory || !pool) {
    let centers = [...inMemoryCenters];
    if (city) {
      centers = centers.filter((c) => c.city === city);
    }
    centers = centers.sort((a, b) => a.name.localeCompare(b.name));
    return response.json({ centers });
  }

  try {
    let query = 'SELECT * FROM blood_centers';
    const params = [];
    if (city) {
      query += ' WHERE city = ?';
      params.push(city);
    }
    query += ' ORDER BY name ASC';
    const [rows] = await pool.query(query, params);
    return response.json({ centers: rows });
  } catch (error) {
    console.error('Unable to list blood centers:', error);
    let centers = [...inMemoryCenters];
    if (city) {
      centers = centers.filter((c) => c.city === city);
    }
    centers = centers.sort((a, b) => a.name.localeCompare(b.name));
    return response.json({ centers });
  }
});

app.get('/api/blood-centers/:id/inventory', async (request, response) => {
  const centerId = Number(request.params.id);

  if (!Number.isInteger(centerId) || centerId < 1) {
    return response.status(400).json({ message: 'Invalid blood center ID.' });
  }

  if (useInMemory || !pool) {
    const center = inMemoryCenters.find((c) => c.id === centerId);
    if (!center) {
      return response.status(404).json({ message: 'Blood center not found.' });
    }
    const inventory = inMemoryInventory
      .filter((i) => i.center_id === centerId)
      .sort((a, b) => a.blood_type.localeCompare(b.blood_type));
    return response.json({
      center,
      inventory,
      lastUpdated: inventory.length ? inventory[0].last_updated : center.last_updated,
    });
  }

  try {
    const [centerRows] = await pool.query('SELECT * FROM blood_centers WHERE id = ? LIMIT 1', [centerId]);
    const center = centerRows[0];
    if (!center) {
      return response.status(404).json({ message: 'Blood center not found.' });
    }

    const [inventoryRows] = await pool.query(
      'SELECT blood_type, units_available, units_reserved, critical_threshold, last_updated FROM blood_inventory WHERE center_id = ? ORDER BY blood_type ASC',
      [centerId],
    );

    return response.json({
      center,
      inventory: inventoryRows,
      lastUpdated: inventoryRows.length ? inventoryRows[0].last_updated : center.last_updated,
    });
  } catch (error) {
    console.error('Unable to fetch blood center inventory:', error);
    const center = inMemoryCenters.find((c) => c.id === centerId);
    if (!center) {
      return response.status(404).json({ message: 'Blood center not found.' });
    }
    const inventory = inMemoryInventory
      .filter((i) => i.center_id === centerId)
      .sort((a, b) => a.blood_type.localeCompare(b.blood_type));
    return response.json({
      center,
      inventory,
      lastUpdated: inventory.length ? inventory[0].last_updated : center.last_updated,
    });
  }
});

app.post('/api/blood-centers', async (request, response) => {
  const name = cleanText(request.body?.name, 150);
  const city = cleanText(request.body?.city, 120);
  const address = cleanText(request.body?.address, 255);
  const contact = cleanText(request.body?.contact, 60);
  const status = cleanText(request.body?.status, 20) || 'open';
  const operating_hours = cleanText(request.body?.operating_hours, 100);
  const latitude = request.body?.latitude != null ? Number(request.body.latitude) : null;
  const longitude = request.body?.longitude != null ? Number(request.body.longitude) : null;

  if (!name || !city) {
    return response.status(400).json({ message: 'Name and city are required.' });
  }

  if (useInMemory || !pool) {
    const id = inMemoryCenters.length ? Math.max(...inMemoryCenters.map((c) => c.id)) + 1 : 1;
    const center = { id, name, city, address, contact, latitude, longitude, status, operating_hours, last_updated: new Date().toISOString() };
    inMemoryCenters.push(center);
    for (const bt of bloodTypesSeed) {
      inMemoryInventory.push({ center_id: id, blood_type: bt, units_available: 0, units_reserved: 0, critical_threshold: 5, last_updated: new Date().toISOString() });
    }
    return response.status(201).json({ message: 'Blood center created.', id });
  }

  try {
    const [result] = await pool.execute(
      `INSERT INTO blood_centers (name, city, address, contact, latitude, longitude, status, operating_hours)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, city, address, contact, latitude, longitude, status, operating_hours],
    );
    return response.status(201).json({ message: 'Blood center created.', id: result.insertId });
  } catch (error) {
    console.error('Unable to create blood center:', error);
    return response.status(500).json({ message: 'Unable to create blood center.' });
  }
});

app.put('/api/blood-inventory', async (request, response) => {
  const center_id = Number(request.body?.center_id);
  const blood_type = cleanText(request.body?.blood_type, 10);
  const units_available = Number(request.body?.units_available);
  const units_reserved = Number(request.body?.units_reserved) || 0;
  const critical_threshold = Number(request.body?.critical_threshold) || 5;

  if (!Number.isInteger(center_id) || center_id < 1 || !blood_type || !Number.isFinite(units_available) || units_available < 0) {
    return response.status(400).json({ message: 'Valid center_id, blood_type, and non-negative units_available are required.' });
  }

  if (useInMemory || !pool) {
    const idx = inMemoryInventory.findIndex((i) => i.center_id === center_id && i.blood_type === blood_type);
    if (idx >= 0) {
      inMemoryInventory[idx] = { ...inMemoryInventory[idx], units_available: Math.round(units_available), units_reserved: Math.round(units_reserved), critical_threshold: Math.round(critical_threshold), last_updated: new Date().toISOString() };
    } else {
      inMemoryInventory.push({ center_id, blood_type, units_available: Math.round(units_available), units_reserved: Math.round(units_reserved), critical_threshold: Math.round(critical_threshold), last_updated: new Date().toISOString() });
    }
    return response.json({ message: 'Inventory updated.' });
  }

  try {
    await pool.execute(
      `INSERT INTO blood_inventory (center_id, blood_type, units_available, units_reserved, critical_threshold)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         units_available = VALUES(units_available),
         units_reserved = VALUES(units_reserved),
         critical_threshold = VALUES(critical_threshold)`,
      [center_id, blood_type, Math.round(units_available), Math.round(units_reserved), Math.round(critical_threshold)],
    );
    return response.json({ message: 'Inventory updated.' });
  } catch (error) {
    console.error('Unable to update blood inventory:', error);
    const idx = inMemoryInventory.findIndex((i) => i.center_id === center_id && i.blood_type === blood_type);
    if (idx >= 0) {
      inMemoryInventory[idx] = { ...inMemoryInventory[idx], units_available: Math.round(units_available), units_reserved: Math.round(units_reserved), critical_threshold: Math.round(critical_threshold), last_updated: new Date().toISOString() };
    } else {
      inMemoryInventory.push({ center_id, blood_type, units_available: Math.round(units_available), units_reserved: Math.round(units_reserved), critical_threshold: Math.round(critical_threshold), last_updated: new Date().toISOString() });
    }
    return response.json({ message: 'Inventory updated.' });
  }
});

await ensureSchema();

const server = app.listen(port, '127.0.0.1', () => {
  console.log(`Authentication API listening on http://127.0.0.1:${port}`);
});

export { app, server };
