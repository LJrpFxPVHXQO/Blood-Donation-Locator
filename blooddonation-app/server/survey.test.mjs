import assert from 'node:assert/strict';
import { after, mock, test } from 'node:test';

// The test server listens on its own port so it never clashes with a running dev server.
process.env.PORT = '3199';

const inserted = [];
let storedRow = null;

// Stands in for MySQL so the API can be exercised without a database.
const fakePool = {
  async query(sql) {
    if (sql.includes('SELECT id, answers, created_at')) {
      return [storedRow ? [storedRow] : [], []];
    }

    if (sql.includes('SELECT id, user_id')) {
      return [storedRow ? [{ id: storedRow.id, name: 'Jane Doe', eligibility_status: 'eligible' }] : [], []];
    }

    return [[], []];
  },
  async execute(sql, params) {
    if (sql.includes('INSERT INTO survey_responses')) {
      inserted.push({ sql, params });
      storedRow = {
        id: inserted.length,
        answers: params[params.length - 1],
        created_at: '2026-10-21 12:00:00',
      };

      return [{ insertId: inserted.length }, []];
    }

    return [[], []];
  },
};

mock.module('mysql2/promise', {
  exports: { default: { createPool: () => fakePool } },
});

const { server } = await import('./index.js');
await new Promise((resolve) => setTimeout(resolve, 300));

const base = `http://127.0.0.1:${process.env.PORT}`;

const answers = {
  name: 'Jane Doe',
  age: '30',
  contact: '09171234567',
  email: 'jane@example.com',
  gender: 'Female',
  weight: '60',
  antibiotics: 'Yes',
  tattoo: 'No',
  piercing: 'No',
  unwell: 'No',
  chronicCondition: 'No',
  medications: 'No',
  surgery: 'No',
  vaccination: 'No',
  recentTravel: 'No',
  donatedBefore: 'No',
  smoking: 'Never',
  alcohol: 'Never',
  exercise: '3-4 times a week',
  bloodType: 'O+',
};

const saveSurvey = async (payload) => {
  const response = await fetch(`${base}/api/surveys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return { status: response.status, body: await response.json() };
};

after(() => server.close());

test('a survey is saved with the decision the shared rules produce', async () => {
  const saved = await saveSurvey({ answers, userId: 7 });

  assert.equal(saved.status, 201);
  assert.equal(saved.body.eligibility.status, 'ineligible');
  assert.equal(saved.body.eligibility.blockers[0].id, 'antibiotics');
});

test('the insert binds one value per placeholder', () => {
  const { sql, params } = inserted[0];
  const placeholders = (sql.match(/\?/g) || []).length;

  assert.equal(placeholders, params.length);
  assert.equal(params[0], 7, 'user id');
  assert.equal(params[1], 'Jane Doe', 'name');
  assert.equal(params[2], 30, 'age');
  assert.equal(params[9], 'ineligible', 'eligibility status');
  assert.equal(params[params.length - 1], JSON.stringify(answers), 'answers json');
});

test('reading the latest survey recomputes the eligibility from the stored answers', async () => {
  const response = await fetch(`${base}/api/surveys/latest`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.eligibility.status, 'ineligible');
  assert.equal(body.eligibility.blockers[0].id, 'antibiotics');
  assert.deepEqual(body.answers, answers);
});

test('the list endpoint returns the stored responses', async () => {
  const response = await fetch(`${base}/api/surveys?status=eligible`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.responses.length, 1);
});

test('a clean survey comes back as eligible', async () => {
  const saved = await saveSurvey({
    answers: { ...answers, antibiotics: 'No', donatedBefore: 'Yes' },
  });

  assert.equal(saved.status, 201);
  assert.equal(saved.body.eligibility.status, 'eligible');
});

test('a survey without the required details is rejected', async () => {
  const missingAnswers = await saveSurvey({});
  const badDetails = await saveSurvey({ answers: { name: '  ', age: 'abc', contact: '' } });

  assert.equal(missingAnswers.status, 400);
  assert.equal(badDetails.status, 400);
});
