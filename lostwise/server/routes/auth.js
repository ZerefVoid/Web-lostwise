const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { query } = require('../db');
const { REPORT_LIMIT, ACTIVE_STATUSES } = require('../config');
const asyncHandler = require('../middleware/asyncHandler');
const { sendError } = require('../utils/respond');

const router = express.Router();

// At most 10 login attempts per 15 minutes
const loginAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts' },
});

router.post('/signup', asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password || password.length < 8) {
    return sendError(res, 400, 'Enter your name, email and password (min. 8 characters)');
  }

  const alreadyExists = await query('SELECT id FROM users WHERE email=?', [email]);
  if (alreadyExists.length) return sendError(res, 409, 'Email is already registered');

  const result = await query(
    'INSERT INTO users(name,email,password_hash) VALUES(?,?,?)',
    [name, email, await bcrypt.hash(password, 10)]
  );

  req.session.uid = result.insertId;
  res.json({ ok: true });
}));

router.post('/login', loginAttemptLimiter, asyncHandler(async (req, res) => {
  const [user] = await query('SELECT * FROM users WHERE email=?', [req.body.email]);

  const passwordCorrect = user && (await bcrypt.compare(req.body.password || '', user.password_hash));
  if (!passwordCorrect) return sendError(res, 401, 'Wrong email or password');

  if (!user.active) return sendError(res, 403, 'Account deactivated');

  req.session.uid = user.id;
  res.json({ ok: true });
}));

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// Data of the logged-in user (null if not logged in)
router.get('/me', asyncHandler(async (req, res) => {
  if (!req.session.uid) return res.json(null);

  const [user] = await query('SELECT id,name,email,role FROM users WHERE id=?', [req.session.uid]);

  const [active] = await query(
    `SELECT COUNT(*) c FROM reports WHERE user_id=? AND status IN ${ACTIVE_STATUSES}`,
    [user.id]
  );
  const [unreadCount] = await query(
    'SELECT COUNT(*) c FROM notifications WHERE user_id=? AND is_read=0',
    [user.id]
  );

  res.json({
    ...user,
    active_reports: active.c,
    limit: REPORT_LIMIT,
    unread: unreadCount.c,
  });
}));

module.exports = router;
