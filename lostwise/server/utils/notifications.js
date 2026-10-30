const { query } = require('../db');

const notify = (userId, body, link) =>
  query('INSERT INTO notifications(user_id,body,link) VALUES(?,?,?)', [userId, body, link]);

module.exports = { notify };
