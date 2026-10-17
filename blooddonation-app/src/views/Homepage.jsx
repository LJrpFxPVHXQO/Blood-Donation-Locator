import { useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Calendar,
  Droplet,
  HelpCircle,
  Menu,
  Shield,
  X,
} from 'lucide-react';
import Help from './Help';
import Survey from './Survey';

export default function Homepage({ onNavigate, currentView = 'home' }) {
  const isHelpSection = currentView === 'help' || currentView === 'survey';
  const activeSection = currentView === 'survey' ? 'survey' : currentView;
  const [showMenu, setShowMenu] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const sectionLinks = [
    { label: 'Home', view: 'home' },
    { label: 'Help', view: 'help' },
    { label: 'Blood Donation', view: 'survey' },
    { label: 'Emergency', view: 'emergency' },
  ];

  const drawerLinks = [
    { label: 'Profile', view: 'profile' },
    { label: 'Condition to donate', view: 'eligibility' },
    { label: 'Donation locations', view: 'profile' },
    { label: 'FAQ', view: 'help' },
    { label: 'Settings', view: 'profile' },
    { label: 'Emergency requests', view: 'emergency' },
  ];

  return (
    <div className={`homepage-shell${isHelpSection ? ' help-shell' : ''}`}>
      <nav className="top-nav" aria-label="Site header">
        <div className="nav-left">
          <button
            className="icon-button nav-toggle"
            onClick={() => setShowMenu(true)}
            title="Open menu"
            aria-label="Open menu"
          >
            <Menu size={26} />
          </button>
        </div>

        <div className="brand-mark" aria-label="BloodDonate">
          <img className="brand-logo" src="/blooddonate-logo.png" alt="" />
          <span>BLOODDONATE</span>
        </div>

        <div className="nav-right">
          <button
            className="icon-button reminder-button"
            onClick={() => {
              setShowReminder(!showReminder);
              setShowProfile(false);
            }}
            title="View reminders"
            aria-label="View reminders"
            aria-expanded={showReminder}
          >
            <Bell size={22} />
            <span className="notification-dot" />
          </button>
          <button
            className="icon-button"
            onClick={() => {
              setShowProfile(!showProfile);
              setShowReminder(false);
            }}
            title="User profile"
            aria-label="User profile"
            aria-expanded={showProfile}
          >
            <span className="nav-avatar" aria-hidden="true">JD</span>
          </button>
        </div>
      </nav>

      <nav className="section-nav" aria-label="Main sections">
        {sectionLinks.map((item) => (
          <button
            key={item.view}
            className={`section-nav-link${item.view === activeSection ? ' active' : ''}`}
            onClick={() => onNavigate(item.view)}
            aria-current={item.view === activeSection ? 'page' : undefined}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {showMenu && (
        <>
          <button
            className="drawer-backdrop"
            onClick={() => setShowMenu(false)}
            aria-label="Close navigation menu"
          />
          <aside className="side-drawer" aria-label="Navigation menu">
            <div className="drawer-content">
              <div className="drawer-header">
                <div className="drawer-heading">
                  <span className="drawer-eyebrow">BLOOD DONATION LOCATOR</span>
                  <h2>Explore</h2>
                </div>
                <button
                  className="drawer-header-close"
                  onClick={() => setShowMenu(false)}
                  aria-label="Close menu"
                >
                  <X size={17} aria-hidden="true" />
                </button>
              </div>

              <ul className="drawer-list">
                {drawerLinks.map((item) => (
                  <li key={item.label}>
                    <button
                      className="drawer-item"
                      onClick={() => {
                        onNavigate(item.view);
                        setShowMenu(false);
                      }}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </>
      )}

      {showReminder && (
        <div className="reminder-popover">
          <div className="reminder-header">
            <h4>
              <Bell size={18} />
              <span>Donor Reminders</span>
            </h4>
            <button
              className="icon-button"
              onClick={() => setShowReminder(false)}
              aria-label="Close reminders"
            >
              <X size={16} />
            </button>
          </div>
          <p>
            Your next eligible blood donation cooldown ends in <strong>14 days</strong>.
          </p>
          <div className="reminder-date">
            <Calendar size={14} />
            <span>Recommended Date: Nov 2, 2026</span>
          </div>
        </div>
      )}

      {showProfile && (
        <section className="profile-popover" aria-label="User profile menu">
          <button
            className="profile-popover-close"
            onClick={() => setShowProfile(false)}
            aria-label="Close profile menu"
          >
            <X size={18} />
          </button>
          <div className="profile-summary">
            <span className="profile-avatar" aria-hidden="true">JD</span>
            <span className="profile-name">John Doe</span>
          </div>
          <div className="profile-actions">
            <button
              className="profile-action profile-edit"
              onClick={() => {
                onNavigate('profile');
                setShowProfile(false);
              }}
            >
              Edit Profile
            </button>
            <button
              className="profile-action profile-logout"
              onClick={() => {
                onNavigate('landing');
                setShowProfile(false);
              }}
            >
              Log out
            </button>
          </div>
        </section>
      )}

      <main className={isHelpSection ? 'help-main' : 'homepage-main'}>
        {currentView === 'survey' && <Survey />}
        {currentView === 'help' && <Help onNavigate={onNavigate} />}
        {!isHelpSection && (
          <>
            <section className="welcome-banner">
              <h1>Welcome to BloodDonate Dashboard</h1>
              <p>
                Coordinate emergency blood dispatch, track donor availability, and check urgent hospital
                requests in real time. Choose an operational module below to continue.
              </p>
            </section>

            <h2 className="section-title">Quick Action Modules</h2>
            <div className="action-grid">
              <button className="module-card emergency-card" onClick={() => onNavigate('emergency')}>
                <AlertTriangle size={36} />
                <span className="card-title">EMERGENCY</span>
                <span className="card-copy">Post or View Urgent Calls</span>
              </button>
              <button className="module-card donation-card" onClick={() => onNavigate('survey')}>
                <Droplet size={36} />
                <span className="card-title">BLOOD DONATION</span>
                <span className="card-copy">Complete the donor survey</span>
              </button>
              <button className="module-card help-card" onClick={() => onNavigate('help')}>
                <HelpCircle size={36} />
                <span className="card-title">HELP SECTION</span>
                <span className="card-copy">Answers to common questions</span>
              </button>
              <button className="module-card profile-card" onClick={() => onNavigate('profile')}>
                <Shield size={36} />
                <span className="card-title">Blood Center </span>
                <span className="card-copy">Locate nearby blood centers near NCR</span>
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
