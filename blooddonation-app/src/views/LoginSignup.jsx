import { useState } from 'react';

export default function LoginSignup({ onHome, onAuthenticated }) {
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [formValues, setFormValues] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [feedback, setFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (event) => {
    const { name, value } = event.target;
    setFormValues((currentValues) => ({ ...currentValues, [name]: value }));
  };

  const switchMode = () => {
    setIsSigningUp((currentValue) => !currentValue);
    setFeedback(null);
  };

  const submitForm = async (event) => {
    event.preventDefault();

    if (isSigningUp && formValues.password !== formValues.confirmPassword) {
      setFeedback({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    try {
      setIsSubmitting(true);
      setFeedback(null);

      const response = await fetch(isSigningUp ? '/api/auth/signup' : '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formValues.email,
          password: formValues.password,
          ...(isSigningUp && { name: formValues.name }),
        }),
      });
      const responseText = await response.text();
      let responseBody = {};

      if (responseText) {
        try {
          responseBody = JSON.parse(responseText);
        } catch {
          throw new Error(`The server returned an invalid response (status ${response.status}).`);
        }
      }

      if (!response.ok) {
        throw new Error(responseBody.message || `Request failed (status ${response.status}).`);
      }

      if (isSigningUp) {
        setFeedback({ type: 'success', message: responseBody.message || 'Account created. You can now log in.' });
        setFormValues({ name: '', email: '', password: '', confirmPassword: '' });
        setIsSigningUp(false);
        return;
      }

      onAuthenticated(responseBody.user);
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unable to complete your request.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-heading">
        <button className="auth-brand" type="button" onClick={onHome} aria-label="BloodDonate home">
          <img src="/blooddonate-logo.png" alt="" />
          <span>BLOODDONATE</span>
        </button>
        <form className="auth-content" onSubmit={submitForm}>
          <img className="auth-mark" src="/blooddonation-logo-colored.png" alt="" />
          <h1 id="auth-heading">{isSigningUp ? 'Sign up' : 'Log in'}</h1>
          <p>{isSigningUp ? 'Create an account to start saving lives.' : 'Welcome back! Please log in to continue.'}</p>
          {isSigningUp && (
            <>
              <label htmlFor="signup-name">Full name</label>
              <input id="signup-name" name="name" type="text" value={formValues.name} onChange={updateField} placeholder="Your full name" required />
            </>
          )}
          <label htmlFor="login-email">Email address or username</label>
          <input id="login-email" name="email" type="text" value={formValues.email} onChange={updateField} placeholder="you@example.com" required />
          <label htmlFor="login-password">Password</label>
          <input id="login-password" name="password" type="password" value={formValues.password} onChange={updateField} minLength="4" required />
          {isSigningUp && (
            <>
              <label htmlFor="confirm-password">Confirm password</label>
              <input id="confirm-password" name="confirmPassword" type="password" value={formValues.confirmPassword} onChange={updateField} minLength="4" required />
            </>
          )}
          {feedback && <p className={`auth-feedback auth-feedback-${feedback.type}`} role="status">{feedback.message}</p>}
          <button className="auth-login-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? isSigningUp ? 'Creating account...' : 'Signing in...' : isSigningUp ? 'Sign up' : 'Log in'}
          </button>
          <p className="auth-switch">
            {isSigningUp ? 'Already have an account?' : 'Don’t have an account?'}
            <button type="button" onClick={switchMode}>
              {isSigningUp ? 'Log in' : 'Sign up'}
            </button>
          </p>
          <button className="auth-home-link" type="button" onClick={onHome}>Back to home</button>
        </form>
      </section>
    </main>
  );
}