-- Portable report projection for profile-comparison.csv.
-- Canonical simulation is tools/campaign-audit.mjs; this query exposes its reviewed CSV snapshot.
SELECT * FROM read_csv_auto('docs/audits/v8.6-A.59-campaign-300/profile-comparison.csv', header = true);
