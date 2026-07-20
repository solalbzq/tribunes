-- Renommage des plans : l'ancien PRO devient CLUB, l'ancien STRUCTURE devient PRO.
-- Un seul UPDATE avec CASE : chaque ligne est évaluée sur son ancienne valeur,
-- donc aucune collision entre PRO→CLUB et STRUCTURE→PRO.
UPDATE "Organization" SET "plan" = CASE "plan"
  WHEN 'STRUCTURE' THEN 'PRO'
  WHEN 'PRO'       THEN 'CLUB'
  ELSE "plan"
END;
