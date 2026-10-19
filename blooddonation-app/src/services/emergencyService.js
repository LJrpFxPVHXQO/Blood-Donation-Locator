const STORAGE_KEY = 'blooddonate.emergencyRequests.v1';

const demoRequests = [
  {
    id: 'demo-request-001',
    requesterName: 'Alyssa Reyes',
    bloodType: 'A+',
    unitsNeeded: 1,
    neededBy: '2026-10-22T12:00',
    hospital: "St. Luke's Medical Center",
    city: 'Quezon City',
    contactNumber: '+63 908 765 4321',
    message: 'Looking for an A+ donor for my brother. Any help is deeply appreciated.',
    sharingConsent: true,
    status: 'open',
    createdAt: '2026-10-19T08:00:00.000Z',
    isDemo: true,
  },
];

function readStoredRequests() {
  if (typeof window === 'undefined') return demoRequests;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === null) return demoRequests;
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : demoRequests;
  } catch {
    return demoRequests;
  }
}

function writeStoredRequests(requests) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  } catch {
    // Keep the demo usable in memory if browser storage is unavailable.
  }
}

export function getEmergencyRequests() {
  return readStoredRequests();
}

export function createEmergencyRequest(details) {
  const request = {
    ...details,
    id: globalThis.crypto?.randomUUID?.() ?? `request-${Date.now()}`,
    status: 'open',
    createdAt: new Date().toISOString(),
    isDemo: false,
  };
  writeStoredRequests([request, ...readStoredRequests()]);
  return request;
}

export function bookEmergencyRequest(requestId) {
  const requests = readStoredRequests();
  const currentRequest = requests.find((request) => request.id === requestId && request.status === 'open');
  if (!currentRequest) return null;
  const bookedRequest = { ...currentRequest, status: 'booked', bookedAt: new Date().toISOString() };
  writeStoredRequests(requests.map((request) => request.id === requestId ? bookedRequest : request));
  return bookedRequest;
}