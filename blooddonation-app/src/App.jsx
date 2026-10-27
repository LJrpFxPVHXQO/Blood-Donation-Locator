import { useEffect, useMemo, useState } from 'react';
import EditProfile from './views/EditProfile';
import Eligibility from './views/Eligibility';
import Homepage from './views/Homepage';
import Landingpage from './views/Landingpage';
import LoginSignup from './views/LoginSignup';
import Profile from './views/Profile';
import { loadStoredEligibility, storeEligibility } from './services/eligibility';
import { fetchLatestSurvey } from './services/surveyApi';

const SESSION_KEY = 'blooddonate.session';
const LOGGED_IN_VIEWS = ['home', 'help', 'survey', 'donation', 'emergency', 'profile', 'edit-profile', 'locator', 'eligibility'];

const loadSession = () => {
  try {
    const session = JSON.parse(window.localStorage.getItem(SESSION_KEY));
    if (!session?.user) {
      return { user: null, view: 'landing' };
    }

    return { user: session.user, view: LOGGED_IN_VIEWS.includes(session.view) ? session.view : 'landing' };
  } catch {
    return { user: null, view: 'landing' };
  }
};

export default function App() {
  const [initialSession] = useState(loadSession);
  const [currentView, setCurrentView] = useState(initialSession.view);
  const [authenticatedUser, setAuthenticatedUser] = useState(initialSession.user);
  const [eligibility, setEligibility] = useState(() => loadStoredEligibility());
  const [profileDetails, setProfileDetails] = useState({
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

  // The donor status follows the latest survey result.
  const profile = useMemo(
    () => (eligibility ? { ...profileDetails, status: eligibility.shortLabel } : profileDetails),
    [profileDetails, eligibility],
  );

  // Pull the result that was saved on the server, and keep it on the device as a fallback.
  useEffect(() => {
    let active = true;

    fetchLatestSurvey().then((savedEligibility) => {
      if (!active || !savedEligibility) {
        return;
      }

      setEligibility(savedEligibility);
      storeEligibility(savedEligibility);
    });

    return () => {
      active = false;
    };
  }, []);

  // Keep the login and the open page across reloads.
  useEffect(() => {
    try {
      if (authenticatedUser) {
        window.localStorage.setItem(SESSION_KEY, JSON.stringify({ user: authenticatedUser, view: currentView }));
      } else {
        window.localStorage.removeItem(SESSION_KEY);
      }
    } catch {
      // Storage can be unavailable; the login then lasts until the page closes.
    }
  }, [authenticatedUser, currentView]);

  const handleNavigate = (view) => {
    // The only dashboard link back to the landing page is Log out.
    if (view === 'landing') {
      setAuthenticatedUser(null);
    }

    setCurrentView(view);
  };

  const handleEligibilityChange = (result) => {
    setEligibility(result);
    storeEligibility(result);
  };

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
      {(currentView === 'home' || currentView === 'help' || currentView === 'survey' || currentView === 'donation' || currentView === 'emergency' || currentView === 'profile' || currentView === 'edit-profile' || currentView === 'locator' || currentView === 'eligibility') && (
        <Homepage
          onNavigate={handleNavigate}
          currentView={currentView}
          profile={profile}
          onEligibilityChange={handleEligibilityChange}
          userId={authenticatedUser?.id}
        >
          {currentView === 'profile' && (
            <Profile profile={profile} onEdit={() => setCurrentView('edit-profile')} />
          )}
          {currentView === 'edit-profile' && (
            <EditProfile
              profile={profile}
              onCancel={() => setCurrentView('profile')}
              onSave={(updatedProfile) => {
                setProfileDetails(updatedProfile);
                setCurrentView('profile');
              }}
            />
          )}
          {currentView === 'eligibility' && (
            <Eligibility
              eligibility={eligibility}
              onTakeSurvey={() => setCurrentView('survey')}
            />
          )}
        </Homepage>
      )}
    </div>
  );
}
