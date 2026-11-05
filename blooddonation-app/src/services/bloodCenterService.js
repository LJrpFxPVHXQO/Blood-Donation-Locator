// These calls are handled by the Java live tracking service. In development Vite
// proxies them to http://127.0.0.1:3002; set VITE_TRACKING_API_BASE to call it directly.
const API_BASE = import.meta.env.VITE_TRACKING_API_BASE || '';

async function request(path, options = {}, useTrackingApiBase = true) {
  const response = await fetch(`${useTrackingApiBase ? API_BASE : ''}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
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

export function createBloodCenter(center, adminToken) {
  return request('/api/admin/blood-centers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify(center),
  }, false);
}

export function updateBloodInventory(inventory) {
  return request('/api/blood-inventory', {
    method: 'PUT',
    body: JSON.stringify(inventory),
  });
}
