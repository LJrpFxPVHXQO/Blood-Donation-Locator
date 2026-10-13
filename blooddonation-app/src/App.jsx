import { useState } from 'react';
import Homepage from './views/Homepage';

export default function App() {
  const [currentView, setCurrentView] = useState('home');

  const renderModulePage = (title, emoji, description) => (
    <div className="module-page">
      <div className="panel module-panel">
        <h2>
          {emoji} {title}
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
      <div className="app-shell landing-shell">
        <div className="panel landing-panel">
          <p className="eyebrow">Blood Donation System</p>
          <h1>Save lives together</h1>
          <p className="landing-copy">
            Connect donors, emergency responders, and health teams with real-time support across every device.
          </p>
          <button className="primary-button" onClick={() => setCurrentView('home')}>
            Enter Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {currentView === 'home' && <Homepage onNavigate={setCurrentView} />}
      {currentView === 'emergency' && renderModulePage('Emergency Requests Module', '🚨', 'Review urgent blood requests and manage emergency donor coordination in real time.')}
      {currentView === 'donation' && renderModulePage('Blood Donation Locator Module', '🩸', 'Locate nearby donation centers and monitor donor availability across your region.')}
      {currentView === 'eligibility' && renderModulePage('Donation Eligibility', '🛡️', 'Review general donor eligibility guidance before making a donation. A donation center can confirm your eligibility based on your health and local guidelines.')}
      {currentView === 'help' && renderModulePage('Help & Support Module', '❓', 'Access FAQs, support forms, and quick guidance for donors and staff.')}
      {currentView === 'profile' && renderModulePage('Profile & Accessibility Module', '👤', 'Manage accessibility settings, account preferences, and personal donor information safely.')}
    </div>
  );
}
