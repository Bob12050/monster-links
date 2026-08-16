-- Portable report projection for overview.csv.
-- Canonical simulation is tools/campaign-audit.mjs; this query exposes its reviewed CSV snapshot.
SELECT * FROM read_csv_auto('docs/audits/v8.6-A.59-campaign-300/overview.csv', header = true);
