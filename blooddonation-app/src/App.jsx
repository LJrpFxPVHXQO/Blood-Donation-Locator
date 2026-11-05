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
const SURVEY_COMPLETION_KEY = 'blooddonate.survey-completed';

const getSurveyUserKey = (user) => String(user?.id ?? user?.email ?? 'anonymous');

const hasStoredSurveyCompletion = (userKey) => {
  try {
    return window.localStorage.getItem(`${SURVEY_COMPLETION_KEY}.${userKey}`) === 'true';
  } catch {
    return false;
  }
};

const blankProfile = (user) => ({
  name: user?.name || '',
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
  const [currentView, setCurrentView] = useState('landing');
  const [authenticatedUser, setAuthenticatedUser] = useState(loadSessionUser);
  const [surveyCompletion, setSurveyCompletion] = useState(() => {
    const userKey = getSurveyUserKey(loadSessionUser());
    return { userKey, completed: hasStoredSurveyCompletion(userKey) };
  });
  const [pendingRestrictedView, setPendingRestrictedView] = useState(null);
  const [viewBeforeSurveyGate, setViewBeforeSurveyGate] = useState('home');
  const [eligibility, setEligibility] = useState(() => loadStoredEligibility());
  const [profileDetails, setProfileDetails] = useState(() => blankProfile(loadSessionUser()));

  const userId = authenticatedUser?.id;
  const onProfileView = currentView === 'profile';
  const surveyUserKey = getSurveyUserKey(authenticatedUser);

  useEffect(() => {
    if (!userId) {
      return undefined;
    }

    let active = true;
    fetchProfile(userId).then((savedProfile) => {
      if (!active || !savedProfile) {
        return;
      }

      setProfileDetails((current) => ({ ...current, ...savedProfile }));
      if (savedProfile.hasSurvey) {
        setSurveyCompletion({ userKey: surveyUserKey, completed: true });
        try {
          window.localStorage.setItem(`${SURVEY_COMPLETION_KEY}.${surveyUserKey}`, 'true');
        } catch {
          // Keep the server-provided completion state for this session.
        }
      }
    });

    return () => {
      active = false;
    };
  }, [userId, onProfileView, surveyUserKey]);

  const profile = useMemo(
    () => (eligibility ? { ...profileDetails, status: eligibility.shortLabel } : profileDetails),
    [profileDetails, eligibility],
  );
  const hasCompletedSurvey =
    (surveyCompletion.userKey === surveyUserKey && surveyCompletion.completed) ||
    profileDetails.hasSurvey;

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
      setSurveyCompletion({
        userKey: 'anonymous',
        completed: hasStoredSurveyCompletion('anonymous'),
      });
      setPendingRestrictedView(null);
      setViewBeforeSurveyGate('home');
      setCurrentView('landing');
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
    setProfileDetails((current) => ({ ...current, hasSurvey: true }));
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

  const handleProfileSave = async (updatedProfile) => {
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
        onFindCenter={() => setCurrentView('locator')}
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
          isAdmin={authenticatedUser?.role === 'admin'}
          adminToken={authenticatedUser?.adminToken}
        >
          {currentView === 'profile' && (
            <Profile profile={profile} onEdit={() => handleNavigate('edit-profile')} />
          )}
          {currentView === 'edit-profile' && (
            <EditProfile
              profile={profile}
              onCancel={() => handleNavigate('profile')}
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
