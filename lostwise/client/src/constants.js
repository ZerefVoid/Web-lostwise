// Report status labels
export const STAT = {
  lost: 'Lost',
  found: 'Found',
  claim_in_progress: 'Claim in progress',
  returned: 'Returned',
  closed: 'Closed',
  withdrawn: 'Withdrawn',
};

// Complaint status labels (admin)
export const ASTAT = {
  new: 'New',
  in_review: 'In review',
  done: 'Done',
};

// Statuses counted as active reports
export const ACTIVE = ['lost', 'found', 'claim_in_progress'];

// Found item position: database code -> displayed text
export const ITEM_POSITIONS = {
  held_by_finder: 'I am holding it',
  student_affairs: 'Left at student affairs',
  staff_or_security: 'Left with staff or security',
};

// Badges: [name, minimum items returned]
export const BADGES = [
  ['First Finder', 1],
  ['Reliable Finder', 5],
  ['Campus Hero', 10],
];

// "How it works" steps: [label, title, explanation]
export const HOW = [
  ['1. Report', 'Create report', 'Add category, features, place and date. Finders must include a photo.'],
  ['2. Match', 'Matched automatically', 'The system shows likely matches and notifies both sides.'],
  ['3. Verify', 'Chat directly', 'Finders can message the owner straight from a lost report, no found report needed. On a found report, the finder asks about a secret feature.'],
  ['4. Hand over', 'Meet somewhere safe', 'Security post or student affairs office, then a proof photo confirms the handover and the finder earns points.'],
];

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Today's date (YYYY-MM-DD), used as the maximum for date inputs
export const TODAY = new Date().toISOString().slice(0, 10);
