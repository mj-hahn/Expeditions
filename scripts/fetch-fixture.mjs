// Saves the live Purdue REST response (SPEC §4.1) to fixtures/purdue-posts.json.
// Usage: npm run fixture
import { mkdir, writeFile } from "node:fs/promises";

const url = new URL("https://www.purdue.edu/newsroom/wp-json/wp/v2/posts");
url.search = new URLSearchParams({
  search: "earhart",
  after: "2026-09-01T00:00:00",
  orderby: "date",
  order: "desc",
  per_page: "30",
  _embed: "wp:featuredmedia",
}).toString();

const res = await fetch(url, {
  headers: { "User-Agent": "LuisasLookout/1.0 (fixture capture)", Accept: "application/json" },
});
if (!res.ok) throw new Error(`Purdue API responded ${res.status}`);
const posts = await res.json();
if (!Array.isArray(posts)) throw new Error("Unexpected response shape");
await mkdir("fixtures", { recursive: true });
await writeFile("fixtures/purdue-posts.json", JSON.stringify(posts, null, 2) + "\n");
console.log(`Saved ${posts.length} posts:`);
for (const p of posts) console.log(`  ${p.id}  ${p.date_gmt}  ${p.title.rendered}`);
