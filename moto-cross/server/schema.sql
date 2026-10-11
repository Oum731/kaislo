-- Base D1 du classement quotidien : un meilleur temps par joueur et par jour
CREATE TABLE IF NOT EXISTS scores (
  day     TEXT    NOT NULL,   -- AAAA-MM-JJ (UTC)
  pid     TEXT    NOT NULL,   -- identifiant anonyme du joueur (généré par le jeu)
  name    TEXT    NOT NULL,
  ms      INTEGER NOT NULL,   -- temps en millisecondes
  created INTEGER NOT NULL,
  PRIMARY KEY (day, pid)
);
CREATE INDEX IF NOT EXISTS idx_scores_day_ms ON scores (day, ms);
