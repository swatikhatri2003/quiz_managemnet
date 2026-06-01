-- Adds optional image for rounds
ALTER TABLE quiz_rounds
  ADD COLUMN image VARCHAR(255) NULL AFTER round_name;

