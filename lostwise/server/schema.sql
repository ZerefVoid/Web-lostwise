-- Lostwise database. Run once on an empty MySQL server:  mysql -u root -p < schema.sql
-- Already have an old lostwise database? Drop it first:  DROP DATABASE lostwise;

CREATE DATABASE IF NOT EXISTS lostwise CHARACTER SET utf8mb4;
USE lostwise;

CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  phone         VARCHAR(20) NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('user','admin') DEFAULT 'user',
  active        TINYINT(1) DEFAULT 1,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(50) UNIQUE,
  sort_order INT
);

INSERT INTO categories (name, sort_order) VALUES
  ('Water bottle', 1),
  ('Student ID', 2),
  ('Phone', 3),
  ('Keys', 4),
  ('Charger/Power bank', 5),
  ('Stationery/Books', 6),
  ('Laptop', 7),
  ('Bag', 8),
  ('Clothing', 9),
  ('Accessories', 10),
  ('Other', 99);

CREATE TABLE reports (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  user_id          INT NOT NULL,
  type             ENUM('lost','found') NOT NULL,
  category_id      INT NOT NULL,
  title            VARCHAR(150) NOT NULL,
  description      TEXT,
  event_date       DATE,
  location_note    TEXT,
  secret_feature   VARCHAR(255) NULL,
  item_position    ENUM('held_by_finder','student_affairs','staff_or_security') NULL,
  custody_condition TEXT NULL,
  reward           VARCHAR(150) NULL,
  status           ENUM('pending_approval','lost','found','claim_in_progress',
                        'returned','closed','rejected','withdrawn') NOT NULL,
  photo_url        VARCHAR(255) NULL,
  previous_status  VARCHAR(20) NULL,
  card_masked      TINYINT(1) DEFAULT 0,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (category_id) REFERENCES categories(id),
  INDEX (status),
  INDEX (user_id, status),
  FULLTEXT (title, description, location_note)
);

-- A chat between a finder and an owner. Two kinds:
--   'claim'  : someone pressed "This is mine" on a found report (finder = owner of the found report)
--   'direct' : someone pressed "I found this" on a lost report
--              (claimant = owner of the lost report, finder_id = the person who found it)
CREATE TABLE claims (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  kind               ENUM('claim','direct') NOT NULL DEFAULT 'claim',
  found_report_id    INT NULL,
  claimant_id        INT NOT NULL,
  finder_id          INT NULL,
  status             ENUM('chat','chosen','rejected','closed','done','cancelled') DEFAULT 'chat',
  lost_report_id     INT NULL,
  closed_by_claim_id INT NULL,
  proof_photo        VARCHAR(255) NULL,
  created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  chosen_unique      INT AS (IF(status = 'chosen', found_report_id, NULL)) VIRTUAL,
  UNIQUE (chosen_unique),
  UNIQUE (found_report_id, claimant_id),
  UNIQUE (lost_report_id, finder_id),
  FOREIGN KEY (found_report_id) REFERENCES reports(id),
  FOREIGN KEY (claimant_id) REFERENCES users(id)
);

CREATE TABLE messages (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  claim_id  INT NOT NULL,
  sender_id INT NOT NULL,
  body      TEXT NOT NULL,
  hidden    TINYINT(1) DEFAULT 0,
  sent_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE,
  INDEX (claim_id, id)
);

CREATE TABLE points_history (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  report_id  INT NULL,
  amount     INT NOT NULL,
  reason     VARCHAR(100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, report_id, reason)
);

CREATE TABLE notifications (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  body       VARCHAR(255),
  link       VARCHAR(255) NULL,
  is_read    TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX (user_id, is_read)
);

CREATE TABLE complaints (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  reporter_id INT NOT NULL,
  type        ENUM('report','message') NOT NULL,
  target_id   VARCHAR(30) NOT NULL,
  reason      VARCHAR(100),
  details     VARCHAR(255),
  status      ENUM('new','in_review','done') DEFAULT 'new',
  handler_id  INT NULL,
  taken_at    DATETIME NULL,
  decision    VARCHAR(30) NULL,
  note        TEXT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (reporter_id, type, target_id)
);

CREATE TABLE warnings (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  complaint_id INT NULL,
  reason       VARCHAR(100),
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admin_log (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  admin_id   INT NOT NULL,
  text       VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
