import { MONTHS } from './constants.js';

// "2026-10-22 08:00:00" -> "22 Oct 2026"
export const fmt = (date) => {
  const d = new Date(String(date).replace(' ', 'T'));
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

// "Riley Morgan" -> "RM"
export const initials = (name) =>
  name.split(' ').map((word) => word[0]).slice(0, 2).join('').toUpperCase();

// Complaints held by an admin for over 24 hours can be taken over
export const isStale = (complaint) =>
  complaint.taken_at &&
  Date.parse(String(complaint.taken_at).replace(' ', 'T')) < Date.now() - 864e5;
