import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const questions = [
  {
    question: 'At what age is a person eligible to donate?',
    answer:
      'Most blood centers require donors to be at least 18 years old, though some allow 16- and 17-year-olds to donate with parental consent. Many centers allow donation up to age 65-70 or beyond for healthy donors. Check with your local blood center for the exact rules in your area.',
  },
  {
    question: 'How often can I donate?',
    answer:
      'Whole blood can usually be donated every 8 weeks (56 days). Plasma can be donated every 28 days, and platelets as often as every 7 days, up to about 24 times a year. Your local blood center will confirm the schedule that applies to you.',
  },
  {
    question: 'Can a person with a tattoo donate?',
    answer:
      'It depends on where and when the tattoo was done. Many centers require a waiting period of 3-12 months after a tattoo or piercing, while tattoos from licensed facilities using sterile, single-use equipment may not require a wait. Tell the screening staff about any recent tattoos or piercings.',
  },
  {
    question: 'Do you need proper sleep before donating?',
    answer:
      'Yes. Aim for 7-8 hours of sleep the night before donating. Being well rested helps keep your blood pressure stable and reduces the chance of feeling dizzy or faint during and after donation.',
  },
  {
    question: 'What should I eat and drink before donating?',
    answer:
      'Eat a healthy, low-fat meal within 2-3 hours before donating, and avoid greasy or fatty foods because they can affect blood testing. Drink plenty of water before and after donating, and avoid alcohol beforehand. If you are donating platelets or plasma, follow your center\u2019s specific food and drink instructions.',
  },
  {
    question: 'Can I donate blood if I am taking medication?',
    answer:
      'Many medications do not prevent donation, but some do or require a waiting period\u2014for example, blood thinners, certain antibiotics, and isotretinoin (acne medication). Tell the screening staff about all medications and supplements you take. Do not stop a prescribed medication without talking to your doctor first.',
  },
  {
    question: 'How long does the blood donation process take?',
    answer:
      'Plan for about 1 hour for the whole visit. Registration and health screening usually take 15-20 minutes, the actual whole blood donation takes about 8-10 minutes, and you should rest and have refreshments for another 15 minutes afterward. Platelet and plasma donations take longer.',
  },
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
        {questions.map(({ question, answer }, index) => {
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
                  {answer}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
