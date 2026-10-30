require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const DEMO_PASSWORD = 'demo1234';

(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lostwise',
  });

  const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);

  // Demo accounts (skipped if the email already exists)
  await db.query(
    `INSERT IGNORE INTO users(name,email,password_hash,role) VALUES
       ('Riley Morgan','riley@campus.edu',?,'user'),
       ('Ben Stone','ben@campus.edu',?,'user'),
       ('Admin Lostwise','admin@lostwise.app',?,'admin')`,
    [hash, hash, hash]
  );

  // One sample report, only if the reports table is still empty
  const [[amount]] = await db.query('SELECT COUNT(*) c FROM reports');
  if (!amount.c) {
    await db.query(
      `INSERT INTO reports(
         user_id,type,category_id,title,description,event_date,location_note,
         secret_feature,item_position,status
       ) VALUES(
         1,'found',3,'Black Samsung phone','Black Samsung with a clear case, small crack at the corner',CURDATE(),
         'Bench in front of the library, 1st floor','Cat picture wallpaper','held_by_finder','found'
       )`
    );
  }

  console.log('Seed complete');
  process.exit();
})();
