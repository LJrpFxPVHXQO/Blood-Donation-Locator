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
const SURVEY_COMPLETION_KEY = 'blooddonate.survey-completed';

const getSurveyUserKey = (user) => String(user?.id ?? user?.email ?? 'anonymous');

const hasStoredSurveyCompletion = (userKey) => {
  try {
    return window.localStorage.getItem(`${SURVEY_COMPLETION_KEY}.${userKey}`) === 'true';
  } catch {
    return false;
  }
};

const loadSessionUser = () => {
  try {
    return JSON.parse(window.localStorage.getItem(SESSION_KEY))?.user || null;
  } catch {
    return null;
  }
};

export default function App() {
  // Always start on the login screen; the landing page stays reachable from there.
  const [currentView, setCurrentView] = useState('login');
  const [authenticatedUser, setAuthenticatedUser] = useState(loadSessionUser);
  const [surveyCompletion, setSurveyCompletion] = useState(() => {
    const userKey = getSurveyUserKey(loadSessionUser());
    return { userKey, completed: hasStoredSurveyCompletion(userKey) };
  });
  const [pendingRestrictedView, setPendingRestrictedView] = useState(null);
  const [viewBeforeSurveyGate, setViewBeforeSurveyGate] = useState('home');
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
  const surveyUserKey = getSurveyUserKey(authenticatedUser);
  const hasCompletedSurvey =
    surveyCompletion.userKey === surveyUserKey && surveyCompletion.completed;

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
      const userKey = 'anonymous';
      setSurveyCompletion({
        userKey,
        completed: hasStoredSurveyCompletion(userKey),
      });
      setPendingRestrictedView(null);
      setViewBeforeSurveyGate('home');
      setCurrentView('login');
      return;
    }

    if ((view === 'edit-profile' || view === 'emergency') && !hasCompletedSurvey) {
      setViewBeforeSurveyGate(currentView);
      setPendingRestrictedView(view);
      setCurrentView('survey');
      return;
    }

    if (view !== 'survey') {
      setPendingRestrictedView(null);
    }
    setCurrentView(view);
  };

  const handleSurveyComplete = () => {
    setSurveyCompletion({ userKey: surveyUserKey, completed: true });
    try {
      window.localStorage.setItem(`${SURVEY_COMPLETION_KEY}.${surveyUserKey}`, 'true');
    } catch {
      // The completed survey remains available for this session if storage is unavailable.
    }
  };

  const continueToRestrictedView = () => {
    if (!pendingRestrictedView) {
      return;
    }

    const view = pendingRestrictedView;
    setPendingRestrictedView(null);
    setCurrentView(view);
  };

  const deferRestrictedView = () => {
    setPendingRestrictedView(null);
    setCurrentView(viewBeforeSurveyGate);
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
          const userKey = getSurveyUserKey(user);
          setSurveyCompletion({
            userKey,
            completed: hasStoredSurveyCompletion(userKey),
          });
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
          requiredFeature={pendingRestrictedView}
          onSurveyComplete={handleSurveyComplete}
          onContinueToFeature={continueToRestrictedView}
          onDeferRequiredFeature={deferRestrictedView}
        >
          {currentView === 'profile' && (
            <Profile profile={profile} onEdit={() => handleNavigate('edit-profile')} />
          )}
          {currentView === 'edit-profile' && (
            <EditProfile
              profile={profile}
              onCancel={() => handleNavigate('profile')}
              onSave={(updatedProfile) => {
                setProfileDetails(updatedProfile);
                handleNavigate('profile');
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
