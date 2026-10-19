import { Edit3 } from 'lucide-react';

export default function Profile({ profile, onEdit }) {
  const initials = (profile?.name || 'JD')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <main className="profile-page profile-view">
      <div className="profile-page-container">
        <header className="profile-header">
          <div className="profile-header-left">
            <div className="profile-avatar-large" aria-hidden>
              {initials}
            </div>
            <div className="profile-meta">
              <div className="profile-line">
                <strong className="profile-name">{profile?.name}</strong>
              </div>
              <div className="profile-line">Donor ID: {profile?.donorId}</div>
              <div className="profile-line">Blood Type: {profile?.bloodType}</div>
              <div className="profile-line">Status: {profile?.status}</div>
            </div>
          </div>

          <div className="profile-header-right">
            <button className="profile-edit-button" onClick={onEdit} aria-label="Edit profile">
              <Edit3 size={14} />
              <span>Edit Profile</span>
            </button>
          </div>
        </header>

        <section className="profile-section">
          <h3 className="section-title">Personal information</h3>
          <div className="section-body">
            <div>Full name: {profile?.name}</div>
            <div>Date of Birth: {profile?.dateOfBirth}</div>
          </div>
        </section>

        <section className="profile-section">
          <h3 className="section-title">Contact info</h3>
          <div className="section-body">
            <div>Phone: {profile?.phone}</div>
            <div>Address: {profile?.address}</div>
          </div>
        </section>

        <section className="profile-section">
          <h3 className="section-title">Emergency contact(s)</h3>
          <div className="section-body">
            {profile?.emergencyContacts?.length ? (
              profile.emergencyContacts.map((c) => (
                <div key={c.id} className="emergency-contact">
                  <div>Name: {c.name}</div>
                  <div>Phone: {c.phone}</div>
                  <div>Relationship: {c.relationship}</div>
                </div>
              ))
            ) : (
              <div className="muted">No emergency contacts added.</div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
