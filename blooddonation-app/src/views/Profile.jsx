import { Edit3 } from 'lucide-react';

export default function Profile({ profile, onEdit }) {
  const displayName = profile?.name || '';
  const initials = (displayName || profile?.email || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  const personalInfo = [
    ['Full name', profile?.name],
    ['Age', profile?.age],
    ['Gender', profile?.gender],
    ['City', profile?.city],
    ['Occupation', profile?.occupation],
  ].filter(([, value]) => value);
  const contactInfo = [
    ['Phone', profile?.phone],
    ['Address', profile?.address],
  ].filter(([, value]) => value);

  return (
    <main className="profile-page profile-view">
      <div className="profile-page-container">
        <header className="profile-header">
          <div className="profile-header-left">
            <div className="profile-avatar-large" aria-hidden>
              {initials}
            </div>
            <div className="profile-meta">
              {displayName && (
                <div className="profile-line">
                  <strong className="profile-name">{displayName}</strong>
                </div>
              )}
              <div className="profile-line">Donor ID: {profile?.donorId}</div>
              <div className="profile-line">Email: {profile?.email}</div>
              {profile?.bloodType && <div className="profile-line">Blood Type: {profile.bloodType}</div>}
              {profile?.hasSurvey && <div className="profile-line">Status: {profile.status}</div>}
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
            {personalInfo.length ? (
              personalInfo.map(([label, value]) => <div key={label}>{label}: {value}</div>)
            ) : (
              <div className="muted">No personal information added.</div>
            )}
          </div>
        </section>

        <section className="profile-section">
          <h3 className="section-title">Contact info</h3>
          <div className="section-body">
            {contactInfo.length ? (
              contactInfo.map(([label, value]) => <div key={label}>{label}: {value}</div>)
            ) : (
              <div className="muted">No contact information added.</div>
            )}
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
