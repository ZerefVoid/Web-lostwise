require('dotenv').config();

const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const { UPLOAD_DIR } = require('./config');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 },
}));

// Photos uploaded by users
app.use('/uploads', express.static(UPLOAD_DIR));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/claims', require('./routes/claims'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/admin', require('./routes/admin'));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log('API listening on :' + PORT));
