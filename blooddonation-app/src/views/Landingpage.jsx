import { useLayoutEffect } from 'react';

const processSteps = [
  {
    number: '1. Register',
    description: 'Create an account and complete your donor profile.',
  },
  {
    number: '2. Donate',
    description: 'Visit a center and donate blood safely.',
  },
  {
    number: '3. Save lives',
    description: 'Your donation helps patients in need.',
  },
];

export default function Landingpage({ onHome, onLogin, onDashboard, onFindCenter, isAuthenticated }) {
  useLayoutEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    const resetScroll = () => window.scrollTo(0, 0);

    window.history.scrollRestoration = 'manual';
    resetScroll();
    requestAnimationFrame(resetScroll);

    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  const handleHome = (event) => {
    event.preventDefault();
    window.scrollTo(0, 0);
    onHome();
  };

  const handleProtected = (destination) => (event) => {
    event.preventDefault();
    if (!isAuthenticated) {
      onLogin();
    } else if (destination === 'locator') {
      onFindCenter();
    } else {
      onDashboard();
    }
  };

  return (
    <div className="landing-site">
      <header className="landing-topbar">
        <a className="landing-brand" href="#home" onClick={handleHome} aria-label="BloodDonate home">
          <span>BLOODDONATE</span>
        </a>
        <nav className="landing-navigation" aria-label="Main navigation">
          <a href="#home" onClick={handleHome} aria-current="page">Home</a>
          <a href="#donate" onClick={handleProtected('dashboard')}>Donate</a>
          <a href="#find-center" onClick={handleProtected('locator')}>Find Center</a>
          {isAuthenticated ? (
            <button type="button" onClick={onDashboard}>Dashboard</button>
          ) : (
            <button type="button" onClick={onLogin}>Login</button>
          )}
        </nav>
      </header>

      <main>
        <section className="landing-hero" id="home">
          <div className="landing-hero-copy">
            <h1>Save lives. Donate blood today.</h1>
            <p className="landing-hero-description">
              Join thousands of donors making a difference in your community. Your donation can save up to 3 lives.
            </p>
          </div>
          <div className="landing-hero-art" aria-label="BloodDonate logo">
            <div className="landing-hero-logo">
              <img src="/blooddonation-logo-landingpage.png" alt="" />
            </div>
          </div>
        </section>

        <section className="landing-stats" aria-label="Community impact">
          <div className="landing-stat">
            <strong>0</strong>
            <span>Donors this month</span>
          </div>
          <div className="landing-stat">
            <strong>0</strong>
            <span>Lives saved</span>
          </div>
          <div className="landing-stat">
            <strong>0</strong>
            <span>Partner hospitals</span>
          </div>
        </section>

        <section className="landing-how" id="how-it-works">
          <div className="landing-section-heading">
            <h2>How it works</h2>
          </div>
          <div className="landing-steps">
            {processSteps.map((step) => (
              <article className="landing-step" key={step.number}>
                <h3>{step.number}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

      </main>

      <footer className="landing-footer">
        <a className="landing-brand landing-footer-brand" href="#home" onClick={handleHome}>
          <span>BLOODDONATE</span>
        </a>
        <p>Saving lives through blood donation.</p>
        <div className="landing-footer-links">
          <span>Having trouble with the site? Message <a href="mailto:blooddonate@gmail.com">blooddonate@gmail.com</a></span>
        </div>
      </footer>
    </div>
  );
}