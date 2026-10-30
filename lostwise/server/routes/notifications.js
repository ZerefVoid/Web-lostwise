const express = require('express');
const { query } = require('../db');
const asyncHandler = require('../middleware/asyncHandler');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

// Fetch the 50 latest notifications, then mark them all as read
router.get('/', requireLogin, asyncHandler(async (req, res) => {
  const notifications = await query(
    'SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 50',
    [req.session.uid]
  );
  await query('UPDATE notifications SET is_read=1 WHERE user_id=?', [req.session.uid]);
  res.json(notifications);
}));

module.exports = router;
