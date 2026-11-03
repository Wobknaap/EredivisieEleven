COPY (
WITH league AS (
  SELECT a.player_id, a.player_club_id, g.season, COALESCE(a.goals, 0) AS goals
  FROM appearances a JOIN games g ON CAST(a.game_id AS VARCHAR) = g.game_id
  WHERE g.competition_id = (SELECT competition_id FROM competitions WHERE lower(name) = 'eredivisie' AND country_name = 'Netherlands' LIMIT 1)
    AND a.player_club_id IN (g.home_club_id, g.away_club_id)
), stats AS (
  SELECT player_id, COUNT(*) AS appearances, SUM(goals) AS goals, list_sort(list_distinct(list(season))) AS seasons
  FROM league GROUP BY player_id
), club_counts AS (
  SELECT l.player_id, CAST(l.player_club_id AS VARCHAR) AS club_id, c.name AS club_name, COUNT(*) AS matches
  FROM league l JOIN clubs c ON c.club_id = CAST(l.player_club_id AS VARCHAR)
  GROUP BY l.player_id, l.player_club_id, c.name
), club_history AS (
  SELECT player_id, list(club_id ORDER BY matches DESC, club_id) AS clubIds,
         list(club_name ORDER BY matches DESC, club_id) AS clubs,
         first(club_name ORDER BY matches DESC, club_id) AS club
  FROM club_counts GROUP BY player_id
)
SELECT CAST(p.player_id AS VARCHAR) AS id, p.name, h.club,
       COALESCE(p.country_of_citizenship, '') AS nation, p.position,
       COALESCE(p.sub_position, '') AS subPosition, h.clubs, h.clubIds,
       s.appearances, s.goals, s.seasons,
       EXTRACT(YEAR FROM p.date_of_birth) AS birthYear
FROM stats s JOIN players p ON p.player_id = s.player_id
JOIN club_history h ON h.player_id = s.player_id
WHERE p.name IS NOT NULL AND trim(p.name) <> ''
ORDER BY p.player_id
) TO 'src/data/players.json' (FORMAT JSON, ARRAY true);
