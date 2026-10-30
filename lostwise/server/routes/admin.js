const express = require('express');
const { query } = require('../db');
const { ACTIVE_STATUSES, PUBLIC_REPORT_COLUMNS } = require('../config');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAdmin } = require('../middleware/auth');
const { notify } = require('../utils/notifications');
const { sendError } = require('../utils/respond');

const router = express.Router();

// Every route in this file is admin only
router.use(requireAdmin);

const VALID_DECISIONS = ['report_valid', 'delete_report', 'hide_message', 'warn_user', 'close'];
const WARNING_LIMIT = 3;

// Record admin actions in the log
const logAction = (adminId, text) =>
  query('INSERT INTO admin_log(admin_id,text) VALUES(?,?)', [adminId, text]);

// ---- Dashboard ----
router.get('/dashboard', asyncHandler(async (req, res) => {
  const count = async (sql) => (await query(sql))[0].c;

  // Unresolved complaints are shown first
  const complaints = await query(
    `SELECT a.*, p.name reporter, pn.name handler,
            IF(a.type='report',(SELECT title FROM reports WHERE id=a.target_id),NULL) title
     FROM complaints a
     JOIN users p ON p.id=a.reporter_id
     LEFT JOIN users pn ON pn.id=a.handler_id
     ORDER BY (a.status='done'), a.id DESC`
  );

  res.json({
    userCount: await count('SELECT COUNT(*) c FROM users'),
    activeCount: await count(`SELECT COUNT(*) c FROM reports WHERE status IN ${ACTIVE_STATUSES}`),
    returnedCount: await count("SELECT COUNT(*) c FROM reports WHERE status='returned'"),
    openCount: complaints.filter((a) => a.status !== 'done').length,
    complaints,
    users: await query(
      `SELECT p.id,p.name,p.email,p.role,p.active,
              (SELECT COUNT(*) FROM warnings w WHERE w.user_id=p.id) warnings
       FROM users p ORDER BY p.id`
    ),
    log: await query(
      `SELECT l.created_at,l.text,p.name admin
       FROM admin_log l JOIN users p ON p.id=l.admin_id
       ORDER BY l.id DESC LIMIT 8`
    ),
  });
}));

// ---- Complaint details ----
router.get('/complaints/:id', asyncHandler(async (req, res) => {
  const [complaint] = await query(
    `SELECT a.*, p.name reporter, pn.name handler
     FROM complaints a
     JOIN users p ON p.id=a.reporter_id
     LEFT JOIN users pn ON pn.id=a.handler_id
     WHERE a.id=?`,
    [req.params.id]
  );
  if (!complaint) return sendError(res, 404, 'Not found');

  const target = {};
  let ownerId = null;

  if (complaint.type === 'report') {
    const [report] = await query(
      `SELECT ${PUBLIC_REPORT_COLUMNS}, l.secret_feature
       FROM reports l JOIN categories k ON k.id=l.category_id
       WHERE l.id=?`,
      [complaint.target_id]
    );
    target.report = report;
    ownerId = report && report.user_id;
  } else {
    const [claimId, messageId] = complaint.target_id.split(':');
    const [message] = await query(
      `SELECT m.id,m.claim_id,m.sender_id,m.body,m.hidden,p.name
       FROM messages m JOIN users p ON p.id=m.sender_id
       WHERE m.id=? AND m.claim_id=?`,
      [messageId, claimId]
    );
    target.message = message;
    ownerId = message && message.sender_id;
  }

  const owner = ownerId
    ? (await query('SELECT id,name,active FROM users WHERE id=?', [ownerId]))[0]
    : null;

  const warnings = owner
    ? await query('SELECT reason,created_at FROM warnings WHERE user_id=?', [owner.id])
    : [];

  // Number of other complaints against reports or messages by the same person
  const otherComplaints = owner
    ? (await query(
        `SELECT COUNT(*) c FROM complaints x
         WHERE x.id<>?
           AND (
             (x.type='report' AND x.target_id IN (SELECT id FROM reports WHERE user_id=?))
             OR
             (x.type='message' AND SUBSTRING_INDEX(x.target_id,':',-1) IN (SELECT id FROM messages WHERE sender_id=?))
           )`,
        [complaint.id, owner.id, owner.id]
      ))[0].c
    : 0;

  res.json({ ...complaint, t: target, owner: owner, warnings, other: otherComplaints });
}));

// ---- Start reviewing a complaint ----
router.post('/complaints/:id/review', asyncHandler(async (req, res) => {
  const result = await query(
    "UPDATE complaints SET status='in_review',handler_id=?,taken_at=NOW() WHERE id=? AND status='new'",
    [req.session.uid, req.params.id]
  );
  if (result.affectedRows) await logAction(req.session.uid, 'Started reviewing report #' + req.params.id);

  res.json({ ok: true });
}));

// ---- Take over a complaint that another admin has held for more than 24 hours ----
router.post('/complaints/:id/take-over', asyncHandler(async (req, res) => {
  const result = await query(
    `UPDATE complaints SET handler_id=?,taken_at=NOW()
     WHERE id=? AND status='in_review' AND taken_at<NOW()-INTERVAL 24 HOUR`,
    [req.session.uid, req.params.id]
  );
  if (!result.affectedRows) return sendError(res, 409, 'Cannot be taken over yet');

  await logAction(req.session.uid, 'Took over report #' + req.params.id);
  res.json({ ok: true });
}));

// ---- Open the whole claim chat (access is recorded in the log) ----
router.get('/claims/:cid/messages', asyncHandler(async (req, res) => {
  await logAction(req.session.uid, 'Accessed claim chat #' + req.params.cid + ' (report #' + req.query.complaint + ')');

  const message = await query(
    `SELECT m.id, p.name, IF(m.hidden,NULL,m.body) body, m.hidden
     FROM messages m JOIN users p ON p.id=m.sender_id
     WHERE m.claim_id=?
     ORDER BY m.id`,
    [req.params.cid]
  );
  res.json(message);
}));

// ---- Decide a complaint ----
router.post('/complaints/:id/decide', asyncHandler(async (req, res) => {
  const decision = req.body.decision;

  const [complaint] = await query(
    "SELECT * FROM complaints WHERE id=? AND status='in_review' AND handler_id=?",
    [req.params.id, req.session.uid]
  );
  if (!complaint || !VALID_DECISIONS.includes(decision)) {
    return sendError(res, 409, 'Cannot be decided');
  }

  let ownerId = null;
  let reportId = null;
  let note = '';

  if (complaint.type === 'report') {
    const [report] = await query('SELECT * FROM reports WHERE id=?', [complaint.target_id]);
    if (report) {
      ownerId = report.user_id;
      reportId = report.id;
    }
  } else {
    const messageId = complaint.target_id.split(':')[1];
    const [message] = await query('SELECT sender_id FROM messages WHERE id=?', [messageId]);
    ownerId = message && message.sender_id;
  }

  // Report declared valid: goes live again with its previous status
  if (decision === 'report_valid' && reportId) {
    await query(
      `UPDATE reports
       SET status=COALESCE(previous_status,IF(type='lost','lost','found'))
       WHERE id=? AND status='pending_approval'`,
      [reportId]
    );
  }

  // Delete report (soft delete): claims still in progress are closed
  if (decision === 'delete_report' && reportId) {
    await query("UPDATE reports SET status='rejected' WHERE id=?", [reportId]);
    await query(
      "UPDATE claims SET status='closed' WHERE (found_report_id=? OR lost_report_id=? AND kind='direct') AND status='chat'",
      [reportId, reportId]
    );
  }

  if (decision === 'hide_message' && complaint.type === 'message') {
    await query('UPDATE messages SET hidden=1 WHERE id=?', [complaint.target_id.split(':')[1]]);
  }

  if (decision === 'warn_user' && ownerId) {
    await query(
      'INSERT INTO warnings(user_id,complaint_id,reason) VALUES(?,?,?)',
      [ownerId, complaint.id, complaint.reason]
    );
    await notify(
      ownerId,
      'Warning from admin: your report or message broke the rules: ' + complaint.reason + '.',
      null
    );

    const [warningCount] = await query('SELECT COUNT(*) c FROM warnings WHERE user_id=?', [ownerId]);
    if (warningCount.c >= WARNING_LIMIT) note = ' The user reached the warning limit.';
  }

  await query(
    "UPDATE complaints SET status='done',decision=?,note=? WHERE id=?",
    [decision, req.body.note || '', complaint.id]
  );
  await logAction(req.session.uid, 'Report decision #' + complaint.id + ': ' + decision);
  await notify(complaint.reporter_id, 'Your report has been reviewed. Thanks for reporting.', null);

  res.json({ ok: true, note });
}));

// ---- Activate / deactivate account ----
router.post('/accounts/:id', asyncHandler(async (req, res) => {
  if (+req.params.id === req.session.uid) return sendError(res, 400, 'You cannot do this on your own account');

  await query('UPDATE users SET active=1-active WHERE id=?', [req.params.id]);
  const [user] = await query('SELECT name,active FROM users WHERE id=?', [req.params.id]);

  await logAction(req.session.uid, (user.active ? 'Activate' : 'Deactivate') + ' account ' + user.name);
  res.json({ active: user.active });
}));

module.exports = router;
