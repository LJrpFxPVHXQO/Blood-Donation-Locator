import { useMemo, useRef, useState } from 'react';
import EligibilityResult from '../components/EligibilityResult';
import { evaluateEligibility } from '../services/eligibility';
import { submitSurvey } from '../services/surveyApi';

const yesNo = ['Yes', 'No'];
const yesNoUnsure = ['Yes', 'No', 'Not sure'];
const genders = ['Female', 'Male', 'Prefer not to say'];
const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', "I don't know"];
const motivations = [
  'Helping others',
  'Supporting someone I know',
  'Community drive',
  'Saving lives regularly',
  'Other',
];
const ratings = ['Not applicable', '1', '2', '3', '4', '5'];
const contactMethods = ['Phone call', 'SMS', 'Email', 'No preference'];
const donationCounts = ['1 time', '2-5 times', '6-10 times', 'More than 10 times'];
const donationSettings = [
  'Blood center',
  'Mobile blood drive',
  'Workplace or school drive',
  'Hospital blood bank',
];
const donationConcerns = [
  'Fear of needles',
  'Busy schedule',
  'Health or safety worries',
  'Distance to a donation site',
  'I donate often already',
];
const smokingOptions = ['Never', 'Occasionally', 'Yes', 'Former smoker'];
const alcoholOptions = ['Never', 'Sometimes', 'Regularly'];
const exerciseOptions = ['Rarely', '1-2 times a week', '3-4 times a week', '5 or more times a week'];
const registryOptions = ['Yes', 'Maybe', 'No'];
const likelihoodOptions = ['Very likely', 'Likely', 'Not sure', 'Unlikely'];

const initialAnswers = {
  // Personal details
  name: '',
  age: '',
  contact: '',
  email: '',
  gender: '',
  city: '',
  occupation: '',
  // Medical history
  antibiotics: '',
  tattoo: '',
  piercing: '',
  unwell: '',
  chronicCondition: '',
  medications: '',
  surgery: '',
  vaccination: '',
  recentTravel: '',
  // Donor history
  donatedBefore: '',
  lastDonation: '',
  donationCount: '',
  donationSetting: '',
  donationConcerns: [],
  // Health & lifestyle
  weight: '',
  smoking: '',
  alcohol: '',
  exercise: '',
  // Preferences & feedback
  availability: '',
  bloodType: '',
  motivations: [],
  registry: '',
  likelihood: '',
  rating: '',
  contactMethod: '',
  comments: '',
};

const steps = [
  {
    id: 'personal',
    title: 'Personal details',
    hint: 'Tell us a little about yourself.',
    requiredInputs: ['name', 'age', 'contact'],
    requiredChoices: ['gender'],
  },
  {
    id: 'medical',
    title: 'Medical history',
    hint: 'A few quick questions about your recent health.',
    requiredInputs: [],
    requiredChoices: [
      'antibiotics',
      'tattoo',
      'piercing',
      'unwell',
      'chronicCondition',
      'medications',
      'surgery',
      'vaccination',
      'recentTravel',
    ],
  },
  {
    id: 'donor',
    title: 'Donor history',
    hint: 'Help us understand your donation background.',
    requiredInputs: [],
    requiredChoices: ['donatedBefore'],
    conditionalChoices: [
      { when: 'donatedBefore', is: 'Yes', fields: ['donationCount', 'donationSetting'] },
    ],
  },
  {
    id: 'lifestyle',
    title: 'Health & lifestyle',
    hint: 'Habits that help us check if you are eligible to donate.',
    requiredInputs: ['weight'],
    requiredChoices: ['smoking', 'alcohol', 'exercise'],
  },
  {
    id: 'preferences',
    title: 'Preferences & feedback',
    hint: 'Share how you prefer to be contacted and what motivates you.',
    requiredInputs: [],
    requiredChoices: ['bloodType', 'registry', 'likelihood', 'contactMethod'],
    requiredMulti: ['motivations'],
  },
];

function FeedbackNote({ feedback }) {
  if (!feedback) {
    return null;
  }

  return (
    <p className={`survey-feedback survey-feedback-${feedback.severity}`} role="status">
      {feedback.detail}
    </p>
  );
}

function ChoiceGroup({
  label,
  options,
  value,
  onChange,
  multiple = false,
  invalid = false,
  hint,
  feedback,
}) {
  const isSelected = (option) => (multiple ? value.includes(option) : value === option);

  const toggle = (option) => {
    if (multiple) {
      onChange(isSelected(option) ? value.filter((item) => item !== option) : [...value, option]);
    } else {
      onChange(option);
    }
  };

  return (
    <fieldset className={`survey-field${invalid ? ' has-error' : ''}`}>
      <legend className="survey-label">{label}</legend>
      {hint && <p className="survey-hint">{hint}</p>}
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
      <FeedbackNote feedback={feedback} />
    </fieldset>
  );
}

export default function Survey({ onNavigate, onEligibilityChange, userId }) {
  const [answers, setAnswers] = useState(initialAnswers);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const panelRef = useRef(null);

  const isLastStep = step === steps.length - 1;
  const currentStep = steps[step];

  const evaluation = useMemo(() => evaluateEligibility(answers), [answers]);

  const feedbackByField = useMemo(() => {
    const feedback = {};

    [...evaluation.blockers, ...evaluation.reviews, ...evaluation.advisories].forEach((check) => {
      if (check.field && !feedback[check.field]) {
        feedback[check.field] = { severity: check.severity, detail: check.detail };
      }
    });

    return feedback;
  }, [evaluation]);

  // Show the donation decision as soon as an answer changes it, even while
  // other questions are still unanswered.
  const preview = useMemo(() => {
    const pendingCount = evaluation.pending.length;
    const pendingNote =
      pendingCount > 0
        ? ` ${pendingCount} question${pendingCount === 1 ? '' : 's'} still to check.`
        : '';

    if (evaluation.blockers.length > 0) {
      return {
        status: 'ineligible',
        label: evaluation.shortLabel,
        detail: `${evaluation.blockers[0].detail}${pendingNote}`,
      };
    }

    if (evaluation.reviews.length > 0) {
      return {
        status: 'review',
        label: evaluation.shortLabel,
        detail: `${evaluation.reviews[0].detail}${pendingNote}`,
      };
    }

    if (!evaluation.complete) {
      return {
        status: 'pending',
        label: 'Checking your answers',
        detail: `${pendingCount} question${pendingCount === 1 ? '' : 's'} left to check your eligibility.`,
      };
    }

    return {
      status: 'eligible',
      label: evaluation.shortLabel,
      detail: evaluation.summary,
    };
  }, [evaluation]);

  const setAnswer = (field) => (value) => setAnswers((current) => ({ ...current, [field]: value }));
  const handleInput = (field) => (event) => setAnswer(field)(event.target.value);

  const isMissing = (field) => {
    const value = answers[field];
    if (Array.isArray(value)) return value.length === 0;
    return !String(value).trim();
  };

  const getMissingFields = (stepIndex) => {
    const definition = steps[stepIndex];
    const missing = [];

    [
      ...(definition.requiredInputs || []),
      ...(definition.requiredChoices || []),
      ...(definition.requiredMulti || []),
    ]
      .filter(isMissing)
      .forEach((field) => missing.push(field));

    (definition.conditionalChoices || []).forEach((rule) => {
      if (answers[rule.when] === rule.is) {
        rule.fields.filter(isMissing).forEach((field) => missing.push(field));
      }
    });

    return missing;
  };

  const focusFirstError = (fields) => {
    if (!fields.length) return;
    requestAnimationFrame(() => {
      const target = panelRef.current?.querySelector(
        '.survey-field.has-error input, .survey-field.has-error select, .survey-field.has-error button'
      );
      target?.focus();
    });
  };

  const moveTo = (nextStep) => {
    setStep(nextStep);
    setErrors([]);
    requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleBack = () => {
    if (step > 0) moveTo(step - 1);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const missing = getMissingFields(step);
    if (missing.length) {
      setErrors(missing);
      focusFirstError(missing);
      return;
    }

    if (isLastStep) {
      setSubmitted(true);
      onEligibilityChange?.(evaluation);
      submitSurvey(answers, userId);
      requestAnimationFrame(() => {
        panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return;
    }

    moveTo(step + 1);
  };

  const hasError = (field) => errors.includes(field);

  if (submitted) {
    return (
      <section className="help-card-panel survey-panel" aria-labelledby="survey-title" ref={panelRef}>
        <span className="help-eyebrow">BLOOD DONATION SURVEY</span>
        <h1 id="survey-title">Survey complete</h1>
        <p className="help-intro">
          Your answers were screened against our donation requirements. Here is your result.
        </p>

        <EligibilityResult evaluation={evaluation} />

        <div className="survey-actions">
          <button
            className="survey-submit"
            type="button"
            onClick={() => {
              setAnswers(initialAnswers);
              setErrors([]);
              setStep(0);
              setSubmitted(false);
            }}
          >
            Submit another response
          </button>
          {onNavigate && (
            <button className="survey-back" type="button" onClick={() => onNavigate('home')}>
              Back to dashboard
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className={`help-card-panel survey-panel${currentStep.id === 'medical' ? ' survey-panel-medical' : ''}`} aria-labelledby="survey-title" ref={panelRef}>
      <span className="help-eyebrow">BLOOD DONATION SURVEY</span>
      <h1 id="survey-title">Blood Donation Survey</h1>
      <p className="help-intro">Share your experience to help us improve the blood donation process.</p>

      <div className="survey-progress">
        <div
          className="survey-progress-track"
          role="progressbar"
          aria-valuemin="1"
          aria-valuemax={steps.length}
          aria-valuenow={step + 1}
          aria-label="Survey progress"
        >
          <span
            className="survey-progress-fill"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>
        <span className="survey-progress-text">
          Step {step + 1} of {steps.length} &middot; {currentStep.title}
        </span>
      </div>

      <div
        className={`eligibility-preview eligibility-preview-${preview.status}`}
        role="status"
        aria-live="polite"
      >
        <span className="eligibility-preview-label">Donation eligibility</span>
        <strong className="eligibility-preview-value">{preview.label}</strong>
        <p className="eligibility-preview-text">{preview.detail}</p>
      </div>

      <form className="survey-form" onSubmit={handleSubmit}>
        <div className={`survey-section survey-section-${currentStep.id}`} key={currentStep.id}>
          <h2>{currentStep.title}</h2>
          <p className="survey-hint">{currentStep.hint}</p>

          {errors.length > 0 && (
            <p className="survey-error" role="alert">
              Please answer the required questions before continuing.
            </p>
          )}

          {currentStep.id === 'personal' && (
            <>
              <label className={`survey-field${hasError('name') ? ' has-error' : ''}`}>
                <span className="survey-label">Name</span>
                <input
                  className="survey-input"
                  type="text"
                  placeholder="Enter your name"
                  value={answers.name}
                  onChange={handleInput('name')}
                  aria-invalid={hasError('name')}
                  required
                />
              </label>
              <label className={`survey-field${hasError('age') ? ' has-error' : ''}`}>
                <span className="survey-label">Age</span>
                <input
                  className="survey-input"
                  type="number"
                  min="16"
                  max="120"
                  placeholder="Enter your age"
                  value={answers.age}
                  onChange={handleInput('age')}
                  aria-invalid={hasError('age')}
                  required
                />
                <FeedbackNote feedback={feedbackByField.age} />
              </label>
              <label className={`survey-field${hasError('contact') ? ' has-error' : ''}`}>
                <span className="survey-label">Contact no.</span>
                <input
                  className="survey-input"
                  type="tel"
                  placeholder="Enter your contact number"
                  value={answers.contact}
                  onChange={handleInput('contact')}
                  aria-invalid={hasError('contact')}
                  required
                />
              </label>
              <label className="survey-field">
                <span className="survey-label">Email address (optional)</span>
                <input
                  className="survey-input"
                  type="email"
                  placeholder="Enter your email address"
                  value={answers.email}
                  onChange={handleInput('email')}
                />
              </label>
              <ChoiceGroup
                label="Sex"
                options={genders}
                value={answers.gender}
                onChange={setAnswer('gender')}
                invalid={hasError('gender')}
              />
              <label className="survey-field">
                <span className="survey-label">City / Municipality (optional)</span>
                <input
                  className="survey-input"
                  type="text"
                  placeholder="Where do you live?"
                  value={answers.city}
                  onChange={handleInput('city')}
                />
              </label>
              <label className="survey-field">
                <span className="survey-label">Occupation (optional)</span>
                <input
                  className="survey-input"
                  type="text"
                  placeholder="Enter your occupation"
                  value={answers.occupation}
                  onChange={handleInput('occupation')}
                />
              </label>
            </>
          )}

          {currentStep.id === 'medical' && (
            <>
              <ChoiceGroup
                label="Have you taken antibiotics for the past 14 days?"
                options={yesNo}
                value={answers.antibiotics}
                onChange={setAnswer('antibiotics')}
                invalid={hasError('antibiotics')}
                feedback={feedbackByField.antibiotics}
              />
              <ChoiceGroup
                label="Have you had a tattoo procedure this year?"
                options={yesNo}
                value={answers.tattoo}
                onChange={setAnswer('tattoo')}
                invalid={hasError('tattoo')}
                feedback={feedbackByField.tattoo}
              />
              <ChoiceGroup
                label="Have you had a body piercing procedure this year?"
                options={yesNo}
                value={answers.piercing}
                onChange={setAnswer('piercing')}
                invalid={hasError('piercing')}
                feedback={feedbackByField.piercing}
              />
              <ChoiceGroup
                label="Have you felt unwell (fever, cough, sore throat) in the past 14 days?"
                options={yesNo}
                value={answers.unwell}
                onChange={setAnswer('unwell')}
                invalid={hasError('unwell')}
                feedback={feedbackByField.unwell}
              />
              <ChoiceGroup
                label="Do you have any chronic medical condition (e.g. diabetes, hypertension, heart disease)?"
                options={yesNoUnsure}
                value={answers.chronicCondition}
                onChange={setAnswer('chronicCondition')}
                invalid={hasError('chronicCondition')}
                feedback={feedbackByField.chronicCondition}
              />
              <ChoiceGroup
                label="Are you currently taking any medications?"
                options={yesNo}
                value={answers.medications}
                onChange={setAnswer('medications')}
                invalid={hasError('medications')}
                feedback={feedbackByField.medications}
              />
              <ChoiceGroup
                label="Have you had surgery or a blood transfusion in the past 12 months?"
                options={yesNo}
                value={answers.surgery}
                onChange={setAnswer('surgery')}
                invalid={hasError('surgery')}
                feedback={feedbackByField.surgery}
              />
              <ChoiceGroup
                label="Have you received any vaccine in the past 4 weeks?"
                options={yesNo}
                value={answers.vaccination}
                onChange={setAnswer('vaccination')}
                invalid={hasError('vaccination')}
                feedback={feedbackByField.vaccination}
              />
              <ChoiceGroup
                label="Have you traveled outside the country in the past 12 months?"
                options={yesNo}
                value={answers.recentTravel}
                onChange={setAnswer('recentTravel')}
                invalid={hasError('recentTravel')}
                feedback={feedbackByField.recentTravel}
              />
            </>
          )}

          {currentStep.id === 'donor' && (
            <>
              <ChoiceGroup
                label="Have you donated blood before?"
                options={yesNo}
                value={answers.donatedBefore}
                onChange={setAnswer('donatedBefore')}
                invalid={hasError('donatedBefore')}
                feedback={feedbackByField.donatedBefore}
              />
              {answers.donatedBefore === 'Yes' && (
                <>
                  <ChoiceGroup
                    label="How many times have you donated blood?"
                    options={donationCounts}
                    value={answers.donationCount}
                    onChange={setAnswer('donationCount')}
                    invalid={hasError('donationCount')}
                  />
                  <ChoiceGroup
                    label="Where do you usually donate?"
                    options={donationSettings}
                    value={answers.donationSetting}
                    onChange={setAnswer('donationSetting')}
                    invalid={hasError('donationSetting')}
                  />
                  <label className="survey-field">
                    <span className="survey-label">When was your last donation? (optional)</span>
                    <input
                      className="survey-input"
                      type="date"
                      value={answers.lastDonation}
                      onChange={handleInput('lastDonation')}
                    />
                    <FeedbackNote feedback={feedbackByField.lastDonation} />
                  </label>
                </>
              )}
              <ChoiceGroup
                label="What might prevent you from donating more often?"
                options={donationConcerns}
                value={answers.donationConcerns}
                onChange={setAnswer('donationConcerns')}
                multiple
                hint="Select all that apply."
              />
            </>
          )}

          {currentStep.id === 'lifestyle' && (
            <>
              <label className={`survey-field${hasError('weight') ? ' has-error' : ''}`}>
                <span className="survey-label">Weight (kg)</span>
                <input
                  className="survey-input"
                  type="number"
                  min="20"
                  max="300"
                  placeholder="Enter your weight in kilograms"
                  value={answers.weight}
                  onChange={handleInput('weight')}
                  aria-invalid={hasError('weight')}
                  required
                />
                <FeedbackNote feedback={feedbackByField.weight} />
              </label>
              <ChoiceGroup
                label="Do you smoke or vape?"
                options={smokingOptions}
                value={answers.smoking}
                onChange={setAnswer('smoking')}
                invalid={hasError('smoking')}
                feedback={feedbackByField.smoking}
              />
              <ChoiceGroup
                label="How often do you drink alcohol?"
                options={alcoholOptions}
                value={answers.alcohol}
                onChange={setAnswer('alcohol')}
                invalid={hasError('alcohol')}
                feedback={feedbackByField.alcohol}
              />
              <ChoiceGroup
                label="How often do you exercise?"
                options={exerciseOptions}
                value={answers.exercise}
                onChange={setAnswer('exercise')}
                invalid={hasError('exercise')}
                feedback={feedbackByField.exercise}
              />
            </>
          )}

          {currentStep.id === 'preferences' && (
            <>
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
              <ChoiceGroup
                label="What is your blood type?"
                options={bloodTypes}
                value={answers.bloodType}
                onChange={setAnswer('bloodType')}
                invalid={hasError('bloodType')}
                feedback={feedbackByField.bloodType}
              />
              <ChoiceGroup
                label="What motivates you to donate?"
                options={motivations}
                value={answers.motivations}
                onChange={setAnswer('motivations')}
                multiple
                invalid={hasError('motivations')}
                hint="Select all that apply."
              />
              <ChoiceGroup
                label="Would you join a regular blood donor registry?"
                options={registryOptions}
                value={answers.registry}
                onChange={setAnswer('registry')}
                invalid={hasError('registry')}
              />
              <ChoiceGroup
                label="How likely are you to donate again in the next 12 months?"
                options={likelihoodOptions}
                value={answers.likelihood}
                onChange={setAnswer('likelihood')}
                invalid={hasError('likelihood')}
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
                invalid={hasError('contactMethod')}
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
            </>
          )}
        </div>

        <div className="survey-actions">
          {step > 0 && (
            <button className="survey-back" type="button" onClick={handleBack}>
              Back
            </button>
          )}
          <button className="survey-submit" type="submit">
            {isLastStep ? 'Submit' : 'Next'}
          </button>
        </div>
      </form>
    </section>
  );
}