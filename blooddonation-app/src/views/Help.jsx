import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const questions = [
  'At what age is a person eligible to donate?',
  'How often can I donate?',
  'Can a person with a tattoo donate?',
  'Do you need proper sleep before donating?',
];

export default function Help() {
  const [openQuestions, setOpenQuestions] = useState([]);

  const toggleQuestion = (index) => {
    setOpenQuestions((open) =>
      open.includes(index) ? open.filter((item) => item !== index) : [...open, index],
    );
  };

  return (
    <section className="help-card-panel" aria-labelledby="help-title">
      <span className="help-eyebrow">BLOOD DONATION HELP</span>
      <h1 id="help-title">Help</h1>
      <p className="help-intro">Quick answers to common questions before you donate.</p>
      <div className="faq-list">
        {questions.map((question, index) => {
          const isOpen = openQuestions.includes(index);
          const answerId = `faq-answer-${index}`;

          return (
            <article className="faq-item" key={question}>
              <button
                className="faq-question"
                type="button"
                aria-expanded={isOpen}
                aria-controls={answerId}
                onClick={() => toggleQuestion(index)}
              >
                <span>{question}</span>
                <ChevronDown className={isOpen ? 'faq-chevron is-open' : 'faq-chevron'} size={16} />
              </button>
              {isOpen && (
                <div className="faq-answer" id={answerId}>
                  Placeholder answer: helpful donation information will appear here.
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}