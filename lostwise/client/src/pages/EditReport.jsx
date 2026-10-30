import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { ITEM_POSITIONS, TODAY } from '../constants.js';
import usePhoto from '../hooks/usePhoto.js';
import Field from '../components/Field.jsx';
import PhotoDrop from '../components/PhotoDrop.jsx';

// Edit your own report. id = report id
export default function EditReport({ id, categories, go, reload, toast, setDlg }) {
  const [r, setR] = useState(); // undefined = loading, false = cannot be edited
  const [D, setD] = useState();
  const photo = usePhoto();

  useEffect(() => {
    api('/reports/' + id)
      .then((report) => {
        setR(report);
        setD({
          category: report.category,
          name: report.title,
          feature: report.description || '',
          secret: report.secret_feature || '',
          date: String(report.event_date).slice(0, 10),
          loc: report.location_note || '',
          position: ITEM_POSITIONS[report.item_position] || '',
          condition: report.custody_condition || '',
          reward: report.reward || '',
        });
      })
      .catch(() => setR(false));
  }, [id]);

  if (r === false) {
    return <div className="pg"><div className="panel">This report cannot be edited.</div></div>;
  }
  if (!r || !D) return null;

  const lost = r.type === 'lost';

  // While a claim is active, the features and secret feature are locked
  const locked = (r.claim || []).some((c) => ['chat', 'chosen'].includes(c.status));

  // ---- Form field helpers ----
  const setField = (key) => (e) => setD({ ...D, [key]: e.target.value });

  const inputField = (key, type) => (
    <input className="inp" type={type} value={D[key] || ''} onChange={setField(key)} />
  );

  const textField = (key) => (
    <textarea className="inp" value={D[key] || ''} onChange={setField(key)} />
  );

  const lockedBox = (value) => (
    <div className="inp" style={{ background: 'var(--mint)', minHeight: 44 }}>{value}</div>
  );

  // ---- Save changes ----
  const save = async () => {
    const missing = [];
    if (!D.category) missing.push('category');
    if (!D.name) missing.push('item name');
    if (!locked && !D.feature) missing.push('features');
    if (!D.date) missing.push('date');
    if (!D.loc) missing.push('location');
    if (!lost) {
      if (!locked && !D.secret) missing.push('secret feature');
      if (!D.position) missing.push('item location');
      if (D.position === ITEM_POSITIONS.staff_or_security && !D.condition) missing.push('condition description');
    }
    if (missing.length) {
      return setDlg({ t: 'ok', title: 'Please complete these fields first', msg: missing.join(', ') + '.' });
    }

    try {
      const form = new FormData();
      const category = categories.find((c) => c.name === D.category);

      form.append('category_id', category ? category.id : '');
      form.append('title', D.name);
      form.append('description', D.feature);
      form.append('event_date', D.date);
      form.append('location_note', D.loc);
      form.append('secret_feature', D.secret);
      form.append('item_position', Object.keys(ITEM_POSITIONS).find((code) => ITEM_POSITIONS[code] === D.position) || '');
      form.append('custody_condition', D.condition);
      form.append('reward', D.reward);
      if (photo.file) form.append('photo', photo.file);

      await api('/reports/' + id, { method: 'PUT', body: form });
      toast('Changes saved.');
      await reload();
      go('detail', id);
    } catch (x) {
      setDlg({ t: 'ok', title: 'Could not save', msg: x.message });
    }
  };

  return (
    <div className="w860">
      <h1 className="pt">Edit report</h1>
      <p className="subt">{r.title}. Changes appear on the report right away.</p>

      {locked && (
        <div className="warnb" style={{ margin: '16px 0' }}>
          There is an active claim on this report. Features and the secret feature are locked, and claimants will be notified if you save changes.
        </div>
      )}

      <div className="panel fl" style={{ marginTop: 16 }}>
        <Field c="rq" lab="Item category" tag="Required">
          <select className="inp" value={D.category} onChange={setField('category')}>
            <option value="">Choose a category</option>
            {categories.map((c) => <option key={c.id}>{c.name}</option>)}
          </select>
        </Field>

        <Field c="rq" lab="Item name" tag="Required">{inputField('name')}</Field>

        {locked ? (
          <Field c="rq" lab="Features" tag="Locked" hint="Locked while a claim is active.">
            {lockedBox(r.description)}
          </Field>
        ) : (
          <Field c="rq" lab="Features" tag="Required">{textField('feature')}</Field>
        )}

        {!lost && (locked ? (
          <Field c="vi" lab="Secret feature" tag="Locked" hint="Locked while a claim is active.">
            {lockedBox(r.secret_feature)}
          </Field>
        ) : (
          <Field c="vi" lab="Secret feature" tag="Very important" hint="Not shown publicly.">
            {inputField('secret')}
          </Field>
        ))}

        <Field c="rq" lab={lost ? 'Date lost' : 'Date found'} tag="Required">
          <input
            className="inp"
            style={{ maxWidth: 320 }}
            type="date"
            max={TODAY}
            value={D.date}
            onChange={setField('date')}
          />
        </Field>

        <Field c="rq" lab={lost ? 'Where was it last seen?' : 'Where was it found?'} tag="Required">
          {textField('loc')}
        </Field>

        {lost ? (
          <Field c="op" lab="Reward" tag="Optional">{inputField('reward')}</Field>
        ) : (
          <Field c="rq" lab="Where is the item now?" tag="Required">
            <select className="inp" value={D.position} onChange={setField('position')}>
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
            {textField('condition')}
          </Field>
        )}

        <Field c="op" lab="Replace photo" tag="Optional" hint="Leave empty if the photo is unchanged.">
          <PhotoDrop
            text="Choose a new photo to replace it"
            preview={photo.preview}
            onPick={photo.choose}
          />
        </Field>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn pri lg" onClick={save}>Save changes</button>
          <button className="btn net lg" type="button" onClick={() => go('detail', id)}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
