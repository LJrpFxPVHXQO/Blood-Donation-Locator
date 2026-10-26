/**
 * Talks to the survey API. Every call fails soft: when the API or the database
 * is unavailable the donor keeps the result that was stored on the device.
 */

const parseBody = async (response) => {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
};

// The API sends dates as strings, the UI works with Date objects.
const normalizeEligibility = (eligibility) => {
  if (!eligibility) {
    return null;
  }

  return {
    ...eligibility,
    nextEligibleDate: eligibility.nextEligibleDate ? new Date(eligibility.nextEligibleDate) : null,
  };
};

export async function submitSurvey(answers, userId) {
  try {
    const response = await fetch('/api/surveys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers, userId: userId ?? null }),
    });

    if (!response.ok) {
      return null;
    }

    const body = await parseBody(response);
    return normalizeEligibility(body.eligibility);
  } catch {
    return null;
  }
}

export async function fetchLatestSurvey() {
  try {
    const response = await fetch('/api/surveys/latest');

    if (!response.ok) {
      return null;
    }

    const body = await parseBody(response);
    return normalizeEligibility(body.eligibility);
  } catch {
    return null;
  }
}
