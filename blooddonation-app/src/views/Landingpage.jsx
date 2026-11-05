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

export default function Landingpage({ onHome, onLogin, onDashboard, isAuthenticated }) {
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

  return (
    <div className="landing-site">
      <header className="landing-topbar">
        <a className="landing-brand" href="#home" onClick={handleHome} aria-label="BloodDonate home">
          <span>BLOODDONATE</span>
        </a>
        <nav className="landing-navigation" aria-label="Main navigation">
          <a href="#home" onClick={handleHome} aria-current="page">Home</a>
          <span>Donate</span>
          <span>Find Center</span>
          <span>About</span>
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
            <div className="landing-hero-actions">
              <button className="landing-button landing-button-primary" type="button">Schedule donation</button>
              <button className="landing-button landing-button-outline" type="button">Learn more</button>
            </div>
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

        <section className="landing-requests" aria-labelledby="urgent-requests">
          <div className="landing-requests-heading">
            <div>
              <h2 id="urgent-requests">Urgent blood requests</h2>
              <p>Critical blood types needed now in your area</p>
            </div>
            <span>View all &rarr;</span>
          </div>
          <div className="landing-empty-requests" aria-label="No urgent blood requests" />
        </section>

        <section className="landing-centers" id="donation-centers">
          <div className="landing-center-copy">
            <h2>Find a donation center near you</h2>
            <p>Locate the nearest blood donation center and schedule your visit.</p>
            <div className="landing-location-form">
              <input id="landing-location" type="text" placeholder="Enter your location" />
              <button type="button">Find donation center</button>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <a className="landing-brand landing-footer-brand" href="#home" onClick={handleHome}>
          <span>BLOODDONATE</span>
        </a>
        <p>Saving lives through blood donation.</p>
        <div className="landing-footer-links">
          <span>Resources</span>
          <span>Support</span>
          <span>Connect</span>
        </div>
      </footer>
    </div>
  );
}