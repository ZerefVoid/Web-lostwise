import { useState } from 'react';

// State for one photo picked by the user (original file + preview URL)
export default function usePhoto() {
  const [file, setFile] = useState();
  const [preview, setPreview] = useState();

  const choose = (f) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  return { file, preview, choose };
}
