import { useState } from 'react';
import { api } from '../api.js';
import { ITEM_POSITIONS, TODAY } from '../constants.js';
import usePhoto from '../hooks/usePhoto.js';
import Field from '../components/Field.jsx';
import PhotoDrop from '../components/PhotoDrop.jsx';

const TIPS_LOST = [
  'Reports stay up for 30 days with a reminder on day 25.',
  'The system immediately looks for similar found reports.',
  'A photo helps, but cover the name, student number and card number.',
  'Phone numbers are never shown publicly.',
  'A reward is an agreement between both sides and outside Lostwise’s responsibility.',
  'Never share the secret feature outside the verification chat.',
];

const TIPS_FOUND = [
  'A photo is required, and cover card details (for a student ID, hide the name and number).',
  'Fill in a secret feature only the real owner would know.',
  'Do not mention the secret feature in chat.',
  'Hand over at the security post or student affairs office.',
  'Pick the item’s location truthfully.',
  'Points are given for handovers with a proof photo (10 points).',
];

// Report form. j = 'lost' or 'found'
export default function NewReport({ j, categories, user, go, reload }) {
  const lost = j === 'lost';
  const [D, setD] = useState({});
  const [error, setError] = useState('');
  const photo = usePhoto();

  const activeCount = user.active_reports;
  const full = activeCount >= user.limit;
  const tips = lost ? TIPS_LOST : TIPS_FOUND;

  // ---- Form field helpers ----
  const setField = (key) => (e) => setD({ ...D, [key]: e.target.value });

  const inputField = (key, placeholder, type) => (
    <input
      className="inp"
      type={type}
      placeholder={placeholder}
      value={D[key] || ''}
      onChange={setField(key)}
    />
  );

  const textField = (key, placeholder) => (
    <textarea
      className="inp"
      placeholder={placeholder}
      value={D[key] || ''}
      onChange={setField(key)}
    />
  );

  // ---- Submit report ----
  const send = async () => {
    try {
      if (D.category === 'Student ID' && !lost && !D.card_masked) {
        return setError('Confirm that the card details in the photo are covered.');
      }

      const form = new FormData();
      const category = categories.find((c) => c.name === D.category);

      form.append('type', j);
      form.append('card_masked', D.card_masked ? 1 : 0);
      form.append('category_id', category ? category.id : '');
      form.append('title', D.name || '');
      form.append('description', D.feature || '');
      form.append('event_date', D.date || '');
      form.append('location_note', D.loc || '');

      if (lost) {
        form.append('reward', D.reward || '');
      } else {
        form.append('secret_feature', D.secret || '');
        form.append('item_position', Object.keys(ITEM_POSITIONS).find((code) => ITEM_POSITIONS[code] === D.position) || '');
        form.append('custody_condition', D.condition || '');
      }

      if (photo.file) form.append('photo', photo.file);

      const result = await api('/reports', { body: form });
      await reload();
      go('detail', result.id);
    } catch (x) {
      setError(x.message);
    }
  };

  return (
    <div className="w860">
      <h1 className="pt">{lost ? 'Report a lost item' : 'Report a found item'}</h1>
      <p className="subt">
        {lost
          ? 'The more complete the features you enter, the easier it is for the system to find a match.'
          : 'Thank you for helping. A photo and a secret feature are the two most important things.'}
      </p>

      {full ? (
        <div className="warnb" style={{ margin: '16px 0' }}>
          You already have 3 active reports. Finish or withdraw one to create a new report.{' '}
          <a onClick={() => go('mine')}>My reports</a>
        </div>
      ) : (
        <div className="sm" style={{ marginTop: 12 }}>You have {activeCount} of 3 active reports.</div>
      )}

      <div className="tipbox" style={{ marginTop: 12, padding: '20px 24px' }}>
        <b>Read before filling in</b>
        <ul className="tip6">
          {tips.map((t) => <li key={t}>{t}</li>)}
        </ul>
      </div>

      <div className="legend">
        <b>Field priority levels</b>
        <span className="pl p-vi">Very important: fill in carefully</span>
        <span className="pl p-rq">Required: must be filled in</span>
        {lost && <span className="pl p-op">Optional: can be left blank</span>}
      </div>

      <fieldset disabled={full} style={{ border: 0, padding: 0, margin: 0, opacity: full ? 0.55 : 1 }}>
        <div className="panel fl">

          {/* Found only: photo and secret feature */}
          {!lost && (
            <Field c="vi" lab="Item photo" tag="Very important">
              <PhotoDrop
                room="vi"
                text="Drop a photo here or take one with your camera"
                preview={photo.preview}
                onPick={photo.choose}
              />
            </Field>
          )}
          {!lost && (
            <Field
              c="vi"
              lab="Secret feature"
              tag="Very important"
              hint="Example: Cat picture wallpaper. Never shown publicly. Used to confirm the real owner."
            >
              {inputField('secret')}
            </Field>
          )}

          <Field c="rq" lab="Item category" tag="Required">
            <select className="inp" value={D.category || ''} onChange={setField('category')}>
              <option value="">Choose a category</option>
              {categories.map((c) => <option key={c.id}>{c.name}</option>)}
            </select>
          </Field>

          {D.category === 'Student ID' && !lost && (
            <label className="opt">
              <input
                type="checkbox"
                checked={!!D.card_masked}
                onChange={(e) => setD({ ...D, card_masked: e.target.checked })}
              />{' '}
              I covered the name, student number and card number in the photo.
            </label>
          )}

          <Field c="rq" lab="Item name" tag="Required">
            {inputField('name', lost ? 'Example: Brown leather wallet' : 'Example: Blue water bottle')}
          </Field>

          {lost ? (
            <Field
              c="vi"
              lab="Features"
              tag="Very important"
              hint="Color, brand, scratches, stickers or contents. The more detail, the easier to match."
            >
              {textField('feature')}
            </Field>
          ) : (
            <Field
              c="rq"
              lab="Features visible to the public"
              tag="Required"
              hint="Write only general features. Put specific ones in the secret field."
            >
              {textField('feature')}
            </Field>
          )}

          <Field c="rq" lab={lost ? 'Date lost' : 'Date found'} tag="Required">
            <input
              className="inp"
              style={{ maxWidth: 320 }}
              type="date"
              max={TODAY}
              value={D.date || ''}
              onChange={setField('date')}
            />
          </Field>

          {lost ? (
            <Field
              c="vi"
              lab="Where did you last see it?"
              tag="Very important"
              hint="Tell it freely: the room, the route you took, or your last activity."
            >
              {textField('loc', 'Example: I last used it in the Building B canteen around 12, then walked to the east parking lot.')}
            </Field>
          ) : (
            <Field c="rq" lab="Where did you find it?" tag="Required" hint="Tell it freely.">
              {textField('loc', 'Example: On the bench in front of the library, 1st floor')}
            </Field>
          )}

          {/* Found only: item position */}
          {!lost && (
            <Field c="rq" lab="Where is the item now?" tag="Required">
              <select className="inp" value={D.position || ''} onChange={setField('position')}>
                <option value="">Choose location</option>
                {Object.values(ITEM_POSITIONS).map((text) => <option key={text}>{text}</option>)}
              </select>
            </Field>
          )}

          {!lost && D.position === ITEM_POSITIONS.staff_or_security && (
            <Field
              c="rq"
              lab="Describe its condition"
              tag="Required"
              hint="Write who the staff member is (name or role), where the item was left, and its current condition."
            >
              {textField('condition', 'Example: Left with Mr. Ben, Building B staff, at the 1st floor post. Phone screen cracked at the corner.')}
            </Field>
          )}

          {/* Lost only: optional fields */}
          {lost && (
            <Field c="op" lab="Item photo" tag="Optional">
              <PhotoDrop
                text="Drop a photo here or choose a file"
                preview={photo.preview}
                onPick={photo.choose}
              />
            </Field>
          )}
          {lost && (
            <Field
              c="op"
              lab="Reward"
              tag="Optional"
              hint="Example: Treat to a meal. A thank-you for the finder. Agreed by both sides."
            >
              {inputField('reward')}
            </Field>
          )}

          <div className="info">
            {lost ? 'Finder' : 'Claimant'} contacts you through chat on this website, no phone number needed.
          </div>
          {error && <div className="sm" style={{ color: 'var(--redfg)' }}>{error}</div>}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className={'btn pri lg ' + (full ? 'off' : '')} onClick={send}>Submit report</button>
            <button className="btn net lg" type="button" onClick={() => go('home')}>Cancel</button>
          </div>
        </div>
      </fieldset>
    </div>
  );
}
