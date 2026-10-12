import React, { useState } from 'react';
import Homepage from './views/Homepage';

export default function App() {
  const [currentView, setCurrentView] = useState('home');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fce4ec' }}>
      {currentView === 'home' && <Homepage onNavigate={setCurrentView} />}
      {currentView === 'emergency' && (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h2>🚨 Emergency Requests Module</h2>
          <button onClick={() => setCurrentView('home')} style={{ padding: '10px 20px', marginTop: '15px', cursor: 'pointer' }}>Back to Dashboard</button>
        </div>
      )}
      {currentView === 'donation' && (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h2>🩸 Blood Donation Locator Module</h2>
          <button onClick={() => setCurrentView('home')} style={{ padding: '10px 20px', marginTop: '15px', cursor: 'pointer' }}>Back to Dashboard</button>
        </div>
      )}
      {currentView === 'help' && (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h2>❓ Help & Support Module</h2>
          <button onClick={() => setCurrentView('home')} style={{ padding: '10px 20px', marginTop: '15px', cursor: 'pointer' }}>Back to Dashboard</button>
        </div>
      )}
      {currentView === 'profile' && (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h2>👤 Profile & Accessibility Module</h2>
          <button onClick={() => setCurrentView('home')} style={{ padding: '10px 20px', marginTop: '15px', cursor: 'pointer' }}>Back to Dashboard</button>
        </div>
      )}
    </div>
  );
}