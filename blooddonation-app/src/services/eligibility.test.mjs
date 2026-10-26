import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluateEligibility } from './eligibility.js';

const baseAnswers = {
  name: 'Jane Doe',
  age: '30',
  contact: '09171234567',
  gender: 'Female',
  antibiotics: 'No',
  tattoo: 'No',
  piercing: 'No',
  unwell: 'No',
  chronicCondition: 'No',
  medications: 'No',
  surgery: 'No',
  vaccination: 'No',
  recentTravel: 'No',
  donatedBefore: 'Yes',
  weight: '60',
  smoking: 'Never',
  alcohol: 'Never',
  exercise: '3-4 times a week',
  bloodType: 'O+',
};

const evaluate = (overrides) => evaluateEligibility({ ...baseAnswers, ...overrides });
const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

test('a clean survey is eligible', () => {
  const result = evaluate({});

  assert.equal(result.status, 'eligible');
  assert.equal(result.blockers.length, 0);
  assert.equal(result.reviews.length, 0);
  assert.equal(result.complete, true);
});

test('a medical answer that defers the donation blocks it', () => {
  const result = evaluate({ antibiotics: 'Yes' });

  assert.equal(result.status, 'ineligible');
  assert.equal(result.blockers[0].id, 'antibiotics');
});

test('an answer that needs a staff check does not block the donation', () => {
  const result = evaluate({ chronicCondition: 'Yes' });

  assert.equal(result.status, 'review');
  assert.equal(result.reviews[0].id, 'chronicCondition');
  assert.equal(result.blockers.length, 0);
});

test('notes that do not stop the donation stay advisory', () => {
  const result = evaluate({ donatedBefore: 'No', bloodType: "I don't know" });

  assert.equal(result.status, 'eligible');
  assert.deepEqual(
    result.advisories.map((check) => check.id),
    ['firstTimeDonor', 'bloodType'],
  );
});

test('the age limits are applied', () => {
  assert.equal(evaluate({ age: '15' }).status, 'ineligible');
  assert.equal(evaluate({ age: '16' }).status, 'review');
  assert.equal(evaluate({ age: '30' }).status, 'eligible');
  assert.equal(evaluate({ age: '70' }).status, 'review');
});

test('the weight minimum is applied', () => {
  assert.equal(evaluate({ weight: '45' }).status, 'ineligible');
  assert.equal(evaluate({ weight: '50' }).status, 'eligible');
});

test('a donation in the last 56 days blocks the next one', () => {
  const result = evaluate({ lastDonation: daysAgo(10) });

  assert.equal(result.status, 'ineligible');
  assert.equal(result.blockers[0].id, 'donationInterval');
  assert.ok(result.nextEligibleDate instanceof Date);
  assert.ok(result.nextEligibleDate.getTime() > Date.now());
});

test('an older donation does not block the next one', () => {
  const result = evaluate({ lastDonation: daysAgo(120) });

  assert.equal(result.status, 'eligible');
  assert.equal(result.nextEligibleDate, null);
});

test('unanswered questions are reported as pending instead of failing', () => {
  const result = evaluateEligibility({ age: '30' });

  assert.equal(result.complete, false);
  assert.ok(result.pending.length > 0);
  assert.equal(result.blockers.length, 0);
});

test('an empty answer is not read as zero', () => {
  const result = evaluateEligibility({ age: '', weight: '' });

  assert.equal(result.blockers.length, 0);
  assert.equal(result.complete, false);
});
