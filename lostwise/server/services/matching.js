const { query } = require('../db');
const { notify } = require('../utils/notifications');

const MS_PER_DAY = 864e5;
const MIN_SCORE = 80;

// Set of words (at least 3 letters/digits) from a text
const extractWords = (text) => new Set(String(text || '').toLowerCase().match(/[a-z0-9]{3,}/g) || []);

// How many words two sets share (0 to 1)
const overlapRate = (a, b) => {
  let shared = 0;
  a.forEach((word) => b.has(word) && shared++);
  return shared / Math.max(1, Math.min(a.size, b.size));
};

// The closer the found date is to the lost date, the higher the score
const dayDiffScore = (day) => (day <= 1 ? 15 : day <= 3 ? 12 : day <= 7 ? 8 : 0);

// Find similar counterpart reports (lost <-> found), then notify both owners
async function matchReports(reportId) {
  const [report] = await query('SELECT * FROM reports WHERE id=?', [reportId]);

  const candidates = await query(
    "SELECT * FROM reports WHERE type<>? AND category_id=? AND status IN ('lost','found')",
    [report.type, report.category_id]
  );

  for (const counterpart of candidates) {
    const lost = report.type === 'lost' ? report : counterpart;
    const found = report.type === 'lost' ? counterpart : report;

    // An item cannot be found before it was lost
    if (found.event_date < lost.event_date) continue;

    const dayDiff = (new Date(found.event_date) - new Date(lost.event_date)) / MS_PER_DAY;

    const itemSimilarity = overlapRate(
      extractWords(lost.title + ' ' + lost.description),
      extractWords(found.title + ' ' + found.description)
    );
    const locationSimilarity = overlapRate(extractWords(lost.location_note), extractWords(found.location_note));

    const score = 40 + 30 * itemSimilarity + dayDiffScore(dayDiff) + 15 * locationSimilarity;

    if (score >= MIN_SCORE) {
      await notify(lost.user_id, 'Possible match: your lost report looks like a found report.', String(found.id));
      await notify(found.user_id, 'Possible match: your found report looks like a lost report.', String(found.id));
    }
  }
}

module.exports = { matchReports };
