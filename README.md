# Luisa's Lookout

Phone-first tracker for the 2026 Taraia Object Expedition. `SPEC.md` is the source of truth.

## Develop

```bash
npm install
cp .env.example .env.local   # fill in what you need
npm run dev
npm run check                # lint + typecheck + tests
npm run fixture              # save live Purdue API response to fixtures/purdue-posts.json
```

Offline dev: set `PURDUE_FIXTURE_FILE=fixtures/purdue-posts.json` and
`OPEN_METEO_FIXTURE_DIR=fixtures/open-meteo` in `.env.local` to read saved API responses instead of
the live APIs (both ignored in production).

Editorial copy lives in `content/facts.ts` and comes only from the Fact Bank in `SPEC.md` §11;
`content/content.test.ts` fails if a fact or source link isn't in the spec.

## Update the status

Edit `content/status.json` (phase, verdict, optional headline/note) in the GitHub editor and commit.
Vercel redeploys. The verdict is only ever read from this file. `confirmed_electra` and `not_electra`
should carry a `note` and a `noteUrl` linking the dispatch that said so.

Phases: `departed`, `tarawa`, `at_sea`, `arrived`, `base_camp`, `surface_survey`, `magnetometer`,
`sonar`, `hydroprobe`, `dredge`, `verdict`, `return`.
Verdicts: `investigating`, `promising`, `confirmed_electra`, `not_electra`, `inconclusive`.

## Freshness

Pages re-check Purdue at most every 10 minutes, so a new dispatch shows up on the site
within about 10 minutes of publication. No cron job or database is involved.
