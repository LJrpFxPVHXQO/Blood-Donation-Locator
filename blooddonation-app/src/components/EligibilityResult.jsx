import { AlertTriangle, CheckCircle2, Info, ShieldQuestion } from 'lucide-react';
import { ELIGIBILITY_STATUS, formatEligibilityDate } from '../services/eligibility';

const statusIcons = {
  [ELIGIBILITY_STATUS.ELIGIBLE]: CheckCircle2,
  [ELIGIBILITY_STATUS.REVIEW]: ShieldQuestion,
  [ELIGIBILITY_STATUS.INELIGIBLE]: AlertTriangle,
};

export default function EligibilityResult({ evaluation }) {
  if (!evaluation) {
    return null;
  }

  const StatusIcon = statusIcons[evaluation.status] || Info;

  const groups = [
    { key: 'blockers', title: 'What is stopping you', items: evaluation.blockers },
    { key: 'reviews', title: 'What needs a check first', items: evaluation.reviews },
    { key: 'advisories', title: 'Good to know', items: evaluation.advisories },
  ].filter((group) => group.items.length > 0);

  return (
    <div className={`eligibility-result eligibility-result-${evaluation.status}`}>
      <div className="eligibility-result-head">
        <span className="eligibility-result-icon" aria-hidden="true">
          <StatusIcon size={22} />
        </span>
        <div className="eligibility-result-headings">
          <span className="eligibility-result-label">{evaluation.label}</span>
          <h2 className="eligibility-result-title">{evaluation.headline}</h2>
          <p className="eligibility-result-summary">{evaluation.summary}</p>
        </div>
      </div>

      {evaluation.nextEligibleDate && (
        <p className="eligibility-result-next">
          You can donate again on <strong>{formatEligibilityDate(evaluation.nextEligibleDate)}</strong>.
        </p>
      )}

      {groups.map((group) => (
        <section className={`eligibility-group eligibility-group-${group.key}`} key={group.key}>
          <h3 className="eligibility-group-title">{group.title}</h3>
          <ul className="eligibility-list">
            {group.items.map((item) => (
              <li key={item.id}>
                <strong>{item.label}</strong>
                <span>{item.detail}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {evaluation.passed.length > 0 && (
        <details className="eligibility-group eligibility-group-passed">
          <summary>Checks that passed ({evaluation.passed.length})</summary>
          <ul className="eligibility-list">
            {evaluation.passed.map((item) => (
              <li key={item.id}>
                <strong>{item.label}</strong>
                <span>{item.detail}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="eligibility-disclaimer">
        This is a preliminary screening based on your answers. A blood center officer confirms your final
        eligibility on donation day.
      </p>
    </div>
  );
}
