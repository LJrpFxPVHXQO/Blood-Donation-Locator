import { useState } from 'react';

const yesNo = ['Yes', 'No'];
const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', "I don't know"];
const motivations = ['Helping others', 'Supporting someone I know', 'Community drive', 'Other'];
const ratings = ['Not applicable', '1', '2', '3', '4', '5'];
const contactMethods = ['Phone call', 'SMS', 'No preference'];

const initialAnswers = {
  name: '',
  age: '',
  contact: '',
  antibiotics: '',
  tattoo: '',
  piercing: '',
  donatedBefore: '',
  lastDonation: '',
  availability: '',
  bloodType: '',
  motivations: [],
  rating: '',
  contactMethod: '',
  comments: '',
};

function ChoiceGroup({ label, options, value, onChange, multiple = false }) {
  const isSelected = (option) => (multiple ? value.includes(option) : value === option);

  const toggle = (option) => {
    if (multiple) {
      onChange(isSelected(option) ? value.filter((item) => item !== option) : [...value, option]);
    } else {
      onChange(option);
    }
  };

  return (
    <fieldset className="survey-field">
      <legend className="survey-label">{label}</legend>
      <div className="survey-choices">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={`survey-choice${isSelected(option) ? ' is-selected' : ''}`}
            aria-pressed={isSelected(option)}
            onClick={() => toggle(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export default function Survey() {
  const [answers, setAnswers] = useState(initialAnswers);
  const [submitted, setSubmitted] = useState(false);

  const setAnswer = (field) => (value) => setAnswers((current) => ({ ...current, [field]: value }));
  const handleInput = (field) => (event) => setAnswer(field)(event.target.value);

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <section className="help-card-panel survey-panel" aria-labelledby="survey-title">
        <span className="help-eyebrow">BLOOD DONATION SURVEY</span>
        <h1 id="survey-title">Thank you!</h1>
        <p className="help-intro">Your answers help us improve the blood donation process.</p>
        <button
          className="survey-submit"
          type="button"
          onClick={() => {
            setAnswers(initialAnswers);
            setSubmitted(false);
          }}
        >
          Submit another response
        </button>
      </section>
    );
  }

  return (
    <section className="help-card-panel survey-panel" aria-labelledby="survey-title">
      <span className="help-eyebrow">BLOOD DONATION SURVEY</span>
      <h1 id="survey-title">Blood Donation Survey</h1>
      <p className="help-intro">Share your experience to help us improve the blood donation process.</p>

      <form className="survey-form" onSubmit={handleSubmit}>
        <div className="survey-section">
          <h2>Personal details</h2>
          <p className="survey-hint">Tell us a little about yourself.</p>

          <label className="survey-field">
            <span className="survey-label">Name</span>
            <input
              className="survey-input"
              type="text"
              placeholder="Enter your name"
              value={answers.name}
              onChange={handleInput('name')}
              required
            />
          </label>
          <label className="survey-field">
            <span className="survey-label">Age</span>
            <input
              className="survey-input"
              type="number"
              min="1"
              max="120"
              placeholder="Enter your age"
              value={answers.age}
              onChange={handleInput('age')}
              required
            />
          </label>
          <label className="survey-field">
            <span className="survey-label">Contact no.</span>
            <input
              className="survey-input"
              type="tel"
              placeholder="Enter your contact number"
              value={answers.contact}
              onChange={handleInput('contact')}
              required
            />
          </label>
        </div>

        <div className="survey-section">
          <h2>Medical history</h2>
          <p className="survey-hint">A few quick questions about your recent health.</p>

          <ChoiceGroup
            label="Have you taken antibiotics for the past 14 days?"
            options={yesNo}
            value={answers.antibiotics}
            onChange={setAnswer('antibiotics')}
          />
          <ChoiceGroup
            label="Have you had a tattoo procedure this year?"
            options={yesNo}
            value={answers.tattoo}
            onChange={setAnswer('tattoo')}
          />
          <ChoiceGroup
            label="Have you had a body piercing procedure this year?"
            options={yesNo}
            value={answers.piercing}
            onChange={setAnswer('piercing')}
          />
        </div>

        <div className="survey-section">
          <h2>Donor history</h2>
          <p className="survey-hint">Help us understand your donation background.</p>

          <ChoiceGroup
            label="Have you donated blood before?"
            options={yesNo}
            value={answers.donatedBefore}
            onChange={setAnswer('donatedBefore')}
          />
          <label className="survey-field">
            <span className="survey-label">When was your last donation? (optional)</span>
            <input
              className="survey-input"
              type="date"
              value={answers.lastDonation}
              onChange={handleInput('lastDonation')}
            />
          </label>
        </div>

        <div className="survey-section">
          <h2>Preferences</h2>
          <p className="survey-hint">Share how you prefer to be contacted and what motivates you.</p>

          <label className="survey-field">
            <span className="survey-label">When are you available to donate blood?</span>
            <input
              className="survey-input"
              type="text"
              placeholder="Enter your availability"
              value={answers.availability}
              onChange={handleInput('availability')}
            />
          </label>
          <label className="survey-field">
            <span className="survey-label">What is your blood type?</span>
            <select className="survey-input" value={answers.bloodType} onChange={handleInput('bloodType')}>
              <option value="" disabled>
                Select your blood type
              </option>
              {bloodTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <ChoiceGroup
            label="What motivates you to donate?"
            options={motivations}
            value={answers.motivations}
            onChange={setAnswer('motivations')}
            multiple
          />
          <ChoiceGroup
            label="How would you rate your donation experience? (optional)"
            options={ratings}
            value={answers.rating}
            onChange={setAnswer('rating')}
          />
          <ChoiceGroup
            label="How would you prefer to be contacted?"
            options={contactMethods}
            value={answers.contactMethod}
            onChange={setAnswer('contactMethod')}
          />
          <label className="survey-field">
            <span className="survey-label">Any suggestions or concerns? (optional)</span>
            <textarea
              className="survey-input survey-textarea"
              rows="4"
              placeholder="Share your thoughts"
              value={answers.comments}
              onChange={handleInput('comments')}
            />
          </label>
        </div>

        <button className="survey-submit" type="submit">
          Submit
        </button>
      </form>
    </section>
  );
}