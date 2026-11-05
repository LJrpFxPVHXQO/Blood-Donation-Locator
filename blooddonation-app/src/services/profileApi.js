const parseBody = async (response) => {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
};

export async function fetchProfile(userId) {
  try {
    const response = await fetch(`/api/profile/${encodeURIComponent(userId)}`);
    return response.ok ? (await parseBody(response)).profile || null : null;
  } catch {
    return null;
  }
}

export async function saveProfile(userId, { phone, address, emergencyContacts }) {
  const response = await fetch(`/api/profile/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, address, emergencyContacts }),
  });
  const body = await parseBody(response);

  if (!response.ok) {
    throw new Error(body.message || 'Unable to save your profile.');
  }

  return body.profile;
}
