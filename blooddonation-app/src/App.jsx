import { useEffect, useMemo, useState } from 'react';
import EditProfile from './views/EditProfile';
import Eligibility from './views/Eligibility';
import Homepage from './views/Homepage';
import Landingpage from './views/Landingpage';
import LoginSignup from './views/LoginSignup';
import Profile from './views/Profile';
import { loadStoredEligibility, storeEligibility } from './services/eligibility';
import { fetchLatestSurvey } from './services/surveyApi';
import { fetchProfile, saveProfile } from './services/profileApi';

const SESSION_KEY = 'blooddonate.session';

const blankProfile = (user) => ({
  name: '',
  email: user?.email || '',
  donorId: user?.id ? String(user.id).padStart(3, '0') : '',
  hasSurvey: false,
  bloodType: '',
  status: 'Active',
  phone: '',
  address: '',
  emergencyContacts: [],
});

const loadSessionUser = () => {
  try {
    return JSON.parse(window.localStorage.getItem(SESSION_KEY))?.user || null;
  } catch {
    return null;
  }
};

export default function App() {
  // Always start on the login screen; the landing page stays reachable from there.
  const [currentView, setCurrentView] = useState('landing');
  const [authenticatedUser, setAuthenticatedUser] = useState(loadSessionUser);
  const [eligibility, setEligibility] = useState(() => loadStoredEligibility());
  const [profileDetails, setProfileDetails] = useState(() => blankProfile(loadSessionUser()));

  // Load the logged-in user's own profile from the database.
  // Reload when the profile opens, so a survey just submitted shows up.
  const userId = authenticatedUser?.id;
  const onProfileView = currentView === 'profile';
  useEffect(() => {
    if (!userId) {
      return undefined;
    }

    let active = true;
    fetchProfile(userId).then((savedProfile) => {
      if (active && savedProfile) {
        setProfileDetails((current) => ({ ...current, ...savedProfile }));
      }
    });

    return () => {
      active = false;
    };
  }, [userId, onProfileView]);

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

  // Keep the login across reloads; the app always opens on the landing page.
  useEffect(() => {
    try {
      if (authenticatedUser) {
        window.localStorage.setItem(SESSION_KEY, JSON.stringify({ user: authenticatedUser }));
      } else {
        window.localStorage.removeItem(SESSION_KEY);
      }
    } catch {
      // Storage can be unavailable; the login then lasts until the page closes.
    }
  }, [authenticatedUser]);

  const handleNavigate = (view) => {
    if (view === 'logout') {
      setAuthenticatedUser(null);
      setProfileDetails(blankProfile(null));
      setCurrentView('landing');
      return;
    }

    setCurrentView(view);
  };

  const handleProfileSave = async (updatedProfile) => {
    // The server is the source of truth; fall back to the local edit if it is unreachable.
    try {
      const savedProfile = await saveProfile(userId, updatedProfile);
      setProfileDetails((current) => ({ ...current, ...savedProfile }));
    } catch {
      setProfileDetails(updatedProfile);
    }

    setCurrentView('profile');
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
          setProfileDetails(blankProfile(user));
          setCurrentView('home');
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
              onSave={handleProfileSave}
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
