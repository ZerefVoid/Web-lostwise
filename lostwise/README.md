# Lostwise (MySQL + Express + React)

A campus lost-and-found web app: report, search and match lost items, verify the owner through chat, and hand the item over safely.

## Run it

1. `mysql -u root -p < server/schema.sql`
2. `cd server && cp .env.example .env && npm i && npm run seed && npm start`  (API on :4000)
3. `cd client && npm i && npm run dev`  (web on :5173)

Demo accounts (password `demo1234`): riley@campus.edu, ben@campus.edu, admin@lostwise.app

The database is named `lostwise`. If you ran an older version of this project, create the new database with the steps above; the old database is not touched.

## Folder structure

```
server/
  server.js          Express setup + mounts all routes
  config.js          constants (report limit, active statuses, badges)
  db.js              MySQL connection
  middleware/        auth (login/admin), photo upload, error catcher
  routes/            one file per feature: auth, reports, claims, complaints, admin, ...
  services/          matching logic for lost and found reports
  utils/             small helpers (notifications, error replies)

client/src/
  App.jsx            simple routing + global state
  api.js             fetch wrapper
  constants.js       status labels, item positions, badges, ...
  utils.js           date format, initials
  context.js         Ctx (dialog + toast)
  components/        Header, Card, Chat, Dialog, Field, PhotoDrop, ...
  hooks/             usePhoto
  pages/             one file per page
  pages/admin/       Admin (dashboard) and ReviewComplaint
```

## API endpoints

```
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
GET  /api/categories
GET  /api/reports
GET  /api/reports/mine
GET  /api/reports/:id
POST /api/reports
POST /api/reports/:id/withdraw
POST /api/reports/:id/claims
PUT  /api/reports/:id
GET  /api/claims/:id
GET  /api/claims/:id/messages
POST /api/claims/:id/messages
POST /api/claims/:id/choose
POST /api/claims/:id/reject
POST /api/claims/:id/cancel-handover
POST /api/claims/:id/handover
GET  /api/notifications
GET  /api/leaderboard
POST /api/complaints
GET  /api/profile
GET  /api/admin/dashboard
GET  /api/admin/complaints/:id
POST /api/admin/complaints/:id/review
POST /api/admin/complaints/:id/take-over
GET  /api/admin/claims/:cid/messages
POST /api/admin/complaints/:id/decide
POST /api/admin/accounts/:id
```
