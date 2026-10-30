import { HOW } from '../constants.js';

const FAQ = [
  [
    'Do I need to log in to browse items?',
    'No. Browsing and searching work without an account. Creating reports and chatting need one.',
  ],
  [
    'Is a reward required?',
    'No. A reward is optional and agreed between both sides.',
  ],
  [
    'How many reports can I create?',
    'Up to 3 active reports at a time. Once one is returned or withdrawn, you can create a new one.',
  ],
];

export default function Help() {
  return (
    <div className="wrap">
      <div className="sec">
        <h1 className="pt">How Lostwise works</h1>

        <div className="grid4 how" style={{ marginTop: 16 }}>
          {HOW.map((h) => (
            <div className="panel" key={h[0]}>
              <div className="l">{h[0]}</div>
              <h3>{h[1]}</h3>
              <p>{h[2]}</p>
            </div>
          ))}
        </div>

        {FAQ.map(([ask, answer]) => (
          <details key={ask} style={{ marginTop: 12 }}>
            <summary>{ask}</summary>
            <p className="sm" style={{ margin: '8px 0' }}>{answer}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
