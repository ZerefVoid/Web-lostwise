const path = require('path');

const UPLOAD_DIR = path.join(__dirname, 'uploads');

// Maximum active reports per user
const REPORT_LIMIT = 3;

// Statuses counted as active reports (used in the SQL "IN ..." clause)
const ACTIVE_STATUSES = "('pending_approval','lost','found','claim_in_progress')";

// Report columns that may be public (without secret_feature)
const PUBLIC_REPORT_COLUMNS = [
  'l.id', 'l.type', 'l.title', 'l.description', 'l.event_date',
  'l.location_note', 'l.item_position', 'l.custody_condition', 'l.reward',
  'l.status', 'l.photo_url', 'l.card_masked', 'l.created_at', 'l.user_id',
  'k.name category',
].join(',');

// Finder badges: [minimum items returned, name]. Ordered from highest.
const BADGES = [
  [10, 'Campus Hero'],
  [5, 'Reliable Finder'],
  [1, 'First Finder'],
];

module.exports = { UPLOAD_DIR, REPORT_LIMIT, ACTIVE_STATUSES, PUBLIC_REPORT_COLUMNS, BADGES };
