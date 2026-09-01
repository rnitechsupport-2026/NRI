-- =====================================================================
--  Real Estate Portal — MySQL schema
--  Roles: owner | agent | builder | service | admin
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS favorites;
DROP TABLE IF EXISTS leads;
DROP TABLE IF EXISTS service_offerings;
DROP TABLE IF EXISTS project_images;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS property_images;
DROP TABLE IF EXISTS properties;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
--  USERS  (one table, role column drives the whole portal)
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(120)  NOT NULL,
  email           VARCHAR(160)  NOT NULL UNIQUE,
  phone           VARCHAR(20)   NOT NULL,
  password_hash   VARCHAR(255)  NOT NULL,
  role            ENUM('owner','agent','builder','service','admin') NOT NULL DEFAULT 'owner',

  -- profile / role specific
  company_name    VARCHAR(160)  NULL,      -- agent firm / builder company / service company
  rera_id         VARCHAR(60)   NULL,      -- agent & builder RERA registration
  service_category VARCHAR(80)  NULL,      -- interiors, legal, home-loan, packers, vaastu ...
  experience_years TINYINT UNSIGNED NULL,
  city            VARCHAR(80)   NULL,
  locality        VARCHAR(120)  NULL,
  about           TEXT          NULL,
  avatar_url      VARCHAR(400)  NULL,
  cover_url       VARCHAR(400)  NULL,
  website         VARCHAR(200)  NULL,

  is_verified     TINYINT(1)    NOT NULL DEFAULT 0,
  status          ENUM('active','suspended') NOT NULL DEFAULT 'active',
  last_login_at   DATETIME      NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_users_role (role),
  INDEX idx_users_city (city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
--  PROPERTIES  (posted by owner / agent / builder)
-- ---------------------------------------------------------------------
CREATE TABLE properties (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED NOT NULL,
  title           VARCHAR(200) NOT NULL,
  slug            VARCHAR(240) NOT NULL UNIQUE,
  description     TEXT NULL,

  purpose         ENUM('sale','rent','pg','lease') NOT NULL DEFAULT 'sale',
  property_type   ENUM('apartment','villa','independent-house','plot','office','shop','warehouse','farmhouse')
                  NOT NULL DEFAULT 'apartment',

  bhk             TINYINT UNSIGNED NULL,
  bathrooms       TINYINT UNSIGNED NULL,
  balconies       TINYINT UNSIGNED NULL,
  furnishing      ENUM('unfurnished','semi-furnished','fully-furnished') NULL,
  facing          VARCHAR(30) NULL,
  floor_no        SMALLINT NULL,
  total_floors    SMALLINT NULL,
  age_years       TINYINT UNSIGNED NULL,
  possession      ENUM('ready-to-move','under-construction') NULL,

  built_up_area   INT UNSIGNED NULL,
  carpet_area     INT UNSIGNED NULL,
  area_unit       ENUM('sqft','sqyd','acre','cent') NOT NULL DEFAULT 'sqft',

  price           BIGINT UNSIGNED NOT NULL,
  price_negotiable TINYINT(1) NOT NULL DEFAULT 0,
  maintenance     INT UNSIGNED NULL,

  address         VARCHAR(255) NULL,
  locality        VARCHAR(120) NOT NULL,
  city            VARCHAR(80)  NOT NULL,
  state           VARCHAR(80)  NULL,
  pincode         VARCHAR(10)  NULL,
  latitude        DECIMAL(10,7) NULL,
  longitude       DECIMAL(10,7) NULL,

  amenities       JSON NULL,
  cover_image     VARCHAR(400) NULL,

  -- 3D walkthrough / virtual tour embed.
  -- `tour_url` is the sanitised iframe src extracted from whatever the poster
  -- pasted (Matterport, Kuula, YouTube 360, Google Street View, Sketchfab …).
  tour_url        VARCHAR(600) NULL,
  tour_provider   VARCHAR(40)  NULL,
  video_url       VARCHAR(600) NULL,
  floor_plan_url  VARCHAR(400) NULL,

  -- Cached AI summary (see src/services/propertyBot.js). Regenerated when the
  -- listing is edited, so buyers get an instant answer without a fresh LLM call.
  ai_summary        TEXT      NULL,
  ai_summary_at     DATETIME  NULL,
  ai_summary_source ENUM('ai','template') NULL,

  is_featured     TINYINT(1) NOT NULL DEFAULT 0,
  is_verified     TINYINT(1) NOT NULL DEFAULT 0,
  status          ENUM('pending','active','sold','rented','inactive') NOT NULL DEFAULT 'active',
  views           INT UNSIGNED NOT NULL DEFAULT 0,

  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_prop_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_prop_city (city),
  INDEX idx_prop_purpose (purpose),
  INDEX idx_prop_type (property_type),
  INDEX idx_prop_price (price),
  INDEX idx_prop_status (status),
  FULLTEXT KEY ft_prop_search (title, description, locality, city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE property_images (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  property_id  INT UNSIGNED NOT NULL,
  url          VARCHAR(400) NOT NULL,
  sort_order   TINYINT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT fk_img_prop FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  INDEX idx_img_prop (property_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
--  PROJECTS  (builder only)
-- ---------------------------------------------------------------------
CREATE TABLE projects (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  builder_id    INT UNSIGNED NOT NULL,
  name          VARCHAR(200) NOT NULL,
  slug          VARCHAR(240) NOT NULL UNIQUE,
  tagline       VARCHAR(200) NULL,
  description   TEXT NULL,

  project_type  ENUM('apartment','villa','plot','commercial','township') NOT NULL DEFAULT 'apartment',
  configuration VARCHAR(120) NULL,          -- "2, 3 & 4 BHK"
  min_price     BIGINT UNSIGNED NULL,
  max_price     BIGINT UNSIGNED NULL,
  min_area      INT UNSIGNED NULL,
  max_area      INT UNSIGNED NULL,
  total_units   INT UNSIGNED NULL,
  towers        SMALLINT UNSIGNED NULL,

  locality      VARCHAR(120) NOT NULL,
  city          VARCHAR(80) NOT NULL,
  address       VARCHAR(255) NULL,
  rera_no       VARCHAR(80) NULL,
  possession_on DATE NULL,

  amenities     JSON NULL,
  cover_image   VARCHAR(400) NULL,
  status        ENUM('upcoming','ongoing','completed') NOT NULL DEFAULT 'ongoing',
  is_featured   TINYINT(1) NOT NULL DEFAULT 0,
  views         INT UNSIGNED NOT NULL DEFAULT 0,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_proj_builder FOREIGN KEY (builder_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_proj_city (city),
  INDEX idx_proj_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE project_images (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id  INT UNSIGNED NOT NULL,
  url         VARCHAR(400) NOT NULL,
  sort_order  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT fk_pimg_proj FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_pimg_proj (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
--  SERVICE OFFERINGS  (service partner role)
-- ---------------------------------------------------------------------
CREATE TABLE service_offerings (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  title       VARCHAR(180) NOT NULL,
  slug        VARCHAR(220) NOT NULL UNIQUE,
  category    VARCHAR(80) NOT NULL,
  description TEXT NULL,
  price_from  INT UNSIGNED NULL,
  price_unit  VARCHAR(40) NULL,
  city        VARCHAR(80) NULL,
  cover_image VARCHAR(400) NULL,
  rating      DECIMAL(2,1) NOT NULL DEFAULT 4.5,
  status      ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_svc_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_svc_cat (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
--  LEADS / ENQUIRIES
-- ---------------------------------------------------------------------
CREATE TABLE leads (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  receiver_id  INT UNSIGNED NOT NULL,        -- owner/agent/builder who gets the lead
  sender_id    INT UNSIGNED NULL,            -- logged-in enquirer (nullable = guest)
  property_id  INT UNSIGNED NULL,
  project_id   INT UNSIGNED NULL,
  service_id   INT UNSIGNED NULL,
  name         VARCHAR(120) NOT NULL,
  email        VARCHAR(160) NULL,
  phone        VARCHAR(20)  NOT NULL,
  message      TEXT NULL,
  source       ENUM('property','project','service','contact') NOT NULL DEFAULT 'property',
  status       ENUM('new','contacted','visit-scheduled','closed','lost') NOT NULL DEFAULT 'new',
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_lead_recv FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_lead_send FOREIGN KEY (sender_id)  REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_lead_prop FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  CONSTRAINT fk_lead_proj FOREIGN KEY (project_id)  REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_lead_svc  FOREIGN KEY (service_id)  REFERENCES service_offerings(id) ON DELETE CASCADE,
  INDEX idx_lead_recv (receiver_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
--  FAVORITES / SHORTLIST
-- ---------------------------------------------------------------------
CREATE TABLE favorites (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  property_id INT UNSIGNED NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_fav (user_id, property_id),
  CONSTRAINT fk_fav_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_fav_prop FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
