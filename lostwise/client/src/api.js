// Fetch wrapper for the backend. Handles JSON, FormData and errors automatically.
export const api = async (url, option = {}) => {
  const isFormData = option.body instanceof FormData;

  const res = await fetch('/api' + url, {
    method: option.method || (option.body ? 'POST' : 'GET'),
    credentials: 'include',
    headers: isFormData || !option.body ? {} : { 'Content-Type': 'application/json' },
    body: isFormData ? option.body : option.body && JSON.stringify(option.body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed');
  return data;
};
