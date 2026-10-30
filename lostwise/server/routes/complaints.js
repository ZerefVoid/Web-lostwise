const express = require('express');
const { query } = require('../db');
const asyncHandler = require('../middleware/asyncHandler');
const { requireLogin } = require('../middleware/auth');
const { sendError } = require('../utils/respond');

const router = express.Router();

const COMPLAINTS_PER_DAY_LIMIT = 5;
const REPORTERS_TO_SUSPEND = 3;

// Send a complaint about a report (type 'report', target = report id)
// or a chat message (type 'message', target = "claimId:messageId")
router.post('/', requireLogin, asyncHandler(async (req, res) => {
  const me = req.session.uid;
  const { type, target, reason, details } = req.body;

  let ownerId;        // owner of the reported report/message
  let reportId = null; // only set when the complaint is about a report

  if (type === 'report') {
    const [report] = await query('SELECT id,user_id,status FROM reports WHERE id=?', [target]);
    if (!report) return sendError(res, 404, 'Report not found');

    ownerId = report.user_id;
    reportId = report.id;
  } else {
    const [claimId, messageId] = String(target).split(':');
    const [message] = await query(
      `SELECT m.sender_id, c.claimant_id, COALESCE(l.user_id, c.finder_id) finder
       FROM messages m
       JOIN claims c ON c.id=m.claim_id
       LEFT JOIN reports l ON l.id=c.found_report_id
       WHERE m.id=? AND c.id=?`,
      [messageId, claimId]
    );

    // Only chat participants may report its messages
    if (!message || ![message.claimant_id, message.finder].includes(me)) {
      return sendError(res, 403, 'No access');
    }
    ownerId = message.sender_id;
  }

  if (ownerId === me) {
    return sendError(res, 400, 'You cannot report your own report or message.');
  }

  const alreadyReported = await query(
    'SELECT 1 FROM complaints WHERE reporter_id=? AND type=? AND target_id=?',
    [me, type, String(target)]
  );
  if (alreadyReported.length) return sendError(res, 409, 'You have already reported this.');

  const [complaintsToday] = await query(
    'SELECT COUNT(*) c FROM complaints WHERE reporter_id=? AND created_at>NOW()-INTERVAL 1 DAY',
    [me]
  );
  if (complaintsToday.c >= COMPLAINTS_PER_DAY_LIMIT) {
    return sendError(res, 429, 'You have reached today’s report limit.');
  }

  await query(
    'INSERT INTO complaints(reporter_id,type,target_id,reason,details) VALUES(?,?,?,?,?)',
    [me, type, String(target), reason, (details || '').slice(0, 255)]
  );

  // A report complained about by 3 different people is hidden until an admin reviews it
  if (reportId) {
    const [distinctReporters] = await query(
      "SELECT COUNT(DISTINCT reporter_id) c FROM complaints WHERE type='report' AND target_id=?",
      [String(reportId)]
    );
    if (distinctReporters.c >= REPORTERS_TO_SUSPEND) {
      await query(
        `UPDATE reports SET previous_status=status, status='pending_approval'
         WHERE id=? AND status IN ('lost','found','claim_in_progress')`,
        [reportId]
      );
    }
  }

  res.json({ ok: true });
}));

module.exports = router;
