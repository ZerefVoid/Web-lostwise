// One form field: label + priority tag + hint + the input itself.
// c: 'vi' (very important), 'rq' (required), otherwise optional.
export default function Field({ c, lab, tag, hint, children }) {
  const priority = c === 'vi' ? 'p-vi' : c === 'rq' ? 'p-rq' : 'p-op';

  return (
    <div className={'fld ' + c}>
      <label>
        {lab}
        <span className={'pl ' + priority}>{tag}</span>
      </label>
      {hint && <div className="h">{hint}</div>}
      {children}
    </div>
  );
}
