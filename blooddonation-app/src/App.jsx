import { useState } from 'react';
import EditProfile from './views/EditProfile';
import Homepage from './views/Homepage';
import Landingpage from './views/Landingpage';
import LoginSignup from './views/LoginSignup';
import Profile from './views/Profile';

export default function App() {
  const [currentView, setCurrentView] = useState('landing');
  const [authenticatedUser, setAuthenticatedUser] = useState(null);
  const [profile, setProfile] = useState({
    name: 'John A. Doe',
    donorId: '001',
    dateOfBirth: '1/1/2001',
    bloodType: 'A+',
    status: 'Active',
    phone: '0954778899',
    address: '123 Street Town City',
    emergencyContacts: [
      {
        id: 1,
        name: 'Jane B. Doe',
        phone: '09658899911',
        relationship: 'Wife',
      },
    ],
  });

  const renderModulePage = (title, description) => (
    <div className="module-page">
      <div className="panel module-panel">
        <h2>
          {title}
        </h2>
        <p>{description}</p>
        <button className="back-button" onClick={() => setCurrentView('home')}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );

  if (currentView === 'landing') {
    return (
      <Landingpage
        onHome={() => setCurrentView('landing')}
        onLogin={() => setCurrentView('login')}
        onDashboard={() => setCurrentView('home')}
        isAuthenticated={Boolean(authenticatedUser)}
      />
    );
  }

  if (currentView === 'login') {
    return (
      <LoginSignup
        onHome={() => setCurrentView('landing')}
        onAuthenticated={(user) => {
          setAuthenticatedUser(user);
          setCurrentView('landing');
        }}
      />
    );
  }

  return (
    <div className="app-shell">
      {(currentView === 'home' || currentView === 'help' || currentView === 'survey' || currentView === 'donation' || currentView === 'emergency' || currentView === 'profile' || currentView === 'edit-profile' || currentView === 'locator') && (
        <Homepage
          onNavigate={setCurrentView}
          onLogout={() => {
            setAuthenticatedUser(null);
            setCurrentView('landing');
          }}
          currentView={currentView}
          profile={profile}
        >
          {currentView === 'profile' && (
            <Profile profile={profile} onEdit={() => setCurrentView('edit-profile')} />
          )}
          {currentView === 'edit-profile' && (
            <EditProfile
              profile={profile}
              onCancel={() => setCurrentView('profile')}
              onSave={(updatedProfile) => {
                setProfile(updatedProfile);
                setCurrentView('profile');
              }}
            />
          )}
        </Homepage>
      )}
      {currentView === 'eligibility' && renderModulePage('Donation Eligibility', 'Review general donor eligibility guidance before making a donation. A donation center can confirm your eligibility based on your health and local guidelines.')}
    </div>
  );
}
