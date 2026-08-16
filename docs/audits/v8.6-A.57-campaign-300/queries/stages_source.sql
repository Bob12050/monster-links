-- Portable report projection for stage-metrics.csv.
-- Canonical simulation is tools/campaign-audit.mjs; this query exposes its reviewed CSV snapshot.
SELECT * FROM read_csv_auto('docs/audits/v8.6-A.57-campaign-300/stage-metrics.csv', header = true);
