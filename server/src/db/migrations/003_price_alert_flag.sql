-- The price-alert bot compares the two most recent price_history rows.
-- `alerted` marks a row whose drop has already been announced, so re-running
-- the bot is idempotent.
ALTER TABLE price_history
  ADD COLUMN alerted TINYINT(1) NOT NULL DEFAULT 0 AFTER price;

-- Existing rows are the pre-bot baseline; treat them as already handled.
UPDATE price_history SET alerted = 1;
