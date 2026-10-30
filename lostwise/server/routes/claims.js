const express = require('express');
const { query } = require('../db');
const asyncHandler = require('../middleware/asyncHandler');
const { requireLogin } = require('../middleware/auth');
const { upload, urlPhoto } = require('../middleware/upload');
const { notify } = require('../utils/notifications');
const { sendError } = require('../utils/respond');

const router = express.Router();

// Fetch the claim, only if the current user is the claimant or the finder.
// Two kinds of claim exist:
//   'claim'  - someone presses "This is mine" on a found report (finder = report owner)
//   'direct' - someone presses "I found this" on a lost report (claimant = owner of the lost report)
// If not entitled, the error reply has been sent and the result is null.
async function fetchClaim(req, res) {
  const [claim] = await query(
    `SELECT c.id,c.kind,c.status,c.found_report_id,c.lost_report_id,c.claimant_id,c.proof_photo,
            COALESCE(f.user_id, c.finder_id) finder_id,
            COALESCE(f.title, lr.title) title,
            COALESCE(c.found_report_id, c.lost_report_id) report_id,
            (SELECT name FROM users WHERE id=c.claimant_id) claimant_name,
            (SELECT name FROM users WHERE id=COALESCE(f.user_id, c.finder_id)) finder_name
     FROM claims c
     LEFT JOIN reports f ON f.id=c.found_report_id
     LEFT JOIN reports lr ON lr.id=c.lost_report_id
     WHERE c.id=?`,
    [req.params.id]
  );

  const entitled = claim && [claim.claimant_id, claim.finder_id].includes(req.session.uid);
  if (!entitled) {
    sendError(res, 403, 'No access');
    return null;
  }
  return claim;
}

// Handler for actions only the finder may perform
const onlyFinder = (action) =>
  asyncHandler(async (req, res) => {
    const claim = await fetchClaim(req, res);
    if (!claim) return;
    if (req.session.uid !== claim.finder_id) return sendError(res, 403, 'Finder only');
    await action(req, res, claim);
  });

// Choose / reject / cancel only exist for claims on found reports
const onlyClaimOnFound = (action) =>
  onlyFinder(async (req, res, claim) => {
    if (claim.kind !== 'claim') return sendError(res, 409, 'Not available for this chat');
    await action(req, res, claim);
  });

// ---- Claim details ----
router.get('/:id', requireLogin, asyncHandler(async (req, res) => {
  const claim = await fetchClaim(req, res);
  if (!claim) return;

  claim.role = req.session.uid === claim.finder_id ? 'finder' : 'owner';
  res.json(claim);
}));

// ---- Chat ----
// Fetch messages with an id greater than ?after= (used for polling)
router.get('/:id/messages', requireLogin, asyncHandler(async (req, res) => {
  const claim = await fetchClaim(req, res);
  if (!claim) return;

  const message = await query(
    `SELECT id,sender_id,
            IF(hidden,'Message hidden by admin',body) body,
            hidden,sent_at
     FROM messages
     WHERE claim_id=? AND id>?
     ORDER BY id`,
    [claim.id, +req.query.after || 0]
  );
  res.json(message);
}));

router.post('/:id/messages', requireLogin, asyncHandler(async (req, res) => {
  const claim = await fetchClaim(req, res);
  if (!claim) return;

  const chatStillOpen = ['chat', 'chosen'].includes(claim.status);
  if (!chatStillOpen || !(req.body.body || '').trim()) {
    return sendError(res, 400, 'Message cannot be sent');
  }

  await query(
    'INSERT INTO messages(claim_id,sender_id,body) VALUES(?,?,?)',
    [claim.id, req.session.uid, req.body.body.trim()]
  );

  const recipient = req.session.uid === claim.finder_id ? claim.claimant_id : claim.finder_id;
  await notify(recipient, 'New message in the claim chat.', String(claim.report_id));

  res.json({ ok: true });
}));

// ---- Finder actions ----

// Choose this claimant as the owner. Other claims still in progress are closed.
router.post('/:id/choose', requireLogin, onlyClaimOnFound(async (req, res, claim) => {
  if (claim.status !== 'chat') return sendError(res, 409, 'Claim cannot be chosen');

  await query("UPDATE claims SET status='chosen' WHERE id=?", [claim.id]);
  await query(
    "UPDATE claims SET status='closed',closed_by_claim_id=? WHERE found_report_id=? AND status='chat' AND id<>?",
    [claim.id, claim.found_report_id, claim.id]
  );
  await query("UPDATE reports SET status='claim_in_progress' WHERE id=?", [claim.found_report_id]);

  await notify(
    claim.claimant_id,
    'You were chosen as the owner. Arrange the handover in chat.',
    String(claim.found_report_id)
  );
  res.json({ ok: true });
}));

router.post('/:id/reject', requireLogin, onlyClaimOnFound(async (req, res, claim) => {
  await query("UPDATE claims SET status='rejected' WHERE id=? AND status='chat'", [claim.id]);
  res.json({ ok: true });
}));

// Cancel handover: the claim is cancelled, the report goes back to "found",
// and other claims that were closed because of this choice are reopened.
router.post('/:id/cancel-handover', requireLogin, onlyClaimOnFound(async (req, res, claim) => {
  if (claim.status !== 'chosen') return sendError(res, 409, 'Cannot be cancelled');

  await query("UPDATE claims SET status='cancelled' WHERE id=?", [claim.id]);
  await query(
    "UPDATE claims SET status='chat',closed_by_claim_id=NULL WHERE closed_by_claim_id=?",
    [claim.id]
  );
  await query("UPDATE reports SET status='found' WHERE id=?", [claim.found_report_id]);

  await notify(claim.claimant_id, 'The finder cancelled the handover.', String(claim.found_report_id));
  res.json({ ok: true });
}));

// Confirm the handover.
//  - claim on a found report: the finder confirms, a proof photo is optional but needed for points
//  - direct chat on a lost report: the OWNER confirms and must upload the proof photo;
//    the finder earns the points without ever creating a report
router.post('/:id/handover', requireLogin, upload.single('photo'), asyncHandler(async (req, res) => {
  const claim = await fetchClaim(req, res);
  if (!claim) return;

  const me = req.session.uid;
  const direct = claim.kind === 'direct';
  const allowed = direct ? me === claim.claimant_id : me === claim.finder_id;
  if (!allowed) return sendError(res, 403, direct ? 'Only the owner can confirm' : 'Finder only');

  const openStatus = direct ? 'chat' : 'chosen';
  if (claim.status !== openStatus) return sendError(res, 409, 'This handover cannot be confirmed');
  if (direct && !req.file) return sendError(res, 400, 'Upload a photo of the item you got back');

  await query("UPDATE claims SET status='done',proof_photo=? WHERE id=?", [urlPhoto(req.file), claim.id]);
  await query("UPDATE reports SET status='returned' WHERE id=?", [claim.report_id]);

  if (direct) {
    // Other finders who chatted about the same lost report are closed
    await query(
      "UPDATE claims SET status='closed' WHERE lost_report_id=? AND kind='direct' AND status='chat' AND id<>?",
      [claim.lost_report_id, claim.id]
    );
  } else if (claim.lost_report_id) {
    await query("UPDATE reports SET status='returned' WHERE id=?", [claim.lost_report_id]);
  }

  if (req.file) {
    // 10 points for a returned item
    await query(
      "INSERT IGNORE INTO points_history(user_id,report_id,amount,reason) VALUES(?,?,10,'returned')",
      [claim.finder_id, claim.report_id]
    );
    // 5 bonus points if returned within 3 days of the report being created
    await query(
      `INSERT IGNORE INTO points_history(user_id,report_id,amount,reason)
       SELECT ?,id,5,'quick_bonus' FROM reports
       WHERE id=? AND TIMESTAMPDIFF(DAY,created_at,NOW())<=3`,
      [claim.finder_id, claim.report_id]
    );
  }

  const other = me === claim.finder_id ? claim.claimant_id : claim.finder_id;
  await notify(
    other,
    direct ? 'The owner confirmed the handover. Your points were added.' : 'Your item is recorded as returned.',
    String(claim.report_id)
  );
  res.json({ ok: true });
}));

module.exports = router;
