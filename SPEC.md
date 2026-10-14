# Taraia Watch — Earhart Expedition Tracker

**Spec version:** 1.0 (October 13, 2026)
**Owner:** Matt
**Builder:** Claude Code
**Hosting:** Vercel (Hobby plan), GitHub repo
**Working name:** "Taraia Watch". The name lives in one config value so it's easy to change.

---

## 1. What we're building and for whom

This is a phone-first website that follows the 2026 Taraia Object Expedition to Nikumaroro. The expedition is checking whether an object in the island's lagoon is Amelia Earhart's Lockheed Electra.

It's a personal gift for one person: my girlfriend's mother. She follows the Earhart case closely, uses her phone, and is not very comfortable with technology. She should be able to:

1. Open one link (or a home-screen icon) and see at a glance what the team is doing right now.
2. Read every official dispatch, with photos, in a clean, large-type layout.
3. Get an email when a new dispatch is published, without doing anything.
4. Share the link with friends and have it look impressive, including the link preview in iMessage, WhatsApp or Facebook.

### Success criteria
- She never has to log in, sign up, or configure anything.
- A new Purdue dispatch shows on the site within about 10 minutes of publication, and arrives by email within about 30 minutes.
- The site loads fast on a phone over cellular, is readable without zooming, and still works if a data source fails.
- Running cost is **$0/month**.

### Timing
- The team reached Nikumaroro on Monday, October 12 (island time).
- Fieldwork at the Taraia Peninsula starts Wednesday, October 14 (island time), and lasts about five days.
- The team then sails back to Tarawa.
- **The news that matters most could arrive within days.** Ship Phase 1 as fast as possible, then layer on extras.

---

## 2. Non-goals and guardrails

- **No live ship GPS.** No public position feed exists for the vessel (the Marin Mainiku). Never call anything "live tracking" or show a moving "current position" dot.
- **No auto-generated verdict.** Whether the object is the Electra is only ever set manually in `content/status.json` (see §6). Code and AI must never infer it.
- **No AI summaries in v1.** We use Purdue's own text. Don't add the Claude API or any paid service without asking.
- **Not official.** No Purdue, Purdue Research Foundation or Archaeological Legacy Institute (ALI) logos or wordmarks. No look-alike branding, and no name implying affiliation. The footer disclaimer is required (§10).
- **No invented facts.** All editorial copy (explainer, crew, "did you know") must come from the Fact Bank (§11). If something isn't there, leave it out.
- **No logins, accounts or tracking scripts.** Vercel Web Analytics is OK, since it's free and cookieless.

---

## 3. Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js (App Router, TypeScript, latest stable) | Server components for data fetching |
| Styling | Tailwind CSS | |
| Fonts | `next/font/google` | Suggested: a characterful serif for headlines (e.g. Fraunces) and a clean sans for body (e.g. Inter) |
| HTML parsing | `cheerio` (server only) | Parses Purdue post HTML |
| Map / globe | `d3-geo` + `topojson-client` + `world-atlas` (110m) | No tile service, no API keys, no cost |
| Email | Resend + React Email | Free tier |
| State for alerts | Upstash Redis via the Vercel Marketplace | Free tier |
| Scheduler | GitHub Actions scheduled workflow | Vercel Hobby cron only runs once a day (§8) |
| Weather / sea | Open-Meteo forecast + marine APIs | Free for non-commercial use, no key |
| Tests | Vitest | Parser tests run against saved fixtures |
| Images | Plain `<img>` with WordPress-provided `srcset` sizes | Avoid Vercel Image Optimization quotas |

---

## 4. Data sources

### 4.1 Purdue Newsroom (primary source for dispatches)

The newsroom is WordPress with a public REST API. All fetching happens on the server; the browser never calls Purdue directly.

**List endpoint:**
```
GET https://www.purdue.edu/newsroom/wp-json/wp/v2/posts
    ?search=earhart
    &after=2026-09-01T00:00:00
    &orderby=date&order=desc&per_page=30
    &_embed=wp:featuredmedia
```

**Fields we use:** `id`, `slug`, `link`, `date_gmt`, `modified_gmt`, `title.rendered`, `excerpt.rendered`, `content.rendered`, `featured_media`, and `_embedded["wp:featuredmedia"][0]` (`source_url`, `media_details.sizes`, `alt_text`, `caption`).

**Filtering (important):**
- WordPress search also matches body text. Purdue has an *Earhart residence hall*, so unrelated housing and campus posts will match.
- Keep a post only if **its title** matches `/earhart|taraia|nikumaroro/i` **and** `date_gmt >= 2026-09-01`.
- Support a manual `include` and `exclude` list of post IDs in `content/sources.json` as an escape hatch.
- Classify each kept post as:
  - `dispatch`: title starts with `Earhart expedition update`
  - `background`: everything else, such as "1 week out: Countdown to the search…"

**Gotchas:**
- `date_gmt` has **no timezone suffix** (e.g. `"2026-10-12T14:16:09"`). Append `Z` before parsing.
- The posts have no dedicated tag; they sit in general category ID 19 with empty `tags`. Don't rely on taxonomy.
- `title.rendered` and `content.rendered` contain HTML entities. Decode them.
- Send a polite `User-Agent` header, e.g. `TaraiaWatch/1.0 (+SITE_URL; contact: ADMIN_EMAIL)`.
- Cache with `fetch(..., { next: { revalidate: 600, tags: ["dispatches"] } })`, i.e. ISR every 10 minutes. The alert job also calls `revalidateTag("dispatches")` as soon as it sees a new post.

**Known posts at time of writing** (save the live API response for these into `fixtures/purdue-posts.json` for tests):

| Purdue post ID | Published (UTC) | Title |
|---|---|---|
| 23872 | 2026-10-02 21:14 | Earhart expedition update: Crew departs from Purdue University Airport |
| 23963 | 2026-10-06 13:00 | Earhart expedition update: Crew arrives at Tarawa, prepares for departure |
| 24057 | 2026-10-07 20:08 | Earhart expedition update: Crew begins 6-day sea voyage to South Pacific atoll Nikumaroro |
| 24123 | 2026-10-09 13:26 | Earhart expedition update: Crew at sea, expected to arrive on Nikumaroro in 72 hours |
| 24243 | 2026-10-12 14:16 | Earhart expedition update: Crew arrives at Nikumaroro, launches critical phase of Amelia Earhart plane search |
| (find ID) | 2026 Q3 | 1 week out: Countdown to the search for Amelia Earhart's plane begins (`background`) |

### 4.2 Parsing `content.rendered`

Write `lib/parse-dispatch.ts` to turn post HTML into a typed structure. Render it with our own components; never use `dangerouslySetInnerHTML` on raw Purdue HTML.

```ts
type Dispatch = {
  id: number; slug: string; url: string;
  publishedAt: Date; updatedAt: Date;
  kind: "dispatch" | "background";
  title: string;
  dateline?: string;           // e.g. "NIKUMARORO, Kiribati", the text before the em dash in the first paragraph
  lead: string;                // first paragraph, with the dateline removed
  blocks: Block[];             // body in order
  photos: Photo[];             // all images (figures + carousel slides), de-duplicated by src
  hero?: Photo;                // featured media
};
type Block =
  | { type: "paragraph"; text: string; isQuote: boolean }  // isQuote if it starts with a curly opening quote
  | { type: "heading"; text: string }
  | { type: "figure"; photo: Photo }
  | { type: "gallery"; photos: Photo[] };
type Photo = { src: string; srcSet?: string; alt: string; caption?: string; width?: number; height?: number };
```

**Markup observed in current posts:**
- Body paragraphs: `p.wp-block-paragraph`
- Images: `figure.wp-block-image img` with `figcaption`
- Photo carousels: `.purdue-home-cta-carousel`
  - Each slide image: `.purdue-home-cta-carousel__card-image img`
  - Each caption: `.purdue-home-cta-carousel__story-content`
  - The carousel's `h2` repeats a generic label like "Earhart team underway". Ignore it.
- Headings: `h2.wp-block-heading`

**Strip these (boilerplate):**
- `.purdue-home-quick-links-static`, the "Related coverage" block
- Any `h2` whose text starts with "About " plus every following sibling up to the next `h2` (the institutional boilerplate)
- The sponsor paragraph starting "The expedition is being supported by"
- The team roster paragraph "The Taraia Object expedition team includes:" plus the `ul` after it. We use the static roster in `content/crew.ts`.
- `#note` / `.post-content__attribution` (media contact and journalist notes)

**Robustness:**
- If parsing throws or returns zero paragraphs, fall back to `excerpt.rendered` plus a "Read on Purdue News" link. Never crash a page.
- Unit-test the parser against every fixture post.

### 4.3 Island conditions (Open-Meteo)

Nikumaroro is at approximately **4.67° S, 174.52° W**. Use `latitude=-4.67&longitude=-174.52`.

- **Weather:** `https://api.open-meteo.com/v1/forecast?latitude=-4.67&longitude=-174.52&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_gusts_10m,is_day&daily=sunrise,sunset&timezone=Pacific%2FKanton`
- **Sea:** `https://marine-api.open-meteo.com/v1/marine?latitude=-4.67&longitude=-174.52&current=wave_height,swell_wave_height,sea_surface_temperature&hourly=sea_level_height_msl&forecast_days=2&timezone=Pacific%2FKanton`

Rules:
- If Open-Meteo rejects `Pacific/Kanton`, use `timezone=auto`. It resolves from the coordinates.
- Revalidate every 30 minutes.
- Show units in °C and km/h, with metres for waves.
- `sea_level_height_msl` is a model value. Label any tide chart **"approximate tide (model)"**.
- **Attribution is required:** "Weather data by Open-Meteo.com", linked, in the panel or footer.
- If either call fails, hide that part of the panel quietly.

### 4.4 Static content (in repo, hand-maintained)

| File | Contents |
|---|---|
| `content/status.json` | Current phase, verdict, optional headline override, `updatedAt` (§6) |
| `content/crew.ts` | 17-person roster with roles (§11.3) |
| `content/route-points.ts` | Map coordinates (§7.4) |
| `content/press.ts` | "In the news" external links (§11.4) |
| `content/facts.ts` | Fact Bank entries with source URLs (§11) |
| `content/sources.json` | Include/exclude post IDs |
| `content/site.ts` | Site name, dedication line, `noindex` flag, etc. |

**Optional:** `https://amelia.prf.org/wp-json/wp/v2/crew` returns three official crew entries (Hagle, Schultz, Bandla). Each has `featured_media` that resolves to a portrait via `/wp-json/wp/v2/media/{id}`. It has no bio text. Only use it if it's cheap. The official site's press list is hand-built, not an API.

---

## 5. Time handling (easy to get wrong)

- Island timezone: IANA `Pacific/Kanton` (UTC+13, no daylight saving).
  - Older runtimes may only know `Pacific/Enderbury`. Fall back to `Etc/GMT-13`; note the sign inversion in `Etc/` zones.
  - Verify at startup with `Intl.DateTimeFormat`.
- Her timezone: `America/Toronto`. Daylight saving ends **Sunday, November 1, 2026**.
  - The island is 17 hours ahead now and will be 18 hours ahead after that date.
  - **Always use IANA zones, never hard-coded offsets.**
- Show dispatch times as "Tue, Oct 13 · 10:16 a.m. your time" plus a muted "(Tue 3:16 a.m. on Nikumaroro)".
- Relative times ("3 hours ago") update on the client. Server-render absolute times to avoid hydration mismatches. Compute relative times in a small client component after mount.
- **"Day N on Nikumaroro":** Day 1 = October 13 island time (first day ashore). Show "Day N of ~5". After the team leaves, switch to "Sailing home".
  - Phase dates come from `status.json`, not the clock. The clock only drives the day counter and the day/night state.
- **Day/night line:**
  - Between island sunrise and sunset: "Daytime on the island. The team is likely ashore working."
  - Otherwise: "Night on the island. The crew sleeps aboard the ship."
  - Use the word "likely". This is inferred, not reported.

---

## 6. Status model (manual source of truth)

`content/status.json`:
```json
{
  "phase": "magnetometer",
  "verdict": "investigating",
  "headline": null,
  "note": null,
  "updatedAt": "2026-10-14T20:00:00Z"
}
```

**Phases, in order.** Show each with a plain-English label and a one-line explainer. Parenthetical explanations are for her; avoid jargon.

1. `departed`: Team leaves Purdue (Oct 2)
2. `tarawa`: Staging in Tarawa, Kiribati (Oct 6–7)
3. `at_sea`: Six-day voyage (Oct 7–12)
4. `arrived`: Arrived at Nikumaroro (Oct 12)
5. `base_camp`: Landing gear ashore, cutting a trail to the lagoon (Oct 13)
6. `surface_survey`: Walking the sand spit for surface artifacts
7. `magnetometer`: Magnetometer sweep (a sensitive metal detector; steel cables in the Electra would show up)
8. `sonar`: Sonar scan (sound waves map what's under the sediment)
9. `hydroprobe`: Hydroprobe (a rod pushed down to touch the object and gauge its depth, angle and surface)
10. `dredge`: Dredging (a water-powered pump clears sediment so they can see it)
11. `verdict`: Verdict announced
12. `return`: Sailing home

**Verdicts:** `investigating` (default), `promising`, `confirmed_electra`, `not_electra`, `inconclusive`.
- Each has a label and color. Example: "Still investigating" in neutral sand; "It's the Electra" in celebratory gold; "Not the Electra" in calm slate.
- `confirmed_electra` and `not_electra` **must** carry a `note` linking the dispatch that said so.

**How Matt updates it:**
- Phase 1: edit `content/status.json` in the GitHub web/mobile editor and commit. Vercel redeploys.
- Phase 4 (optional): a token-protected `/admin` page that writes the same shape to Redis. The site prefers the Redis value and falls back to the file.

---

## 7. Pages and sections

### 7.1 Home `/` (single long scroll, phone-first, in this order)

1. **Status hero**
   - Site name and a small dedication line from `content/site.ts`.
   - Big status sentence, e.g. "Day 2 on Nikumaroro · Scanning the lagoon with sonar". Built from phase plus day counter, or `headline` if set.
   - Verdict pill.
   - "Last update: 3 hours ago" (newest dispatch time).
2. **Latest dispatch card**
   - Hero photo, title, dateline, lead paragraph.
   - "Read the full dispatch" button to `/dispatch/[slug]`.
   - A "NEW" badge if under 24 hours old.
3. **Right now on Nikumaroro**
   - Two clocks side by side (her time and island time).
   - Day/night line (§5).
   - Weather (temperature, conditions icon, wind) and sea (wave height, sea temperature).
   - A small approximate tide sparkline for the next 24 hours.
   - Open-Meteo attribution.
4. **Search progress**
   - A phase stepper (§6), with completed steps checked and the current step pulsing.
   - The **lagoon cross-section illustration** (§7.3).
5. **Journey map**: an interactive globe (§7.4).
6. **All dispatches**: a vertical timeline, newest first. Each item shows date (her time), title, thumbnail and lead, and links to its detail page. Background posts are visually lighter.
7. **The mystery**: a short explainer from the Fact Bank:
   - What happened in 1937
   - Why Nikumaroro
   - What the Taraia Object is
   - Why Purdue is involved
8. **The skeptic's corner**: the strongest counter-arguments from the Fact Bank, framed fairly.
9. **Meet the crew**: compact cards (name, role, organization). Highlight the two Purdue astronaut alumni.
10. **In the news**: external press links (opens in new tab).
11. **Stay in the loop**:
    - "Add to Home Screen" instructions with simple iPhone and Android steps. Detect the platform and show the matching one.
    - A "Share with a friend" button using `navigator.share`, with copy-link as fallback.
    - A line explaining that email alerts go out automatically.
12. **Footer**: disclaimer and attributions (§10).

### 7.2 Dispatch detail `/dispatch/[slug]`
- A "Source: Purdue University News · Read the original" link at the top.
- Title, dates (both zones), hero image, then the parsed blocks in order.
- Quotes (paragraphs starting with a curly quote) styled as pull quotes.
- Galleries as a swipeable carousel. It must also have visible previous/next buttons (don't rely on swipe alone) and a tap-to-enlarge lightbox with captions.
- Previous and next dispatch links at the bottom.
- `generateStaticParams` for known posts plus ISR for new ones.

### 7.3 Lagoon cross-section (signature visual)

An SVG side-view diagram, about 360×220 on a phone, scaling up on larger screens.

**Elements:**
- Beach and shoreline on the left.
- Lagoon water.
- A sediment layer (with "unknown depth" shown by a fading gradient).
- The object as an **ambiguous dark shape with a "?"**.
  - **Do not draw an airplane** unless the verdict is `confirmed_electra`. Then morph it into a simple Electra silhouette (original artwork, not traced from a photo).
- Labels: "≈10 ft from shore" and "as little as 5 ft of water" (Fact Bank F10).

**Phase overlays** (each animates when its phase is current; earlier ones stay as faint marks):
- Magnetometer: a boat with sweeping parallel transect lines
- Sonar: expanding ping arcs
- Hydroprobe: a rod descending to touch the object
- Dredge: sediment particles lifting away

**Live tide:** if marine data is available, set the water level from current `sea_level_height_msl`, normalized to the next 48 hours' min and max. Show the label "water level now (approx.)".

Respect `prefers-reduced-motion` with static states and no looping animation.

### 7.4 Journey globe

- `d3-geo` orthographic projection with `world-atlas` 110m land.
- Drag to rotate. On first view it auto-rotates to center on Nikumaroro. A "Reset" button is required.
- Nikumaroro and Howland are too small for 110m data; draw them as labeled markers.
- d3 handles great circles and the antimeridian natively. Draw routes as `{type: "LineString"}` geometries; don't hand-interpolate longitudes.

**Layers:**
- **1937 (amber, dashed):** Lae → Howland Island, labeled "Earhart's planned final leg, July 2, 1937".
  - A dotted spur from near Howland to Nikumaroro, labeled "The Nikumaroro hypothesis". Label it as a hypothesis, not a known path.
- **2026 (signal orange, solid, animated draw-in):** West Lafayette → Los Angeles → Nadi, Fiji → Tarawa → (by sea) Nikumaroro.
  - Mark legs completed according to `status.phase`.

**Coordinates (approximate; fine for a globe at this scale):**

| Point | Lat | Lon |
|---|---|---|
| Purdue University Airport, West Lafayette | 40.41 | -86.94 |
| Los Angeles (LAX) | 33.94 | -118.41 |
| Nadi, Fiji | -17.76 | 177.44 |
| Tarawa, Kiribati (Betio Port) | 1.35 | 172.93 |
| Nikumaroro | -4.67 | -174.52 |
| Howland Island | 0.81 | -176.62 |
| Lae, Papua New Guinea | -6.73 | 147.00 |

Under the globe, show a small distance caption: "830 nautical miles by sea from Tarawa" (Fact Bank F14).

---

## 8. Email alerts

### 8.1 Why this architecture
- **Vercel Hobby cron runs at most once per day.** More frequent expressions fail at deploy time, and even daily runs can fire anywhere within the scheduled hour.
- So a **GitHub Actions** scheduled workflow triggers our endpoint instead.
- If the repo is **private**, GitHub Free includes 2,000 Actions minutes a month. Each run bills as at least one minute, so every 30 minutes is about 1,440 minutes a month and fits. Public repos get unlimited minutes, so every 10–15 minutes is fine there.
- A daily Vercel cron to the same endpoint is an optional backup.
- GitHub may delay scheduled runs at busy times. That's acceptable.

### 8.2 Flow
`.github/workflows/check-dispatches.yml`:
- Triggers: `schedule: "*/30 * * * *"` and `workflow_dispatch`.
- Single step: `curl -fsS -H "Authorization: Bearer $CRON_SECRET" "$SITE_URL/api/check-dispatches"`.
- Uses GitHub secrets `CRON_SECRET` and `SITE_URL`.

`app/api/check-dispatches/route.ts` (Node runtime):
1. Reject unless the bearer token equals `CRON_SECRET`. Also accept Vercel's cron header for the optional backup.
2. Fetch posts fresh, bypassing cache (`cache: "no-store"`), and apply the §4.1 filter. Only `dispatch` and `background` posts with a valid date count.
3. Read the Redis set `tw:notified`.
   - **If the set does not exist, seed mode:** add every current post ID and send nothing. Otherwise she gets six emails on day one.
4. For each post not in the set, oldest first:
   - Take a lock with `SET tw:lock:{id} 1 NX EX 300`. Skip if it's already locked.
   - Send one email **per recipient** in `ALERT_RECIPIENTS`, as separate sends with no shared To/CC.
   - `SADD tw:notified {id}` only after all sends succeed. On failure, release the lock and log the error.
5. If anything was new, call `revalidateTag("dispatches")` and `revalidatePath("/")`.
6. Return JSON: `{ checked, new: [ids], sent, skipped, errors }`.
7. Query parameters for testing:
   - `?dryRun=1` reports without sending or writing.
   - `?test=1` sends the latest dispatch to `ADMIN_EMAIL` only, ignoring and not touching the notified set.

### 8.3 The email (React Email)
- **Subject:** `New from Nikumaroro: <short title>`. Strip the "Earhart expedition update: " prefix.
- **Body:** hero image (absolute Purdue URL), title, dateline, lead paragraph, and a big "Read it on Taraia Watch" button to `SITE_URL/dispatch/[slug]`.
  - If the verdict changed since the last email, add a banner at top. Store the last-sent verdict in Redis.
  - Small line: "Dispatch from Purdue University News."
- **Footer:**
  - "You're getting this because Matt signed you up. Reply to this email to stop." For now he removes people from the env var by hand.
  - The unofficial disclaimer.
- Large type (18px+), single column, works in the Gmail and Apple Mail iPhone apps. Include a plain-text alternative.
- **From:** `ALERT_FROM`, e.g. `Taraia Watch <updates@earhart.mjhahn.com>`. **Reply-To:** Matt's address.

### 8.4 Sending domain (Matt does this)
- Resend's Free plan includes 3,000 emails a month, 100 per day, and one verified domain.
- To email her, you need a **verified domain**. Without one, Resend can only send test emails to your own address.
- Use a subdomain of mjhahn.com (e.g. `earhart.mjhahn.com` or `updates.mjhahn.com`) and add Resend's DNS records at the registrar.
- Volume here is a handful of emails per dispatch, far under the limits.

---

## 9. Design direction

- **Mood:** an expedition logbook meets a modern mission-control readout. Warm and adventurous, not corporate.
- **Palette** (define as CSS variables / Tailwind theme):

| Token | Value | Use |
|---|---|---|
| Deep ocean navy | `#0B1F33` | Background in dark sections |
| Lagoon teal | `#1F7A7A` | |
| Sand | `#F3E9D2` | Light background |
| Coral-signal orange | `#E8692C` | 2026 route, live indicators |
| Aviator amber | `#D9A441` | 1937 route |
| Ink | `#1B1B1B` | Text |

- **Type:** big. Body 18px minimum, headings bold and generous, line height 1.6.
- **Touch:** targets at least 44×44px, no hover-only interactions.
- **Layout:** single column on phones; max content width about 720px on larger screens; sections separated by full-bleed color bands.
- **Motion:** subtle, meaningful (globe rotation, cross-section overlays, a pulsing "live" dot for island clock and weather only). Full `prefers-reduced-motion` support.
- **Accessibility:** WCAG AA contrast, real alt text from Purdue captions, a semantic heading order, visible focus states.
- **Performance:**
  - Lighthouse mobile performance ≥ 90 on the home page.
  - Load the globe lazily when it scrolls into view (dynamic import, no SSR).
  - Don't ship cheerio to the client.
- **Original artwork only.** A simple icon (e.g. a compass rose over an atoll outline) for the favicon, PWA icon and OG image. No real logos.

---

## 10. Sharing, SEO and legal bits

- **Open Graph image** (`app/opengraph-image.tsx` via `next/og`), 1200×630, generated dynamically:
  - Site name
  - The current status sentence and verdict pill
  - Latest dispatch title
  - A small globe/atoll motif
- Each dispatch page gets its own OG image using that dispatch's title.
- **PWA:** `app/manifest.ts` with name, short name, icons (192/512 plus Apple touch icon) and theme color, so "Add to Home Screen" gives a proper icon.
- **Robots:** `noindex` by default (config flag in `content/site.ts`). It's a personal site meant to be shared by link, not found in search.
- **Footer disclaimer (required):**
  > Taraia Watch is an unofficial fan tracker made for one very dedicated Earhart follower. It is not affiliated with Purdue University, the Purdue Research Foundation or the Archaeological Legacy Institute. Dispatches and photos belong to their owners and are shown with links to the originals.
- **Attributions:** "Dispatches: Purdue University News" (linked), "Weather and sea data: Open-Meteo.com" (linked), and photo captions/credits as published.
- **Purdue text:** cards show the lead paragraph. Detail pages show the full dispatch with the source link at the top. Don't rewrite Purdue's text and present it as our own reporting.

---

## 11. Fact Bank (only source for editorial copy)

Write all explainer, crew and "did you know" copy in plain, warm language using **only** these facts. Each entry stores `{ id, text, sourceUrl, sourceName }` in `content/facts.ts`. Paraphrase; don't paste long quotes.

### 11.1 The story and the expedition
- **F1.** Earhart and navigator Fred Noonan vanished on July 2, 1937, flying toward Howland Island. She was trying to become the first person to circle the globe at the equator and had flown about 22,000 of a planned 29,000 miles. *(Purdue, Oct 7 dispatch)*
- **F2.** Nikumaroro is an uninhabited coral atoll in Kiribati's Phoenix Islands, about 400 miles south of Howland Island. *(Purdue, Oct 12 dispatch)*
- **F3.** Nikumaroro is about 1,800 nautical miles south of Hawaii and more than 230 miles from the nearest inhabited island. *(Purdue, Oct 9 dispatch)*
- **F4.** The "Taraia Object" was first noticed in satellite imagery in 2020 and later confirmed to be visible in aerial photos taken as far back as 1938. *(Purdue, Oct 9 dispatch)*
- **F5.** The idea that Earhart and Noonan landed on Nikumaroro and died there as castaways is often called the Nikumaroro hypothesis. TIGHAR (The International Group for Historic Aircraft Recovery) developed and documented it over nearly 40 years. *(Purdue, Oct 12 dispatch; CBS News)*
- **F6.** Evidence cited by supporters includes radio bearings from 1937 that converge on Nikumaroro, and the "Bevington Object", a photo taken three months after the disappearance that some think shows Electra landing gear on the reef. *(GlobalAir)*
- **F7.** The Purdue Research Foundation funded Earhart's Lockheed Electra "Flying Laboratory" through the Amelia Earhart Fund for Aeronautical Research. *(Purdue, Oct 9 dispatch)*
- **F8.** Earhart and her husband, George Putnam, intended to return the Electra to Purdue after the flight. *(CBS News)*
- **F9.** The expedition was first planned for November 2025. It was postponed while the team worked through permit approvals with the Kiribati government and to avoid cyclone season. *(Purdue, Oct 2025; CBS News)*
- **F10.** Based on aerial photos, the object is believed to be only about 10 feet from the lagoon shore, under as little as 5 feet of water (depending on the tide) plus sediment of unknown depth. *(Purdue, Oct 12 dispatch)*
- **F11.** The search sequence:
  - A surface survey of the sand spit
  - A magnetometer sweep along parallel transect lines (the Electra was mostly aluminum, but steel cabling could register)
  - Sonar to see under the sediment
  - A hydroprobe to touch the object and gauge its depth, orientation and surface
  - A water induction dredge to clear sediment for a visual look

  *(Purdue, Oct 12 dispatch)*
- **F12.** The crew sleeps aboard the ship every night, partly because of coconut crabs, whose size and nighttime activity make staying on the island impractical. *(Purdue, Oct 12 dispatch)*
- **F13.** It had been seven years since the last authorized expedition set foot on Nikumaroro, and more than 15 years since anyone had been on the Taraia Peninsula. *(Purdue, Oct 12 dispatch)*
- **F14.** The 17-person team and a 17-person boat crew sailed about 830 nautical miles from Tarawa aboard the Marin Mainiku, a Kiribati National Shipping Line vessel. *(Purdue, Oct 12 dispatch)*
- **F15.** The team lands through the "blasted channel", a gap in the reef the British government cut during its 1963 evacuation of colonists. That was the last time the island was inhabited. *(Purdue, Oct 7 dispatch)*
- **F16.** El Niño conditions are affecting the sea around the island, and daily access to shore depends on tides and safe boating conditions. *(Purdue, Oct 12 dispatch)*
- **F17.** A returning team member says the island has no mosquitoes, snakes or spiders, though coconut crabs and hermit crabs are a problem. *(Purdue, Oct 9 dispatch)*
- **F18.** If the object is confirmed as the Electra, the organizers hope to follow up with a full-scale excavation. ALI has pointed to a second field season in 2027. *(Fox News via Fox 9; Indian Defence Review citing ALI. Phrase as "the organizers hope".)*

### 11.2 Skeptic's corner
- **S1.** TIGHAR founder Ric Gillespie still believes Nikumaroro is where Earhart ended up, but doesn't think the Taraia Object is her plane. He has told NBC News he thinks it's a coconut tree. *(Jalopnik; The Conversation via AlterNet)*
- **S2.** Gillespie has argued that a plane there would have been buried by coral, not sand. *(Yahoo / Popular Mechanics)*
- **S3.** Gillespie told NBC News in 2025 that searchers had already looked at that spot and found nothing. *(CBS News)*
- **S4.** A former Smithsonian National Air and Space Museum curator said the object needed more photographing before stronger claims could be made. *(Biography.com, citing Newsweek)*
- **S5.** Neutral framing to end on: until the team inspects it on site, the Taraia Object is an object of interest, not confirmed evidence.

### 11.3 Crew roster (from the Oct 7 dispatch)

| Name | Role | Organization |
|---|---|---|
| Rick Pettigrew | Project director (expedition leader) | ALI |
| Steve Schultz | Field assistant; Purdue team lead (Purdue SVP and general counsel) | Purdue |
| Laura Kennedy | Technology specialist | ALI |
| Philippa Jorissen | Terrestrial archaeologist | ALI |
| Ren LaRocca | Assistant (retired cancer physician; has been to Nikumaroro before) | ALI |
| Sirisha Bandla | Technology specialist; Purdue alumna, Cradle of Astronauts | Purdue |
| Marc Hagle | Field assistant; Purdue alumnus, Cradle of Astronauts | Purdue |
| Meere Kenana | Kiribati representative; curator, Kiribati Culture and Museum | Kiribati |
| Agnes Naare | Kiribati representative | Ministry of Line and Phoenix Islands Development |
| Heidi Boraia-Tangata | Kiribati representative | Ministry of Line and Phoenix Islands Development |
| Michael Krivor | Maritime archaeologist | RECON Offshore |
| William Wilson | Maritime archaeologist | RECON Offshore |
| Aaron Arrants | Medic and safety officer (has been to Nikumaroro before) | — |
| Helmut Schleppi | Filmmaker | — |
| Ella Van Cleave | Filmmaker | — |
| David Pearson | Filmmaker | — |
| Matt Maddaloni | Filmmaker | — |

**Astronaut line:** "Bandla and Hagle are both members of Purdue's 'Cradle of Astronauts.'" A further detail (Bandla flew to space with Virgin Galactic in 2021, Hagle with Blue Origin in 2022) is from general knowledge. **Verify against a reliable source before including it**, or leave it out.

### 11.4 In the news (external links, open in a new tab)
- BBC: "Expedition hopes to find aviator Amelia Earhart's plane on remote island" (Oct 10, 2026). https://www.bbc.com/news/articles/c3y0e871rk4vo
- CBS News video: "Expedition tries to solve Amelia Earhart mystery" (Oct 5, 2026). https://www.cbsnews.com/video/new-expedition-tries-solve-amelia-earhart-mystery-legacy/
- Purdue's "Finding Amelia" podcast miniseries: https://stories.purdue.edu/amelia-earhart-podcast/
- Official expedition site: https://amelia.prf.org/

### 11.5 Source URLs for `facts.ts`
- Purdue Oct 12 dispatch: https://www.purdue.edu/newsroom/2026/Q4/earhart-expedition-update-crew-arrives-at-nikumaroro-launches-critical-phase-of-amelia-earhart-plane-search
- Purdue Oct 9 dispatch: https://www.purdue.edu/newsroom/2026/Q4/earhart-expedition-update-crew-at-sea-expected-to-arrive-on-nikumaroro-in-72-hours
- Purdue Oct 7 dispatch: https://www.purdue.edu/newsroom/2026/Q4/earhart-expedition-update-crew-begins-6-day-sea-voyage-to-south-pacific-atoll-nikumaroro
- Purdue Oct 6 dispatch: https://www.purdue.edu/newsroom/2026/Q4/earhart-expedition-update-crew-arrives-at-tarawa-prepares-for-departure
- Purdue postponement (Oct 2025): https://www.purdue.edu/newsroom/2025/Q4/expedition-to-search-for-amelia-earharts-plane-postponed-to-2026
- CBS News (announcement): https://www.cbsnews.com/news/amelia-earhart-lost-plane-new-expedition-location-nikumaroro-pacific
- CBS News (delay): https://www.cbsnews.com/miami/news/amelia-earhart-plane-expedition-locate-delayed
- GlobalAir: https://www.globalair.com/articles/purdue-announces-expedition-to-find-earharts-missing-plane/10881
- Jalopnik: https://www.jalopnik.com/2226721/amelia-earhart-plane-wreckage-expedition-might-find-coconut-tree-instead/
- Yahoo / Popular Mechanics: https://www.yahoo.com/news/mysterious-anomaly-may-amelia-earhart-182800042.html
- Biography.com: https://www.biography.com/history-culture/a71769662/amelia-earhart-mystery-lost-plane-expedition
- AlterNet (The Conversation): https://www.alternet.org/amelia-earhart/
- Fox 9: https://www.fox9.com/news/amelia-earhart-expedition-heads-south-pacific-search-aviators-missing-plane
- Indian Defence Review: https://indiandefencereview.com/mysterious-object-pacific-lagoon-amelia-earhart-lost-plane/

---

### 11.6 Approved additions (Oct 14, 2026)

Verified against the opened source pages (see `docs/fact-bank-draft.md`) and approved by Matt.

**1937, hour by hour** (times are as logged by the Itasca, local time at Howland)
- **H1.** On July 2, 1937, Earhart and Noonan took off from Lae, New Guinea, for Howland Island, an easterly flight of about 2,556 miles (4,113 km). *(Smithsonian NASM)*
- **H2.** They left at 10:00 a.m. Lae time, which was midnight Greenwich time. *(Smithsonian NASM; TIGHAR, "Log Jam")*
- **H3.** She expected to fly at least 18 hours and arrive around sunrise. TIGHAR's reconstruction puts about 1,100 U.S. gallons of fuel aboard at takeoff. *(Smithsonian NASM; TIGHAR, "Log Jam")*
- **H4.** The Coast Guard cutter Itasca waited at Howland with fuel. Howland is only about 2 miles long and 1 mile wide. *(Smithsonian NASM)*
- **H5.** Earhart and the Itasca never made two-way contact. Confused radio plans, and the fact that neither she nor Noonan could use Morse code, meant she may never have heard the ship's calls. *(Smithsonian NASM)*
- **H6.** At 7:42 a.m. the Itasca's radio log reads, as typed: "WE MUST ON ON YOU BUT CANNOT SEE U BUT GAS IS RUNNING LOW BEEN UNABLE TO REACH YOU BY RADIO WE ARE FLYING AT A 1000 FEET." *(TIGHAR, "Log Jam", transcribing the Itasca Primary Radio Log)*
- **H7.** Her strongest signal came at 7:58 a.m. She was circling, searching and running low on fuel. *(Smithsonian NASM)*
- **H8.** At 8:43 a.m. the log reads "WE ARE ON THE LINE 157 337 WE WL REPT." It was the last transmission the Itasca received. *(Smithsonian NASM; TIGHAR, "Log Jam")*
- **H9.** About two hours after losing contact, the Itasca began searching north and northwest of Howland, and kept at it for the next week. *(Pacific Wrecks)*
- **H10.** The U.S. Navy joined with the battleship Colorado, the seaplane tender Swan, the carrier Lexington and three destroyers: Cushing, Lamson and Drayton. *(Pacific Wrecks)*
- **H11.** The U.S. government searched from July 2 to July 18, its largest ever search for a lost aircraft, and found no trace of the plane or crew. *(Smithsonian NASM)*

**Earhart at Purdue**
- **P1.** At Purdue, Earhart held a position as Consultant in the Department of Careers for Women. *(Purdue Archives)*
- **P2.** Purdue holds the George Palmer Putnam Collection of Amelia Earhart Papers, covering her flying career, personal life and business activities, including twenty scrapbooks compiled by Earhart and Putnam. *(Purdue Archives)*

**Nikumaroro, the island**
- **I1.** Nikumaroro stretches about 7.5 km by 2.5 km (4.7 by 1.6 miles), surrounded by deep ocean. *(NASA Earth Observatory)*
- **I2.** It is essentially a sandbar on a coral reef atop a sinking deep-sea volcano. Thick scrub, Pisonia trees and coconut palms hold the sand in place around a central lagoon. *(NASA Earth Observatory)*
- **I3.** It lies nearly 1,000 miles from Fiji, roughly halfway between Australia and Hawaii. *(NASA Earth Observatory)*
- **I4.** It was once named Gardner Island by American sailors. *(NASA Earth Observatory)*
- **I5.** Americans and the British tried several times to settle the island, growing coconuts and even considering it for weapons testing. *(NASA Earth Observatory)*
- **I6.** In the late 1930s the island was settled under Britain's Phoenix Islands Settlement Scheme; its progress reports date from December 1938. *(TIGHAR Research Bulletin 25)*
- **I7.** Kiribati declared the island part of the Phoenix Islands Protected Area in 2006. *(NASA Earth Observatory)*

**Sources for 11.6**
- Smithsonian NASM: https://airandspace.si.edu/stories/editorial/amelia-earhart-missing-80-years-not-forgotten
- TIGHAR, "Log Jam": https://tighar.org/Publications/TTracks/12_2/logjam.html
- Pacific Wrecks: https://pacificwrecks.com/aircraft/electra/1055.html
- Purdue Archives: https://collections.lib.purdue.edu/aearhart/collectiondescription.php
- NASA Earth Observatory: https://earthobservatory.nasa.gov/images/91889/nikumaroro-atoll
- TIGHAR Research Bulletin 25: https://tighar.org/Projects/Earhart/Archives/Research/Bulletins/25_GallagherNiku/25_GallagherNiku.html

**Images for 11.6** (public domain or free with credit)
- NASA Earth Observatory Landsat 8 image of Nikumaroro, July 28, 2014. Credit: NASA Earth Observatory image by Joshua Stevens, using Landsat data from the U.S. Geological Survey. https://earthobservatory.nasa.gov/images/91889/nikumaroro-atoll
- Earhart in front of the Lockheed Electra (NASA GPN-2002-000211; Smithsonian Institution), public domain: https://commons.wikimedia.org/wiki/File:Amelia_Earhart_-_GPN-2002-000211.jpg
- Earhart and Noonan by the Electra at Darwin, June 28, 1937, public domain: https://commons.wikimedia.org/wiki/File:Amelia_Earhart_in_Darwin_on_28_June_1937.jpg

## 12. Environment variables

| Name | Where | Purpose |
|---|---|---|
| `SITE_URL` | Vercel + GitHub secret | e.g. `https://earhart.mjhahn.com` |
| `CRON_SECRET` | Vercel + GitHub secret | Bearer token for `/api/check-dispatches` (long random string) |
| `RESEND_API_KEY` | Vercel | Resend API key |
| `ALERT_FROM` | Vercel | e.g. `Taraia Watch <updates@earhart.mjhahn.com>` |
| `ALERT_REPLY_TO` | Vercel | Matt's email |
| `ALERT_RECIPIENTS` | Vercel | Comma-separated list |
| `ADMIN_EMAIL` | Vercel | Where `?test=1` sends |
| Upstash Redis REST URL + token | Vercel (auto-injected by the Marketplace integration) | Check the exact variable names the integration injects. Read both `UPSTASH_REDIS_REST_*` and `KV_REST_API_*` styles. |
| `ADMIN_TOKEN` | Vercel (Phase 4) | Protects `/admin` |

Provide `.env.example`. Never commit secrets.

---

## 13. Build phases and acceptance criteria

### Phase 1 — Live tonight (core + alerts)
- [ ] Next.js app scaffolded and deployed on Vercel from `main`.
- [ ] Purdue fetch, filter and parse with Vitest tests against `fixtures/purdue-posts.json`. Tests cover all five dispatches, the boilerplate stripping, the `date_gmt` `Z` fix, and the excerpt fallback.
- [ ] Home: status hero, latest dispatch card, dispatch timeline, footer with disclaimer.
- [ ] Dispatch detail page with gallery, lightbox and source link.
- [ ] `content/status.json` drives phase, verdict and the status sentence. Day counter and both clocks work in the correct timezones.
- [ ] `/api/check-dispatches` with auth, seed mode, locks, per-recipient sends, `dryRun` and `test` modes.
- [ ] GitHub Actions workflow committed. Running it manually (`workflow_dispatch`) succeeds against production.
- [ ] Email renders well in the iPhone Gmail and Apple Mail apps (send a `?test=1` to Matt).
- [ ] Looks great at 375px wide. No horizontal scroll. Text is 18px or larger.

### Phase 2 — The wow layer
- [ ] "Right now on Nikumaroro" panel (weather, sea, day/night, tide sparkline, attribution).
- [ ] Phase stepper and lagoon cross-section with phase overlays and live water level.
- [ ] Journey globe with 1937 and 2026 layers, lazy-loaded.
- [ ] Dynamic OG images (home and per-dispatch). Test by pasting the link into iMessage and WhatsApp.
- [ ] PWA manifest, icons, and the "Add to Home Screen" card with platform detection.

### Phase 3 — Story and people
- [ ] "The mystery" explainer and "Skeptic's corner" from the Fact Bank, each fact linked to its source.
- [ ] Crew cards. "In the news" list.
- [ ] Share button.
- [ ] Lighthouse mobile performance ≥ 90 and accessibility ≥ 95.

### Phase 4 — Optional, only if Matt asks
- [ ] `/admin` (token-protected) to set phase, verdict, headline and note from his phone, stored in Redis.
- [ ] Friend signup for alerts:
  - Double opt-in.
  - Unsubscribe link in every email (required by Canada's anti-spam law, CASL).
  - Resend Audiences or a Redis list.
  - Stay under 100 emails a day.
- [ ] Claude API "what's new today" summaries. **Do not build without explicit approval**, since it adds cost.

---

## 14. Cost plan (target $0/month)

| Service | Plan | Our usage |
|---|---|---|
| Vercel | Hobby (free, personal non-commercial use) | Small static and ISR site |
| GitHub Actions | Free: unlimited for public repos, 2,000 min/month for private | About 1,440 min/month at 30-minute checks |
| Upstash Redis | Free: 256 MB, 500K commands/month | About 10 commands per check; tiny |
| Resend | Free: 3,000 emails/month, 100/day, one domain | A few emails per dispatch |
| Open-Meteo | Free for non-commercial use, no key | About 100 calls/day with caching |
| Fonts, maps, d3 | Open source | None |
| Domain | Existing mjhahn.com (subdomain) | No extra cost |

**Do not enable:**
- Vercel Image Optimization on remote Purdue images (use `unoptimized` or plain `<img>`)
- Paid add-ons or analytics beyond free Vercel Web Analytics

**Re-check free-tier numbers on each provider's pricing page before relying on them;** they change.

---

## 15. Setup steps Matt does by hand

1. Create the GitHub repo and push the spec.
2. Import the repo into Vercel (framework: Next.js).
3. In Vercel → Storage / Marketplace, add **Upstash Redis** (free plan) and connect it to the project.
4. Create a Resend account.
   - Add and verify a sending subdomain (e.g. `earhart.mjhahn.com`) by adding its DNS records.
   - Create an API key.
5. Add the env vars from §12 in Vercel (Production and Preview).
6. Add the `SITE_URL` and `CRON_SECRET` repo secrets in GitHub.
7. Optional: point a custom domain (CNAME `earhart.mjhahn.com` → Vercel).
8. After Phase 1 deploys:
   - Run the workflow once manually; it seeds the notified set and sends nothing.
   - Hit `/api/check-dispatches?test=1` to receive a sample email.
   - Then add her address to `ALERT_RECIPIENTS`.

---

## Appendix A — Claude Code kickoff prompt

```
Read SPEC.md in this repo end to end before writing any code. It is the source of truth for this project.

Then:
1. Reply with a short build plan for Phase 1 only (files you'll create, key decisions, and anything in the spec you think is wrong or risky). Wait for my OK.
2. Build Phase 1 in small, working commits. Run lint, typecheck and the Vitest suite before each commit.
3. Before writing the parser, fetch the live Purdue REST API response described in §4.1 and save it to fixtures/purdue-posts.json. Write the parser and its tests against that fixture.
4. Stop after Phase 1 and give me: what's done, the exact manual setup steps still needed (env vars, Upstash, Resend domain, GitHub secrets), and how to test the email flow.

Hard rules:
- Phone-first. Check every screen at 375px wide. 18px minimum body text.
- No paid services, no new third-party services, and no Claude API calls without asking me first.
- Never infer or display the verdict except from content/status.json.
- All editorial copy comes only from the Fact Bank in §11. Don't add facts from memory.
- No Purdue or ALI logos or look-alike branding. Keep the footer disclaimer.
- Never commit secrets. Keep .env.example current.
```
