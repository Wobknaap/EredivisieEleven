COPY (
WITH
league AS (
  SELECT a.player_id, a.player_club_id AS club_id, g.season, CAST(a.game_id AS VARCHAR) AS game_id,
         COALESCE(a.goals, 0) AS goals
  FROM appearances a JOIN games g ON CAST(a.game_id AS VARCHAR) = g.game_id
  WHERE g.competition_id = 'NL1' AND a.player_club_id IN (g.home_club_id, g.away_club_id)
),
league_club_season AS (
  SELECT player_id, club_id, season, COUNT(*) AS appearances, SUM(goals) AS goals
  FROM league GROUP BY player_id, club_id, season
),
league_season AS (
  SELECT player_id, season, SUM(appearances) AS appearances, SUM(goals) AS goals
  FROM league_club_season GROUP BY player_id, season
),
season_stats AS (
  SELECT player_id,
         list(struct_pack(season := season, appearances := appearances, goals := goals) ORDER BY season) AS values
  FROM league_season GROUP BY player_id
),
league_totals AS (
  SELECT player_id, SUM(goals) AS career_goals, SUM(1) AS appearances
  FROM league GROUP BY player_id
),
cup AS (
  SELECT a.player_id, a.player_club_id AS club_id, g.season, g.round
  FROM appearances a JOIN games g ON CAST(a.game_id AS VARCHAR) = g.game_id
  WHERE g.competition_id = 'NLP' AND a.player_club_id IN (g.home_club_id, g.away_club_id)
),
cup_club_season AS (
  SELECT player_id, club_id, season, COUNT(*) AS appearances,
         SUM(CASE WHEN round = 'Final' THEN 1 ELSE 0 END) AS final_appearances
  FROM cup GROUP BY player_id, club_id, season
),
cup_finals AS (
  SELECT season, CASE WHEN home_club_goals > away_club_goals THEN home_club_id
                      WHEN away_club_goals > home_club_goals THEN away_club_id END AS winner_club_id
  FROM games WHERE competition_id = 'NLP' AND round = 'Final'
),
cup_seasons AS (
  SELECT player_id, list(struct_pack(season := season, appearances := appearances, finalAppearances := final_appearances) ORDER BY season, club_id) AS values
  FROM cup_club_season GROUP BY player_id
),
cup_winner_seasons AS (
  SELECT s.player_id, list(struct_pack(season := s.season, appearances := s.appearances, finalAppearances := s.final_appearances) ORDER BY s.season, s.club_id) AS values
  FROM cup_club_season s JOIN cup_finals f ON f.season = s.season AND f.winner_club_id = s.club_id
  GROUP BY s.player_id
),
cup_final_seasons AS (
  SELECT player_id, list(DISTINCT season ORDER BY season) AS values
  FROM cup WHERE round = 'Final' GROUP BY player_id
),
supercup AS (
  SELECT a.player_id, a.player_club_id AS club_id, g.season
  FROM appearances a JOIN games g ON CAST(a.game_id AS VARCHAR) = g.game_id
  WHERE g.competition_id = 'NLSC' AND a.player_club_id IN (g.home_club_id, g.away_club_id)
),
supercup_club_season AS (
  SELECT player_id, club_id, season, COUNT(*) AS appearances
  FROM supercup GROUP BY player_id, club_id, season
),
supercup_finals AS (
  SELECT season, CASE WHEN home_club_goals > away_club_goals THEN home_club_id
                      WHEN away_club_goals > home_club_goals THEN away_club_id END AS winner_club_id
  FROM games WHERE competition_id = 'NLSC' AND round = 'Final'
),
supercup_seasons AS (
  SELECT player_id, list(struct_pack(season := season, appearances := appearances) ORDER BY season, club_id) AS values
  FROM supercup_club_season GROUP BY player_id
),
supercup_winner_seasons AS (
  SELECT s.player_id, list(struct_pack(season := s.season, appearances := s.appearances) ORDER BY s.season, s.club_id) AS values
  FROM supercup_club_season s JOIN supercup_finals f ON f.season = s.season AND f.winner_club_id = s.club_id
  GROUP BY s.player_id
),
champions(season, club_name) AS (
  VALUES ('2012', 'Ajax Amsterdam'), ('2013', 'Ajax Amsterdam'),
         ('2014', 'PSV Eindhoven'), ('2015', 'PSV Eindhoven'),
         ('2016', 'Feyenoord Rotterdam'), ('2017', 'PSV Eindhoven'),
         ('2018', 'Ajax Amsterdam'), ('2020', 'Ajax Amsterdam'),
         ('2021', 'Ajax Amsterdam'), ('2022', 'Feyenoord Rotterdam'),
         ('2023', 'PSV Eindhoven'), ('2024', 'PSV Eindhoven'),
         ('2025', 'PSV Eindhoven')
),
champion_seasons AS (
  SELECT l.player_id, list(struct_pack(season := l.season, appearances := l.appearances, goals := l.goals) ORDER BY l.season) AS values
  FROM league_club_season l JOIN champions h ON h.season = l.season
  JOIN clubs c ON c.club_id = l.club_id AND c.name = h.club_name
  GROUP BY l.player_id
),
top_goals AS (
  SELECT season, MAX(goals) AS goals FROM league_season WHERE goals > 0 GROUP BY season
),
top_scorer_seasons AS (
  SELECT s.player_id, list(struct_pack(season := s.season, goals := s.goals) ORDER BY s.season) AS values
  FROM league_season s JOIN top_goals t ON t.season = s.season AND t.goals = s.goals
  GROUP BY s.player_id
),
club_counts AS (
  SELECT l.player_id, CAST(l.club_id AS VARCHAR) AS club_id, c.name AS club_name, COUNT(*) AS matches
  FROM league l JOIN clubs c ON c.club_id = l.club_id
  GROUP BY l.player_id, l.club_id, c.name
),
club_history AS (
  SELECT player_id, list(CAST(club_id AS VARCHAR) ORDER BY matches DESC, club_id) AS clubIds,
         list(club_name ORDER BY matches DESC, club_id) AS clubs,
         first(club_name ORDER BY matches DESC, club_id) AS club
  FROM club_counts GROUP BY player_id
)
SELECT CAST(p.player_id AS VARCHAR) AS id, p.name, h.club,
       COALESCE(p.country_of_citizenship, '') AS nation, p.position,
       COALESCE(p.sub_position, '') AS subPosition, h.clubs, h.clubIds,
       t.appearances, t.career_goals AS goals, list_sort(list_distinct(list(l.season))) AS seasons,
       EXTRACT(YEAR FROM p.date_of_birth) AS birthYear,
       ss.values AS goalsPerSeason, t.career_goals AS careerGoals,
       cs.values AS championSeasons, cups.values AS knvbBekerSeasons,
       cupw.values AS knvbBekerWinnerSeasons, cupf.values AS knvbBekerFinalSeasons,
       scs.values AS johanCruijffSchaalSeasons, scw.values AS johanCruijffSchaalWinnerSeasons,
       tops.values AS eredivisieTopScorerSeasons
FROM players p JOIN league_totals t ON t.player_id = p.player_id
JOIN club_history h ON h.player_id = p.player_id JOIN league l ON l.player_id = p.player_id
LEFT JOIN season_stats ss ON ss.player_id = p.player_id
LEFT JOIN champion_seasons cs ON cs.player_id = p.player_id
LEFT JOIN cup_seasons cups ON cups.player_id = p.player_id
LEFT JOIN cup_winner_seasons cupw ON cupw.player_id = p.player_id
LEFT JOIN cup_final_seasons cupf ON cupf.player_id = p.player_id
LEFT JOIN supercup_seasons scs ON scs.player_id = p.player_id
LEFT JOIN supercup_winner_seasons scw ON scw.player_id = p.player_id
LEFT JOIN top_scorer_seasons tops ON tops.player_id = p.player_id
WHERE p.name IS NOT NULL AND trim(p.name) <> ''
GROUP BY p.player_id, p.name, h.club, p.country_of_citizenship, p.position, p.sub_position,
         h.clubs, h.clubIds, t.appearances, t.career_goals, p.date_of_birth, ss.values, cs.values,
         cups.values, cupw.values, cupf.values, scs.values, scw.values, tops.values
ORDER BY p.player_id
) TO 'src/data/players.json' (FORMAT JSON, ARRAY true);
