const express = require('express');
const { query } = require('../db');
const { BADGES } = require('../config');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

const initials = (name) => name.split(' ').map((word) => word[0]).slice(0, 2).join('').toUpperCase();

// Highest badge reached based on the number of items returned
const findBadge = (amount) => {
  const badge = BADGES.find(([minimal]) => amount >= minimal);
  return badge ? badge[1] : null;
};

// ?period=month for this month's ranking, otherwise all time
router.get('/', asyncHandler(async (req, res) => {
  const monthFilter = req.query.period === 'month'
    ? "WHERE r.created_at>=DATE_FORMAT(NOW(),'%Y-%m-01')"
    : '';

  const row = await query(
    `SELECT p.name, SUM(r.amount) points, COUNT(*) n
     FROM points_history r JOIN users p ON p.id=r.user_id
     ${monthFilter}
     GROUP BY p.id
     ORDER BY points DESC
     LIMIT 20`
  );

  res.json(row.map((r) => ({
    initials: initials(r.name),
    points: +r.points,
    badge: findBadge(r.n),
  })));
}));

module.exports = router;
