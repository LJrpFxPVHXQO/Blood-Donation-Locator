import { useState } from 'react';
import { Plus, Save } from 'lucide-react';

export default function EditProfile({ profile, onCancel, onSave }) {
  const initials = (profile?.name || 'JD')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  const [draft, setDraft] = useState({
    phone: profile.phone,
    address: profile.address,
    emergencyContacts: profile.emergencyContacts.map((contact) => ({ ...contact })),
  });

  const updateContactInfo = (event) => {
    const { name, value } = event.target;
    setDraft((current) => ({ ...current, [name]: value }));
  };

  const updateEmergencyContact = (contactId, field, value) => {
    setDraft((current) => ({
      ...current,
      emergencyContacts: current.emergencyContacts.map((contact) =>
        contact.id === contactId ? { ...contact, [field]: value } : contact,
      ),
    }));
  };

  const addEmergencyContact = () => {
    setDraft((current) => ({
      ...current,
      emergencyContacts: [
        ...current.emergencyContacts,
        { id: crypto.randomUUID(), name: '', phone: '', relationship: '' },
      ],
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave({ ...profile, ...draft });
  };

  return (
    <main className="profile-page">
      <div className="profile-page-container">
        <header className="profile-header">
          <div className="profile-header-left">
            <div className="profile-avatar-large" aria-hidden="true">
              {initials}
            </div>
            <div className="profile-meta">
              <strong className="profile-name">{profile.name}</strong>
              <div className="profile-line">Donor ID: {profile.donorId}</div>
              <div className="profile-line">Blood Type: {profile.bloodType}</div>
              <div className="profile-line">Status: {profile.status}</div>
            </div>
          </div>
          <h1 className="profile-edit-title">Edit profile</h1>
        </header>

        <form className="profile-edit-form" onSubmit={handleSubmit}>
          <section className="profile-section">
            <h2 className="section-title">Contact info</h2>
            <div className="profile-edit-fields">
              <label className="profile-edit-field">
                <span>Phone</span>
                <input
                  autoComplete="tel"
                  name="phone"
                  onChange={updateContactInfo}
                  required
                  type="tel"
                  value={draft.phone}
                />
              </label>
              <label className="profile-edit-field">
                <span>Address</span>
                <input
                  autoComplete="street-address"
                  name="address"
                  onChange={updateContactInfo}
                  required
                  value={draft.address}
                />
              </label>
            </div>
          </section>

          <section className="profile-section">
            <div className="profile-section-heading">
              <div>
                <h2 className="section-title">Emergency contact(s)</h2>
                <p className="profile-section-description">People we can reach if there is an emergency.</p>
              </div>
              <button
                className="profile-add-contact"
                type="button"
                onClick={addEmergencyContact}
              >
                <Plus size={17} />
                <span>Add contact</span>
              </button>
            </div>

            {draft.emergencyContacts.length > 0 ? (
              <div className="profile-contact-list">
                {draft.emergencyContacts.map((contact, index) => (
                  <fieldset className="profile-contact-editor" key={contact.id}>
                    <legend>Contact {index + 1}</legend>
                    <div className="profile-edit-fields">
                      <label className="profile-edit-field">
                        <span>Name</span>
                        <input
                          autoComplete="name"
                          onChange={(event) =>
                            updateEmergencyContact(contact.id, 'name', event.target.value)
                          }
                          required
                          value={contact.name}
                        />
                      </label>
                      <label className="profile-edit-field">
                        <span>Phone</span>
                        <input
                          autoComplete="tel"
                          onChange={(event) =>
                            updateEmergencyContact(contact.id, 'phone', event.target.value)
                          }
                          required
                          type="tel"
                          value={contact.phone}
                        />
                      </label>
                      <label className="profile-edit-field">
                        <span>Relationship</span>
                        <input
                          onChange={(event) =>
                            updateEmergencyContact(contact.id, 'relationship', event.target.value)
                          }
                          required
                          value={contact.relationship}
                        />
                      </label>
                    </div>
                  </fieldset>
                ))}
              </div>
            ) : (
              <p className="profile-no-contacts">No emergency contacts added yet.</p>
            )}
          </section>

          <footer className="profile-form-actions">
            <button className="profile-cancel-button" type="button" onClick={onCancel}>
              Cancel
            </button>
            <button className="profile-save-button" type="submit">
              <Save size={17} />
              <span>Save changes</span>
            </button>
          </footer>
        </form>
      </div>
    </main>
  );
}
