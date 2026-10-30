const { query } = require('../db');
const { sendError } = require('../utils/respond');

const requireLogin = (req, res, next) => {
  if (req.session.uid) return next();
  res.status(401).json({ error: 'Please log in first' });
};

const requireAdmin = async (req, res, next) => {
  if (!req.session.uid) return sendError(res, 401, 'Please log in first');

  const [u] = await query('SELECT role FROM users WHERE id=?', [req.session.uid]);
  if (u && u.role === 'admin') return next();
  sendError(res, 403, 'Admins only');
};

module.exports = { requireLogin, requireAdmin };
