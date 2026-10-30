import { useRef } from 'react';

// Photo picker box. Clicking opens the file dialog.
export default function PhotoDrop({ room = '', text, preview, onPick }) {
  const inputRef = useRef();

  const handlePick = (e) => {
    const f = e.target.files[0];
    if (f) onPick(f);
  };

  return (
    <>
      <div className={'drop ' + room} onClick={() => inputRef.current.click()}>
        {preview && <img src={preview} alt="Photo preview" />}
        {preview ? 'Photo selected. Click to replace.' : text}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={handlePick}
      />
    </>
  );
}
