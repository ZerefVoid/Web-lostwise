const express = require('express');
const { query } = require('../db');
const { REPORT_LIMIT, ACTIVE_STATUSES, PUBLIC_REPORT_COLUMNS } = require('../config');
const asyncHandler = require('../middleware/asyncHandler');
const { requireLogin } = require('../middleware/auth');
const { upload, urlPhoto } = require('../middleware/upload');
const { matchReports } = require('../services/matching');
const { notify } = require('../utils/notifications');
const { sendError } = require('../utils/respond');

const router = express.Router();

// Statuses that must not be public
const HIDDEN_STATUSES = ['pending_approval', 'closed', 'rejected', 'withdrawn'];

// ---- Report list (public) ----
router.get('/', asyncHandler(async (req, res) => {
  const { type, category, q, status } = req.query;

  const condition = ["l.status IN ('lost','found','claim_in_progress','returned')"];
  const params = [];

  if (type) {
    condition.push('l.type=?');
    params.push(type);
  }
  if (category) {
    condition.push('k.name=?');
    params.push(category);
  }
  if (status) {
    condition.push('l.status=?');
    params.push(status);
  }
  if (q) {
    condition.push('(l.title LIKE ? OR l.description LIKE ? OR l.location_note LIKE ?)');
    params.push(...Array(3).fill('%' + q + '%'));
  }

  const report = await query(
    `SELECT ${PUBLIC_REPORT_COLUMNS}
     FROM reports l JOIN categories k ON k.id=l.category_id
     WHERE ${condition.join(' AND ')}
     ORDER BY l.id DESC LIMIT 100`,
    params
  );
  res.json(report);
}));

// ---- My reports (must be defined before '/:id') ----
router.get('/mine', requireLogin, asyncHandler(async (req, res) => {
  const report = await query(
    `SELECT ${PUBLIC_REPORT_COLUMNS},
            l.secret_feature,
            (SELECT id FROM claims WHERE found_report_id=l.id AND status='chosen') chosen_claim
     FROM reports l JOIN categories k ON k.id=l.category_id
     WHERE l.user_id=?
     ORDER BY l.id DESC`,
    [req.session.uid]
  );
  res.json(report);
}));

// ---- Report details ----
router.get('/:id', asyncHandler(async (req, res) => {
  const [report] = await query(
    `SELECT ${PUBLIC_REPORT_COLUMNS}, l.secret_feature
     FROM reports l JOIN categories k ON k.id=l.category_id
     WHERE l.id=?`,
    [req.params.id]
  );

  const me = req.session.uid;
  const isAdmin = me && (await query("SELECT 1 FROM users WHERE id=? AND role='admin'", [me])).length > 0;

  const notVisible = !report || (!isAdmin && HIDDEN_STATUSES.includes(report.status));
  if (notVisible) return sendError(res, 404, 'Report not found');

  const mine = report.user_id === me;

  // The secret feature is only for the report owner and admins
  if (!mine && !isAdmin) delete report.secret_feature;
  report.admin = isAdmin;

  if (me && report.type === 'found') {
    if (mine || isAdmin) {
      // The finder and admins see all claims
      report.claim = await query(
        `SELECT c.id,c.status,p.name,c.claimant_id
         FROM claims c JOIN users p ON p.id=c.claimant_id
         WHERE c.found_report_id=?`,
        [report.id]
      );
    } else {
      // Other users only see their own claim
      report.claim = await query(
        'SELECT id,status FROM claims WHERE found_report_id=? AND claimant_id=?',
        [report.id, me]
      );
    }
  }

  if (me && report.type === 'lost') {
    if (mine || isAdmin) {
      // The owner and admins see every finder who started a chat
      report.claim = await query(
        `SELECT c.id,c.status,p.name,c.finder_id
         FROM claims c JOIN users p ON p.id=c.finder_id
         WHERE c.lost_report_id=? AND c.kind='direct'`,
        [report.id]
      );
    } else {
      // Other users only see their own chat
      report.claim = await query(
        "SELECT id,status FROM claims WHERE lost_report_id=? AND kind='direct' AND finder_id=?",
        [report.id, me]
      );
    }
  }

  report.mine = mine;
  res.json(report);
}));

// ---- Create report ----
router.post('/', requireLogin, upload.single('photo'), asyncHandler(async (req, res) => {
  const b = req.body;
  const me = req.session.uid;

  const [active] = await query(
    `SELECT COUNT(*) c FROM reports WHERE user_id=? AND status IN ${ACTIVE_STATUSES}`,
    [me]
  );
  if (active.c >= REPORT_LIMIT) {
    return sendError(res, 409, 'You already have 3 active reports. Finish or withdraw one.');
  }

  const typeValid = ['lost', 'found'].includes(b.type);
  if (!typeValid || !b.category_id || !b.title || !b.event_date) {
    return sendError(res, 400, 'Complete the required fields');
  }

  const found = b.type === 'found';

  if (found && (!req.file || !b.secret_feature || !b.item_position)) {
    return sendError(res, 400, 'Found reports need a photo, a secret feature and the item location');
  }
  if (found && b.item_position === 'staff_or_security' && !b.custody_condition) {
    return sendError(res, 400, 'Describe its condition');
  }

  const result = await query(
    `INSERT INTO reports(
       user_id,type,category_id,title,description,event_date,location_note,
       secret_feature,item_position,custody_condition,reward,status,photo_url,card_masked
     ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      me,
      b.type,
      b.category_id,
      b.title,
      b.description || '',
      b.event_date,
      b.location_note || '',
      found ? b.secret_feature : null,
      found ? b.item_position : null,
      found ? b.custody_condition || null : null,
      b.reward || null,
      found ? 'found' : 'lost',
      urlPhoto(req.file),
      b.card_masked === '1' ? 1 : 0,
    ]
  );

  await matchReports(result.insertId);
  res.json({ id: result.insertId });
}));

// ---- Withdraw report ----
router.post('/:id/withdraw', requireLogin, asyncHandler(async (req, res) => {
  const result = await query(
    "UPDATE reports SET status='withdrawn' WHERE id=? AND user_id=? AND status IN ('lost','found')",
    [req.params.id, req.session.uid]
  );
  if (!result.affectedRows) return sendError(res, 409, 'Report cannot be withdrawn');

  await query(
    "UPDATE claims SET status='closed' WHERE (found_report_id=? OR lost_report_id=? AND kind='direct') AND status='chat'",
    [req.params.id, req.params.id]
  );
  res.json({ ok: true });
}));

// ---- Start a claim ("This is mine") ----
router.post('/:id/claims', requireLogin, asyncHandler(async (req, res) => {
  const me = req.session.uid;

  const [report] = await query(
    "SELECT * FROM reports WHERE id=? AND type='found' AND status='found'",
    [req.params.id]
  );
  if (!report) return sendError(res, 404, 'Report not available');
  if (report.user_id === me) return sendError(res, 409, 'This is your own report');

  // If already claimed before, reuse the old claim
  const [oldClaim] = await query(
    'SELECT id,status FROM claims WHERE found_report_id=? AND claimant_id=?',
    [report.id, me]
  );
  if (oldClaim) {
    if (oldClaim.status === 'cancelled') return sendError(res, 409, 'Your claim was cancelled by the finder');
    return res.json({ id: oldClaim.id });
  }

  // Link to the claimant's latest lost report in the same category (if any)
  const [lostReport] = await query(
    `SELECT id FROM reports
     WHERE user_id=? AND type='lost' AND category_id=? AND status='lost'
     ORDER BY id DESC LIMIT 1`,
    [me, report.category_id]
  );

  const result = await query(
    'INSERT INTO claims(found_report_id,claimant_id,lost_report_id) VALUES(?,?,?)',
    [report.id, me, lostReport ? lostReport.id : null]
  );

  await notify(report.user_id, 'Someone claimed your found item.', String(report.id));
  res.json({ id: result.insertId });
}));

// ---- Start a chat from a lost report ("I found this") ----
// The finder talks to the owner directly, without creating a found report.
router.post('/:id/finds', requireLogin, asyncHandler(async (req, res) => {
  const me = req.session.uid;

  const [report] = await query(
    "SELECT * FROM reports WHERE id=? AND type='lost' AND status='lost'",
    [req.params.id]
  );
  if (!report) return sendError(res, 404, 'Report not available');
  if (report.user_id === me) return sendError(res, 409, 'This is your own report');

  // If this finder already started a chat, reuse it
  const [oldChat] = await query(
    "SELECT id,status FROM claims WHERE lost_report_id=? AND kind='direct' AND finder_id=?",
    [report.id, me]
  );
  if (oldChat) return res.json({ id: oldChat.id });

  const result = await query(
    "INSERT INTO claims(kind,lost_report_id,claimant_id,finder_id) VALUES('direct',?,?,?)",
    [report.id, report.user_id, me]
  );

  await notify(report.user_id, 'Someone says they found your lost item. Check the chat.', String(report.id));
  res.json({ id: result.insertId });
}));

// ---- Edit report ----
router.put('/:id', requireLogin, upload.single('photo'), asyncHandler(async (req, res) => {
  const me = req.session.uid;
  const b = req.body;

  const [report] = await query('SELECT * FROM reports WHERE id=? AND user_id=?', [req.params.id, me]);
  if (!report || !['lost', 'found', 'claim_in_progress'].includes(report.status)) {
    return sendError(res, 409, 'This report cannot be edited');
  }

  // While a claim is active, the features and secret feature are locked
  const activeClaims = await query(
    "SELECT claimant_id FROM claims WHERE found_report_id=? AND status IN ('chat','chosen')",
    [report.id]
  );
  const locked = activeClaims.length > 0;
  const found = report.type === 'found';

  if (!b.category_id || !b.title || !b.event_date || !b.location_note) {
    return sendError(res, 400, 'Complete the required fields');
  }
  if (found && (!b.item_position || (b.item_position === 'staff_or_security' && !b.custody_condition))) {
    return sendError(res, 400, 'Complete the item location');
  }

  const description = locked ? report.description : b.description || '';
  const secretFeature = found ? (locked ? report.secret_feature : b.secret_feature) : null;
  const itemPosition = found ? b.item_position : null;
  const custodyCondition = found ? (b.item_position === 'staff_or_security' ? b.custody_condition : null) : null;
  const reward = found ? null : b.reward || null;
  const photoUrl = req.file ? urlPhoto(req.file) : report.photo_url;

  await query(
    `UPDATE reports SET
       category_id=?,title=?,event_date=?,location_note=?,description=?,
       secret_feature=?,item_position=?,custody_condition=?,reward=?,photo_url=?
     WHERE id=?`,
    [
      b.category_id, b.title, b.event_date, b.location_note, description,
      secretFeature, itemPosition, custodyCondition, reward, photoUrl,
      report.id,
    ]
  );

  // Notify every active claimant
  for (const claim of activeClaims) {
    await notify(
      claim.claimant_id,
      'Report updated: the finder updated the report "' + b.title + '".',
      String(report.id)
    );
  }

  res.json({ ok: true });
}));

module.exports = router;
