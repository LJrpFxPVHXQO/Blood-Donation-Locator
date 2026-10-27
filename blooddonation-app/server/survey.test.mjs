import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

// The test server uses its own port and a throwaway database so it never touches real data.
const tempDir = mkdtempSync(join(tmpdir(), 'blooddonation-test-'));
process.env.PORT = '3199';
process.env.DB_PATH = join(tempDir, 'test.db');

const { server } = await import('./index.js');
const { default: db } = await import('./db.js');
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

after(() => {
  server.close();
  db.close();
  rmSync(tempDir, { recursive: true, force: true });
});

test('a survey is saved with the decision the shared rules produce', async () => {
  const saved = await saveSurvey({ answers, userId: 7 });

  assert.equal(saved.status, 201);
  assert.equal(saved.body.eligibility.status, 'ineligible');
  assert.equal(saved.body.eligibility.blockers[0].id, 'antibiotics');

  const row = db.prepare('SELECT * FROM survey_responses WHERE id = ?').get(saved.body.id);
  assert.equal(row.user_id, null, 'unknown users are stored anonymously');
  assert.equal(row.name, 'Jane Doe');
  assert.equal(row.age, 30);
  assert.equal(row.eligibility_status, 'ineligible');
  assert.equal(row.answers, JSON.stringify(answers));
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
  const response = await fetch(`${base}/api/surveys?status=ineligible`);
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

test('blood centers are seeded and can be listed with inventory', async () => {
  const list = await (await fetch(`${base}/api/blood-centers`)).json();
  assert.ok(list.centers.length >= 9);

  const detail = await (await fetch(`${base}/api/blood-centers/${list.centers[0].id}/inventory`)).json();
  assert.equal(detail.inventory.length, 8);
});
