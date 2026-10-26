/**
 * Donor eligibility screening.
 *
 * `evaluateEligibility` turns the raw survey answers into a decision:
 *   - eligible   : every donation requirement is met
 *   - review     : a blood center officer has to confirm an answer first
 *   - ineligible : the donor has to wait before donating
 *
 * Every rule reads the answers and returns a plain object, so screening a new
 * survey question only means appending a rule to `eligibilityRules`.
 */

export const ELIGIBILITY_STATUS = {
  ELIGIBLE: 'eligible',
  REVIEW: 'review',
  INELIGIBLE: 'ineligible',
};

export const ELIGIBILITY_LABEL = {
  [ELIGIBILITY_STATUS.ELIGIBLE]: 'Eligible to donate',
  [ELIGIBILITY_STATUS.REVIEW]: 'Eligible after review',
  [ELIGIBILITY_STATUS.INELIGIBLE]: 'Not eligible right now',
};

export const ELIGIBILITY_SHORT_LABEL = {
  [ELIGIBILITY_STATUS.ELIGIBLE]: 'Eligible',
  [ELIGIBILITY_STATUS.REVIEW]: 'Pending review',
  [ELIGIBILITY_STATUS.INELIGIBLE]: 'Not eligible',
};

export const MIN_AGE = 17;
export const MAX_AGE = 65;
export const MIN_WEIGHT_KG = 50;
export const DONATION_INTERVAL_DAYS = 56;

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const STORAGE_KEY = 'blooddonate:eligibility';

const toNumber = (value) => {
  const text = String(value ?? '').trim();

  if (!text) {
    return null;
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
};

const startOfToday = () => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
};

export const formatEligibilityDate = (date) =>
  date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

/** Builds a rule for a plain "Yes / No" question. */
const yesNoRule = ({ id, field, label, severity, blockedDetail, clearDetail }) => ({
  id,
  field,
  label,
  severity,
  evaluate(answers) {
    const value = answers[field];

    if (!value) {
      return { pending: true, detail: `Answer "${label}" to finish this check.` };
    }

    if (value === 'Yes') {
      return { passed: false, detail: blockedDetail };
    }

    return { passed: true, detail: clearDetail };
  },
});

export const eligibilityRules = [
  {
    id: 'age',
    field: 'age',
    label: 'Age requirement',
    evaluate(answers) {
      const age = toNumber(answers.age);

      if (age === null) {
        return { pending: true, detail: 'Enter your age to check the age requirement.' };
      }

      if (age < 16) {
        return {
          passed: false,
          severity: 'blocker',
          detail: `You entered ${age}. Donors must be at least ${MIN_AGE} years old.`,
        };
      }

      if (age < MIN_AGE) {
        return {
          passed: false,
          severity: 'review',
          detail: `Donors aged ${age} can donate with parental consent and local approval.`,
        };
      }

      if (age > MAX_AGE) {
        return {
          passed: false,
          severity: 'review',
          detail: `Donors over ${MAX_AGE} need medical clearance from the blood center.`,
        };
      }

      return {
        passed: true,
        detail: `Age ${age} is inside the ${MIN_AGE}-${MAX_AGE} donation range.`,
      };
    },
  },
  {
    id: 'weight',
    field: 'weight',
    label: 'Weight requirement',
    evaluate(answers) {
      const weight = toNumber(answers.weight);

      if (weight === null) {
        return { pending: true, detail: 'Enter your weight to check the weight requirement.' };
      }

      if (weight < MIN_WEIGHT_KG) {
        return {
          passed: false,
          severity: 'blocker',
          detail: `You entered ${weight} kg. Donors must weigh at least ${MIN_WEIGHT_KG} kg.`,
        };
      }

      return {
        passed: true,
        detail: `${weight} kg meets the ${MIN_WEIGHT_KG} kg minimum.`,
      };
    },
  },
  yesNoRule({
    id: 'antibiotics',
    field: 'antibiotics',
    label: 'Antibiotics (past 14 days)',
    severity: 'blocker',
    blockedDetail:
      'Antibiotics in the past 14 days defer the donation until the infection is cleared and you feel well again.',
    clearDetail: 'No recent antibiotics.',
  }),
  yesNoRule({
    id: 'tattoo',
    field: 'tattoo',
    label: 'Tattoo (this year)',
    severity: 'blocker',
    blockedDetail:
      'A recent tattoo defers the donation until the skin has fully healed, usually six months.',
    clearDetail: 'No recent tattoo.',
  }),
  yesNoRule({
    id: 'piercing',
    field: 'piercing',
    label: 'Body piercing (this year)',
    severity: 'blocker',
    blockedDetail:
      'A recent body piercing defers the donation until the skin has fully healed, usually six months.',
    clearDetail: 'No recent body piercing.',
  }),
  yesNoRule({
    id: 'unwell',
    field: 'unwell',
    label: 'Feeling unwell (past 14 days)',
    severity: 'blocker',
    blockedDetail:
      'Fever, cough or a sore throat in the past 14 days defer the donation. Wait until you are fully well again.',
    clearDetail: 'No recent illness.',
  }),
  {
    id: 'chronicCondition',
    field: 'chronicCondition',
    label: 'Chronic medical condition',
    evaluate(answers) {
      const value = answers.chronicCondition;

      if (!value) {
        return { pending: true, detail: 'Answer the chronic condition question to finish this check.' };
      }

      if (value === 'No') {
        return { passed: true, detail: 'No chronic condition declared.' };
      }

      if (value === 'Not sure') {
        return {
          passed: false,
          severity: 'review',
          detail:
            'You were not sure about a chronic condition, so a blood center officer has to check this with you.',
        };
      }

      return {
        passed: false,
        severity: 'review',
        detail:
          'A chronic condition needs medical clearance from the blood center before you can donate.',
      };
    },
  },
  yesNoRule({
    id: 'medications',
    field: 'medications',
    label: 'Current medication',
    severity: 'review',
    blockedDetail:
      'Some medicines stop you from donating, so a blood center officer has to review your medication.',
    clearDetail: 'No current medication.',
  }),
  yesNoRule({
    id: 'surgery',
    field: 'surgery',
    label: 'Surgery or transfusion (past 12 months)',
    severity: 'blocker',
    blockedDetail:
      'Surgery or a blood transfusion in the past 12 months defers the donation for 12 months.',
    clearDetail: 'No surgery or transfusion in the past 12 months.',
  }),
  yesNoRule({
    id: 'vaccination',
    field: 'vaccination',
    label: 'Vaccination (past 4 weeks)',
    severity: 'review',
    blockedDetail:
      'A recent vaccine may need a longer break, for example for rabies or hepatitis B. Confirm it with the blood center.',
    clearDetail: 'No recent vaccination.',
  }),
  yesNoRule({
    id: 'recentTravel',
    field: 'recentTravel',
    label: 'Travel outside the country (past 12 months)',
    severity: 'review',
    blockedDetail:
      'Travel outside the country can need extra screening, for example when malaria risk is involved.',
    clearDetail: 'No recent travel outside the country.',
  }),
  {
    id: 'donationInterval',
    field: 'lastDonation',
    label: 'Donation interval',
    evaluate(answers) {
      if (answers.donatedBefore !== 'Yes') {
        return { passed: true, detail: 'No previous donation to count.' };
      }

      if (!answers.lastDonation) {
        return { passed: true, detail: 'No previous donation date was given.' };
      }

      const lastDonation = new Date(`${answers.lastDonation}T00:00:00`);

      if (Number.isNaN(lastDonation.getTime())) {
        return { passed: true, detail: 'The previous donation date could not be read.' };
      }

      const daysSince = Math.floor((startOfToday() - lastDonation) / DAY_IN_MS);

      if (daysSince < 0) {
        return { passed: true, detail: 'The previous donation date is in the future.' };
      }

      if (daysSince < DONATION_INTERVAL_DAYS) {
        const nextEligibleDate = new Date(lastDonation.getTime() + DONATION_INTERVAL_DAYS * DAY_IN_MS);

        return {
          passed: false,
          severity: 'blocker',
          nextEligibleDate,
          detail: `Whole blood can be donated once every ${DONATION_INTERVAL_DAYS} days. You can donate again on ${formatEligibilityDate(nextEligibleDate)}.`,
        };
      }

      return { passed: true, detail: `Your last donation was ${daysSince} days ago.` };
    },
  },
  {
    id: 'firstTimeDonor',
    field: 'donatedBefore',
    label: 'Donor history',
    evaluate(answers) {
      if (!answers.donatedBefore) {
        return { pending: true, detail: 'Answer the donor history question to finish this check.' };
      }

      if (answers.donatedBefore === 'No') {
        return {
          passed: false,
          severity: 'advisory',
          detail:
            'First-time donors are welcome. The blood center runs a short health screening and checks your iron level before you donate.',
        };
      }

      return { passed: true, detail: 'Returning donor.' };
    },
  },
  {
    id: 'bloodType',
    field: 'bloodType',
    label: 'Blood type',
    evaluate(answers) {
      if (!answers.bloodType) {
        return { pending: true, detail: 'Choose your blood type to finish this check.' };
      }

      if (answers.bloodType === "I don't know") {
        return {
          passed: false,
          severity: 'advisory',
          detail:
            'Not knowing your blood type does not stop you. The blood center tests a sample after every donation.',
        };
      }

      return { passed: true, detail: `Blood type ${answers.bloodType}.` };
    },
  },
  {
    id: 'smoking',
    field: 'smoking',
    label: 'Smoking',
    evaluate(answers) {
      const value = answers.smoking;

      if (!value) {
        return { pending: true, detail: 'Answer the smoking question to finish this check.' };
      }

      if (value === 'Yes') {
        return {
          passed: false,
          severity: 'advisory',
          detail:
            'Smoking does not disqualify you from donating. Tell the staff so you can rest in a quiet area afterwards.',
        };
      }

      return { passed: true, detail: `Smoking: ${value.toLowerCase()}.` };
    },
  },
  {
    id: 'alcohol',
    field: 'alcohol',
    label: 'Alcohol',
    evaluate(answers) {
      const value = answers.alcohol;

      if (!value) {
        return { pending: true, detail: 'Answer the alcohol question to finish this check.' };
      }

      if (value === 'Regularly') {
        return {
          passed: false,
          severity: 'advisory',
          detail:
            'Regular alcohol use is not a permanent bar, but the center may ask you to wait if you drank in the last 48 hours.',
        };
      }

      return { passed: true, detail: `Alcohol use: ${value.toLowerCase()}.` };
    },
  },
  {
    id: 'exercise',
    field: 'exercise',
    label: 'Exercise',
    evaluate(answers) {
      const value = answers.exercise;

      if (!value) {
        return { pending: true, detail: 'Answer the exercise question to finish this check.' };
      }

      if (value === 'Rarely') {
        return {
          passed: false,
          severity: 'advisory',
          detail:
            'Exercise is not required to donate, but low activity can slow your circulation. Drink plenty of water before donating.',
        };
      }

      return { passed: true, detail: `Exercise: ${value.toLowerCase()}.` };
    },
  },
];

/**
 * Screens the survey answers and returns the donation decision.
 */
export function evaluateEligibility(answers = {}) {
  const checks = eligibilityRules.map((rule) => {
    const outcome = rule.evaluate(answers) || {};

    return {
      id: rule.id,
      field: rule.field,
      label: rule.label,
      passed: outcome.passed === true,
      pending: outcome.pending === true,
      severity: outcome.severity || rule.severity || 'advisory',
      detail: outcome.detail || '',
      nextEligibleDate: outcome.nextEligibleDate || null,
    };
  });

  const blockers = checks.filter((check) => !check.passed && !check.pending && check.severity === 'blocker');
  const reviews = checks.filter((check) => !check.passed && !check.pending && check.severity === 'review');
  const advisories = checks.filter((check) => !check.passed && !check.pending && check.severity === 'advisory');
  const pending = checks.filter((check) => check.pending);
  const passed = checks.filter((check) => check.passed);

  let status = ELIGIBILITY_STATUS.ELIGIBLE;

  if (blockers.length > 0) {
    status = ELIGIBILITY_STATUS.INELIGIBLE;
  } else if (reviews.length > 0) {
    status = ELIGIBILITY_STATUS.REVIEW;
  }

  const nextEligibleDate =
    blockers
      .map((check) => check.nextEligibleDate)
      .filter(Boolean)
      .sort((first, second) => first - second)[0] || null;

  return {
    status,
    label: ELIGIBILITY_LABEL[status],
    shortLabel: ELIGIBILITY_SHORT_LABEL[status],
    headline: getHeadline(status),
    summary: getSummary(status, blockers, reviews),
    complete: pending.length === 0,
    blockers,
    reviews,
    advisories,
    passed,
    pending,
    nextEligibleDate,
  };
}

function getHeadline(status) {
  if (status === ELIGIBILITY_STATUS.INELIGIBLE) {
    return 'You are not eligible to donate right now';
  }

  if (status === ELIGIBILITY_STATUS.REVIEW) {
    return 'You can donate once a few answers are confirmed';
  }

  return 'You are eligible to donate blood';
}

function getSummary(status, blockers, reviews) {
  if (status === ELIGIBILITY_STATUS.INELIGIBLE) {
    return blockers.length === 1
      ? 'One of your answers currently stops you from donating.'
      : `${blockers.length} of your answers currently stop you from donating.`;
  }

  if (status === ELIGIBILITY_STATUS.REVIEW) {
    return reviews.length === 1
      ? 'One answer needs a quick check by a blood center officer before you donate.'
      : `${reviews.length} answers need a quick check by a blood center officer before you donate.`;
  }

  return 'Every answer in the survey meets our donation requirements.';
}

const serializeCheck = (check) => ({
  ...check,
  nextEligibleDate: check.nextEligibleDate ? check.nextEligibleDate.toISOString() : null,
});

const deserializeCheck = (check) => ({
  ...check,
  nextEligibleDate: check.nextEligibleDate ? new Date(check.nextEligibleDate) : null,
});

/** Keeps the last decision so the donor status survives a page reload. */
export function storeEligibility(result) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...result,
        nextEligibleDate: result.nextEligibleDate ? result.nextEligibleDate.toISOString() : null,
        blockers: result.blockers.map(serializeCheck),
        reviews: result.reviews.map(serializeCheck),
        advisories: result.advisories.map(serializeCheck),
        passed: result.passed.map(serializeCheck),
        pending: result.pending.map(serializeCheck),
      }),
    );
  } catch {
    // Storage can be unavailable (private mode, blocked cookies). The result still shows on screen.
  }
}

/** Reads the last decision that was stored on this device. */
export function loadStoredEligibility() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);

    if (!parsed || !parsed.status) {
      return null;
    }

    return {
      ...parsed,
      nextEligibleDate: parsed.nextEligibleDate ? new Date(parsed.nextEligibleDate) : null,
      blockers: (parsed.blockers || []).map(deserializeCheck),
      reviews: (parsed.reviews || []).map(deserializeCheck),
      advisories: (parsed.advisories || []).map(deserializeCheck),
      passed: (parsed.passed || []).map(deserializeCheck),
      pending: (parsed.pending || []).map(deserializeCheck),
    };
  } catch {
    return null;
  }
}
