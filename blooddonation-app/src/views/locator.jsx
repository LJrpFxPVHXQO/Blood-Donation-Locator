import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  createBloodCenter,
  fetchBloodCenters,
  fetchBloodCenterInventory,
} from '../services/bloodCenterService';

const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const emptyCenter = {
  name: '',
  city: '',
  address: '',
  contact: '',
  status: 'open',
  operating_hours: '',
};

export default function Locator({ isAdmin = false, adminToken }) {
  const region = 'National Capital Region';
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [inventoryById, setInventoryById] = useState({});
  const [inventoryLoading, setInventoryLoading] = useState({});
  const [newCenter, setNewCenter] = useState(emptyCenter);
  const [isCreatingCenter, setIsCreatingCenter] = useState(false);
  const [createFeedback, setCreateFeedback] = useState(null);

  useEffect(() => {
    let active = true;
    fetchBloodCenters()
      .then((data) => {
        if (active) {
          setCenters(data);
          setError('');
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || 'Failed to load blood centers.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  async function toggleCenter(centerId) {
    if (expandedId === centerId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(centerId);
    if (inventoryById[centerId]) {
      return;
    }
    setInventoryLoading((current) => ({ ...current, [centerId]: true }));
    try {
      const data = await fetchBloodCenterInventory(centerId);
      setInventoryById((current) => ({ ...current, [centerId]: data }));
    } catch (err) {
      setInventoryById((current) => ({
        ...current,
        [centerId]: { error: err.message || 'Failed to load inventory.' },
      }));
    } finally {
      setInventoryLoading((current) => ({ ...current, [centerId]: false }));
    }
  }

  async function submitNewCenter(event) {
    event.preventDefault();
    setIsCreatingCenter(true);
    setCreateFeedback(null);
    try {
      await createBloodCenter(newCenter, adminToken);
      const updatedCenters = await fetchBloodCenters();
      setCenters(updatedCenters);
      setNewCenter(emptyCenter);
      setCreateFeedback({ type: 'success', message: 'Blood center location added.' });
    } catch (err) {
      setCreateFeedback({ type: 'error', message: err.message || 'Unable to add this location.' });
    } finally {
      setIsCreatingCenter(false);
    }
  }

  function getStockStatus(units, threshold) {
    if (units <= 0) {
      return { label: 'Out of stock', tone: 'critical' };
    }
    if (units <= threshold) {
      return { label: 'Low stock', tone: 'low' };
    }
    return { label: 'Available', tone: 'ok' };
  }

  return (
    <main className="locator-page">
      <button className="locator-search-button" type="button" onClick={() => setExpandedId(null)}>
        Live Blood Center Tracking
      </button>
      <section className="locator-panel" aria-labelledby="locator-heading">
        <h1 id="locator-heading">{region}</h1>
        <p style={{ margin: '0 0 16px', color: '#6b7280', fontSize: '14px' }}>
          Real-time blood stock availability per center
        </p>
        {isAdmin && (
          <form className="locator-admin-form" onSubmit={submitNewCenter}>
            <h2>Add a blood center location</h2>
            <div className="locator-admin-grid">
              <label>
                Center name
                <input
                  value={newCenter.name}
                  onChange={(event) => setNewCenter((current) => ({ ...current, name: event.target.value }))}
                  maxLength="150"
                  required
                />
              </label>
              <label>
                City
                <input
                  value={newCenter.city}
                  onChange={(event) => setNewCenter((current) => ({ ...current, city: event.target.value }))}
                  maxLength="120"
                  required
                />
              </label>
              <label className="locator-admin-wide">
                Street address
                <input
                  value={newCenter.address}
                  onChange={(event) => setNewCenter((current) => ({ ...current, address: event.target.value }))}
                  maxLength="255"
                />
              </label>
              <label>
                Contact number
                <input
                  value={newCenter.contact}
                  onChange={(event) => setNewCenter((current) => ({ ...current, contact: event.target.value }))}
                  maxLength="60"
                />
              </label>
              <label>
                Operating hours
                <input
                  value={newCenter.operating_hours}
                  onChange={(event) => setNewCenter((current) => ({ ...current, operating_hours: event.target.value }))}
                  placeholder="e.g. Mon–Fri, 8 AM–5 PM"
                  maxLength="100"
                />
              </label>
              <label>
                Status
                <select
                  value={newCenter.status}
                  onChange={(event) => setNewCenter((current) => ({ ...current, status: event.target.value }))}
                >
                  <option value="open">Open</option>
                  <option value="temporarily closed">Temporarily closed</option>
                  <option value="closed">Closed</option>
                </select>
              </label>
            </div>
            {createFeedback && (
              <p className={`locator-admin-feedback is-${createFeedback.type}`} role="status">
                {createFeedback.message}
              </p>
            )}
            <button className="locator-admin-submit" type="submit" disabled={isCreatingCenter}>
              {isCreatingCenter ? 'Adding location…' : 'Add location'}
            </button>
          </form>
        )}
        {loading && <p style={{ margin: 0, color: '#6b7280' }}>Loading centers...</p>}
        {error && <p style={{ margin: 0, color: '#dc2626' }}>{error}</p>}
        <div className="locator-city-list">
          {centers.map((center) => {
            const inventoryData = inventoryById[center.id];
            const inventory = Array.isArray(inventoryData?.inventory) ? inventoryData.inventory : [];
            const inventoryMap = Object.fromEntries(inventory.map((item) => [item.blood_type, item]));
            const loadingInv = inventoryLoading[center.id];

            return (
              <div className="locator-city" key={center.id}>
                <button
                  type="button"
                  className={`locator-city-select${expandedId === center.id ? ' is-selected' : ''}`}
                  aria-expanded={expandedId === center.id}
                  onClick={() => toggleCenter(center.id)}
                >
                  <span>
                    {center.name}
                    <br />
                    <small style={{ opacity: 0.7 }}>{center.city} · {center.status} · {center.operating_hours || 'Hours not set'}</small>
                  </span>
                  <ChevronDown className={expandedId === center.id ? 'faq-chevron is-open' : 'faq-chevron'} size={16} aria-hidden="true" />
                </button>
                {expandedId === center.id && (
                  <div className="locator-city-details" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <strong>{center.name}</strong>
                      <div style={{ color: '#6b7280', fontSize: '13px', marginTop: '4px' }}>
                        {center.address || 'Address not available'}
                        {center.contact ? <div>Contact: {center.contact}</div> : null}
                      </div>
                    </div>
                    {loadingInv && <p style={{ margin: 0, color: '#6b7280' }}>Fetching live inventory...</p>}
                    {inventoryData?.error && <p style={{ margin: 0, color: '#dc2626' }}>{inventoryData.error}</p>}
                    {!loadingInv && !inventoryData?.error && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                        {bloodTypes.map((bt) => {
                          const item = inventoryMap[bt];
                          const units = item ? Number(item.units_available) : 0;
                          const threshold = item ? Number(item.critical_threshold) : 5;
                          const status = getStockStatus(units, threshold);
                          return (
                            <div key={bt} style={{ border: '1px solid #f0f0f0', borderRadius: '10px', padding: '10px 12px', background: '#fff' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong>{bt}</strong>
                                <span style={{ fontSize: '12px', color: status.tone === 'critical' ? '#dc2626' : status.tone === 'low' ? '#d97706' : '#16a34a' }}>
                                  {status.label}
                                </span>
                              </div>
                              <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '4px' }}>{units}</div>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>units available</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {inventory.length === 0 && !loadingInv && !inventoryData?.error && (
                      <p style={{ margin: 0, color: '#6b7280', fontSize: '13px' }}>No inventory records yet for this center.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {!loading && centers.length === 0 && !error && (
          <p style={{ margin: '12px 0 0', color: '#6b7280' }}>No blood centers found. Run the seed script to add sample centers.</p>
        )}
      </section>
    </main>
  );
}
