-- =====================================================================
--  Bot platform tables
--
--  The 17 "bots" are really 6 subsystems:
--    lead engine        → scoring + agent assignment   (columns on `leads`)
--    flow engine        → qualification / site visit / feedback / documents
--    recommendation     → query-only, no tables
--    notification engine→ follow-up / price alert / new listing  (`notifications`)
--    channels           → email + whatsapp             (`outbox`)
--    calculators        → EMI, client-side only
-- =====================================================================

-- ---------------------------------------------------------------- leads
-- Scoring and routing live on the lead itself so a single SELECT drives
-- the agent's inbox.
ALTER TABLE leads
  ADD COLUMN score          TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER status,
  ADD COLUMN temperature    ENUM('hot','warm','cold') NOT NULL DEFAULT 'cold' AFTER score,
  ADD COLUMN score_reasons  JSON NULL AFTER temperature,
  ADD COLUMN assigned_to    INT UNSIGNED NULL AFTER score_reasons,
  ADD COLUMN assign_reason  VARCHAR(200) NULL AFTER assigned_to,
  -- captured by the qualification bot
  ADD COLUMN budget_min     BIGINT UNSIGNED NULL AFTER assign_reason,
  ADD COLUMN budget_max     BIGINT UNSIGNED NULL AFTER budget_min,
  ADD COLUMN pref_bhk       VARCHAR(20)  NULL AFTER budget_max,
  ADD COLUMN pref_city      VARCHAR(80)  NULL AFTER pref_bhk,
  ADD COLUMN pref_locality  VARCHAR(120) NULL AFTER pref_city,
  ADD COLUMN pref_purpose   ENUM('sale','rent','pg','lease') NULL AFTER pref_locality,
  ADD COLUMN timeline       ENUM('immediate','1-3-months','3-6-months','just-looking') NULL AFTER pref_purpose,
  ADD COLUMN finance        ENUM('loan','self','not-sure') NULL AFTER timeline,
  ADD COLUMN last_followup_at DATETIME NULL AFTER finance,
  ADD COLUMN followup_count TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER last_followup_at,
  ADD CONSTRAINT fk_lead_assignee FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_lead_temp ON leads (receiver_id, temperature);

-- --------------------------------------------------------- site visits
CREATE TABLE IF NOT EXISTS site_visits (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  property_id  INT UNSIGNED NOT NULL,
  lead_id      INT UNSIGNED NULL,
  host_id      INT UNSIGNED NOT NULL,          -- advertiser being visited
  visitor_id   INT UNSIGNED NULL,              -- logged-in visitor, if any
  name         VARCHAR(120) NOT NULL,
  phone        VARCHAR(20)  NOT NULL,
  email        VARCHAR(160) NULL,
  visit_on     DATE NOT NULL,
  slot         ENUM('morning','afternoon','evening') NOT NULL,
  notes        VARCHAR(500) NULL,
  status       ENUM('requested','confirmed','completed','cancelled','no-show')
               NOT NULL DEFAULT 'requested',
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_visit_prop FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  CONSTRAINT fk_visit_lead FOREIGN KEY (lead_id)     REFERENCES leads(id)      ON DELETE SET NULL,
  CONSTRAINT fk_visit_host FOREIGN KEY (host_id)     REFERENCES users(id)      ON DELETE CASCADE,
  CONSTRAINT fk_visit_user FOREIGN KEY (visitor_id)  REFERENCES users(id)      ON DELETE SET NULL,
  INDEX idx_visit_host (host_id, status),
  INDEX idx_visit_date (visit_on)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------ feedback
CREATE TABLE IF NOT EXISTS visit_feedback (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  visit_id    INT UNSIGNED NOT NULL UNIQUE,
  rating      TINYINT UNSIGNED NOT NULL,        -- 1..5
  liked       VARCHAR(400) NULL,
  concerns    VARCHAR(400) NULL,
  interested  ENUM('yes','maybe','no') NOT NULL DEFAULT 'maybe',
  comments    TEXT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_fb_visit FOREIGN KEY (visit_id) REFERENCES site_visits(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------ saved searches
-- Powers the "new listing" bot: a stored filter set we re-run on new listings.
CREATE TABLE IF NOT EXISTS saved_searches (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  label       VARCHAR(160) NOT NULL,
  params      JSON NOT NULL,                    -- the query-string filters
  alerts      TINYINT(1) NOT NULL DEFAULT 1,
  last_run_at DATETIME NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ss_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_ss_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------- price history
-- Every price change is appended; the price-alert bot diffs the last two rows.
CREATE TABLE IF NOT EXISTS price_history (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  property_id INT UNSIGNED NOT NULL,
  price       BIGINT UNSIGNED NOT NULL,
  changed_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ph_prop FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  INDEX idx_ph_prop (property_id, changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------- notifications
-- In-app feed. The follow-up / price-alert / new-listing bots all write here.
CREATE TABLE IF NOT EXISTS notifications (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  kind        ENUM('followup','price-drop','new-listing','visit','feedback','system')
              NOT NULL DEFAULT 'system',
  title       VARCHAR(200) NOT NULL,
  body        VARCHAR(600) NULL,
  link        VARCHAR(300) NULL,
  property_id INT UNSIGNED NULL,
  read_at     DATETIME NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notif_prop FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  INDEX idx_notif_user (user_id, read_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------- outbox
-- Email + WhatsApp are delivery *channels*, not separate bots. Messages are
-- queued here; a driver sends them. Without SMTP / WhatsApp credentials the
-- driver logs instead of sending, and the row stays visible in the dashboard.
CREATE TABLE IF NOT EXISTS outbox (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  channel     ENUM('email','whatsapp') NOT NULL,
  to_address  VARCHAR(200) NOT NULL,            -- email address or phone
  subject     VARCHAR(240) NULL,                -- email only
  body        TEXT NOT NULL,
  template    VARCHAR(60) NULL,
  lead_id     INT UNSIGNED NULL,
  property_id INT UNSIGNED NULL,
  created_by  INT UNSIGNED NULL,
  status      ENUM('queued','sent','failed','skipped') NOT NULL DEFAULT 'queued',
  error       VARCHAR(300) NULL,
  sent_at     DATETIME NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_out_lead FOREIGN KEY (lead_id)     REFERENCES leads(id)      ON DELETE SET NULL,
  CONSTRAINT fk_out_prop FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL,
  CONSTRAINT fk_out_user FOREIGN KEY (created_by)  REFERENCES users(id)      ON DELETE SET NULL,
  INDEX idx_out_status (status, channel)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------- document checklist
CREATE TABLE IF NOT EXISTS lead_documents (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  lead_id     INT UNSIGNED NOT NULL,
  doc_key     VARCHAR(60)  NOT NULL,
  label       VARCHAR(160) NOT NULL,
  status      ENUM('pending','received','verified','waived') NOT NULL DEFAULT 'pending',
  file_url    VARCHAR(400) NULL,
  note        VARCHAR(300) NULL,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_lead_doc (lead_id, doc_key),
  CONSTRAINT fk_ld_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed price history from current prices so the alert bot has a baseline.
INSERT INTO price_history (property_id, price)
SELECT id, price FROM properties
WHERE NOT EXISTS (SELECT 1 FROM price_history ph WHERE ph.property_id = properties.id);
