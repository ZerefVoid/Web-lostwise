const express = require('express');
const { query } = require('../db');
const asyncHandler = require('../middleware/asyncHandler');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireLogin, asyncHandler(async (req, res) => {
  const me = req.session.uid;

  const [user] = await query('SELECT name,created_at FROM users WHERE id=?', [me]);

  // Total points and number of items returned
  const [summary] = await query(
    `SELECT COALESCE(SUM(amount),0) points,
            COUNT(DISTINCT CASE WHEN reason='returned' THEN report_id END) n
     FROM points_history WHERE user_id=?`,
    [me]
  );

  // Ranking of all finders this month, to find my rank
  const monthRanking = await query(
    `SELECT user_id FROM points_history
     WHERE created_at>=DATE_FORMAT(NOW(),'%Y-%m-01')
     GROUP BY user_id
     ORDER BY SUM(amount) DESC`
  );

  const history = await query(
    `SELECT r.amount,r.reason,r.created_at,l.title
     FROM points_history r LEFT JOIN reports l ON l.id=r.report_id
     WHERE r.user_id=?
     ORDER BY r.id DESC`,
    [me]
  );

  res.json({
    name: user.name,
    joined: user.created_at,
    points: +summary.points,
    n: summary.n,
    rank: monthRanking.findIndex((x) => x.user_id === me) + 1,
    history,
  });
}));

module.exports = router;
