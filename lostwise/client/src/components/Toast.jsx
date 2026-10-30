export default function Toast({ t }) {
  return t ? <div className="toast">{t}</div> : null;
}
