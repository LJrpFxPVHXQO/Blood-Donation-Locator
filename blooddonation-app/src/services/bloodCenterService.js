const API_BASE = import.meta.env.VITE_API_BASE || '';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'object' && payload && payload.message ? payload.message : response.statusText;
    throw new Error(message);
  }

  return payload;
}

export function fetchBloodCenters(city) {
  const query = city ? `?city=${encodeURIComponent(city)}` : '';
  return request(`/api/blood-centers${query}`).then((data) => data.centers || []);
}

export function fetchBloodCenterInventory(centerId) {
  return request(`/api/blood-centers/${centerId}/inventory`);
}

export function createBloodCenter(center) {
  return request('/api/blood-centers', {
    method: 'POST',
    body: JSON.stringify(center),
  });
}

export function updateBloodInventory(inventory) {
  return request('/api/blood-inventory', {
    method: 'PUT',
    body: JSON.stringify(inventory),
  });
}