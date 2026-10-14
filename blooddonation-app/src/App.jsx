import { useState } from 'react';
import Homepage from './views/Homepage';

export default function App() {
  const [currentView, setCurrentView] = useState('home');

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
      {(currentView === 'home' || currentView === 'help') && (
        <Homepage onNavigate={setCurrentView} currentView={currentView} />
      )}
      {currentView === 'emergency' && renderModulePage('Emergency Requests Module', 'Review urgent blood requests and manage emergency donor coordination in real time.')}
      {currentView === 'donation' && renderModulePage('Blood Donation Locator Survey', 'Do a survey if you are going to donate blood. The survey will ask for your donor history and medical history.')}
      {currentView === 'eligibility' && renderModulePage('Donation Eligibility', 'Review general donor eligibility guidance before making a donation. A donation center can confirm your eligibility based on your health and local guidelines.')}
      {currentView === 'profile' && renderModulePage('Blood Donation Locator Module', 'Locate nearby donation centers and monitor donor availability across your region.')}
    </div>
  );
}
