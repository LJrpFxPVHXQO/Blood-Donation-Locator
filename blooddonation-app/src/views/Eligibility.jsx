import EligibilityResult from '../components/EligibilityResult';

export default function Eligibility({ eligibility, onTakeSurvey }) {
  if (!eligibility) {
    return (
      <main className="eligibility-page">
        <div className="eligibility-page-header">
          <span className="eligibility-eyebrow">DONATION ELIGIBILITY</span>
          <h1>Check if you can donate</h1>
          <p>
            Answer the blood donation survey and we screen every answer against our donation
            requirements. Your result is saved on this device.
          </p>
        </div>
        <button className="eligibility-page-button" type="button" onClick={onTakeSurvey}>
          Start the survey
        </button>
      </main>
    );
  }

  return (
    <main className="eligibility-page">
      <div className="eligibility-page-header">
        <span className="eligibility-eyebrow">DONATION ELIGIBILITY</span>
        <h1>Your donation eligibility</h1>
        <p>Based on your latest survey answers.</p>
      </div>
      <EligibilityResult evaluation={eligibility} />
      <button className="eligibility-page-button" type="button" onClick={onTakeSurvey}>
        Update my answers
      </button>
    </main>
  );
}
