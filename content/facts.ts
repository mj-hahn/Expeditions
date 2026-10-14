// Fact Bank (SPEC §11). The ONLY source for editorial copy on the site.
// Each entry is a plain-language paraphrase of one Fact Bank item, with its sources.
// Don't add facts that aren't in the spec's Fact Bank.

export type Source = { name: string; url: string };
export type Fact = { id: string; text: string; sources: Source[] };

const SRC = {
  purdueOct12: {
    name: "Purdue, Oct 12 dispatch",
    url: "https://www.purdue.edu/newsroom/2026/Q4/earhart-expedition-update-crew-arrives-at-nikumaroro-launches-critical-phase-of-amelia-earhart-plane-search",
  },
  purdueOct9: {
    name: "Purdue, Oct 9 dispatch",
    url: "https://www.purdue.edu/newsroom/2026/Q4/earhart-expedition-update-crew-at-sea-expected-to-arrive-on-nikumaroro-in-72-hours",
  },
  purdueOct7: {
    name: "Purdue, Oct 7 dispatch",
    url: "https://www.purdue.edu/newsroom/2026/Q4/earhart-expedition-update-crew-begins-6-day-sea-voyage-to-south-pacific-atoll-nikumaroro",
  },
  purduePostponed: {
    name: "Purdue, Oct 2025",
    url: "https://www.purdue.edu/newsroom/2025/Q4/expedition-to-search-for-amelia-earharts-plane-postponed-to-2026",
  },
  cbsAnnouncement: {
    name: "CBS News",
    url: "https://www.cbsnews.com/news/amelia-earhart-lost-plane-new-expedition-location-nikumaroro-pacific",
  },
  cbsDelay: {
    name: "CBS News",
    url: "https://www.cbsnews.com/miami/news/amelia-earhart-plane-expedition-locate-delayed",
  },
  globalAir: {
    name: "GlobalAir",
    url: "https://www.globalair.com/articles/purdue-announces-expedition-to-find-earharts-missing-plane/10881",
  },
  jalopnik: {
    name: "Jalopnik",
    url: "https://www.jalopnik.com/2226721/amelia-earhart-plane-wreckage-expedition-might-find-coconut-tree-instead/",
  },
  yahoo: {
    name: "Yahoo / Popular Mechanics",
    url: "https://www.yahoo.com/news/mysterious-anomaly-may-amelia-earhart-182800042.html",
  },
  biography: {
    name: "Biography.com",
    url: "https://www.biography.com/history-culture/a71769662/amelia-earhart-mystery-lost-plane-expedition",
  },
  alternet: { name: "The Conversation via AlterNet", url: "https://www.alternet.org/amelia-earhart/" },
  fox9: {
    name: "Fox 9",
    url: "https://www.fox9.com/news/amelia-earhart-expedition-heads-south-pacific-search-aviators-missing-plane",
  },
  idr: {
    name: "Indian Defence Review",
    url: "https://indiandefencereview.com/mysterious-object-pacific-lagoon-amelia-earhart-lost-plane/",
  },
} satisfies Record<string, Source>;

export const FACTS = {
  F1: {
    id: "F1",
    text: "On July 2, 1937, Amelia Earhart and her navigator, Fred Noonan, vanished while flying toward tiny Howland Island. She was trying to become the first person to fly around the world at the equator, and had already covered about 22,000 of the planned 29,000 miles.",
    sources: [SRC.purdueOct7],
  },
  F2: {
    id: "F2",
    text: "Nikumaroro is an uninhabited coral atoll in Kiribati's Phoenix Islands, about 400 miles south of Howland Island.",
    sources: [SRC.purdueOct12],
  },
  F3: {
    id: "F3",
    text: "It is remote: about 1,800 nautical miles south of Hawaii, and more than 230 miles from the nearest island where anyone lives.",
    sources: [SRC.purdueOct9],
  },
  F4: {
    id: "F4",
    text: "The “Taraia Object” was first spotted in satellite images in 2020. It was later found in aerial photos going all the way back to 1938.",
    sources: [SRC.purdueOct9],
  },
  F5: {
    id: "F5",
    text: "The idea that Earhart and Noonan landed on Nikumaroro and died there as castaways is often called the Nikumaroro hypothesis. TIGHAR, The International Group for Historic Aircraft Recovery, developed and documented it over nearly 40 years.",
    sources: [SRC.purdueOct12, SRC.cbsAnnouncement],
  },
  F6: {
    id: "F6",
    text: "Supporters point to radio bearings from 1937 that converge on Nikumaroro, and to the “Bevington Object”: a photo taken three months after the disappearance that some believe shows the Electra's landing gear on the reef.",
    sources: [SRC.globalAir],
  },
  F7: {
    id: "F7",
    text: "The Purdue Research Foundation paid for Earhart's Lockheed Electra, her “Flying Laboratory,” through the Amelia Earhart Fund for Aeronautical Research.",
    sources: [SRC.purdueOct9],
  },
  F8: {
    id: "F8",
    text: "Earhart and her husband, George Putnam, planned to give the Electra back to Purdue after the flight.",
    sources: [SRC.cbsAnnouncement],
  },
  F9: {
    id: "F9",
    text: "The trip was first planned for November 2025. It was pushed back while the team worked through permits with the Kiribati government, and to avoid cyclone season.",
    sources: [SRC.purduePostponed, SRC.cbsDelay],
  },
  F10: {
    id: "F10",
    text: "From aerial photos, the object seems to lie only about 10 feet from the lagoon shore, under as little as 5 feet of water (depending on the tide) and an unknown depth of sediment.",
    sources: [SRC.purdueOct12],
  },
  F11: {
    id: "F11",
    text: "The plan: walk the sand spit looking for anything on the surface, sweep the lagoon with a magnetometer (the Electra was mostly aluminum, but its steel cables could register), use sonar to see under the sediment, push a hydroprobe down to touch the object, then clear the sediment with a water-powered dredge for a direct look.",
    sources: [SRC.purdueOct12],
  },
  F12: {
    id: "F12",
    text: "The crew sleeps aboard the ship every night, partly because of coconut crabs. Their size and their nighttime habits make camping on the island impractical.",
    sources: [SRC.purdueOct12],
  },
  F13: {
    id: "F13",
    text: "It had been seven years since the last authorized expedition set foot on Nikumaroro, and more than 15 years since anyone had been on the Taraia Peninsula.",
    sources: [SRC.purdueOct12],
  },
  F14: {
    id: "F14",
    text: "The 17-person team and a 17-person boat crew sailed about 830 nautical miles from Tarawa aboard the Marin Mainiku, a Kiribati National Shipping Line vessel.",
    sources: [SRC.purdueOct12],
  },
  F15: {
    id: "F15",
    text: "The team comes ashore through the “blasted channel,” a gap in the reef cut by the British government when it evacuated the island's colonists in 1963. Nobody has lived there since.",
    sources: [SRC.purdueOct7],
  },
  F16: {
    id: "F16",
    text: "El Niño conditions are affecting the sea around the island, so getting ashore each day depends on the tides and on safe boating conditions.",
    sources: [SRC.purdueOct12],
  },
  F17: {
    id: "F17",
    text: "A returning team member says the island has no mosquitoes, snakes or spiders. Coconut crabs and hermit crabs are another story.",
    sources: [SRC.purdueOct9],
  },
  F18: {
    id: "F18",
    text: "If the object turns out to be the Electra, the organizers hope to return for a full excavation. ALI has pointed to a second field season in 2027.",
    sources: [SRC.fox9, SRC.idr],
  },
  S1: {
    id: "S1",
    text: "TIGHAR founder Ric Gillespie still believes Nikumaroro is where Earhart ended up, but he doesn't think the Taraia Object is her plane. He has told NBC News he thinks it's a coconut tree.",
    sources: [SRC.jalopnik, SRC.alternet],
  },
  S2: {
    id: "S2",
    text: "Gillespie has also argued that a plane there would have been buried by coral, not sand.",
    sources: [SRC.yahoo],
  },
  S3: {
    id: "S3",
    text: "In 2025 he told NBC News that searchers had already looked at that spot and found nothing.",
    sources: [SRC.cbsAnnouncement],
  },
  S4: {
    id: "S4",
    text: "A former curator at the Smithsonian's National Air and Space Museum said the object needed more photographing before anyone could make stronger claims.",
    sources: [SRC.biography],
  },
  S5: {
    id: "S5",
    text: "Until the team inspects it on site, the Taraia Object is an object of interest, not confirmed evidence.",
    sources: [],
  },
} satisfies Record<string, Fact>;

export type FactId = keyof typeof FACTS;

/** "The mystery" explainer (SPEC §7.1 item 7), in reading order. */
export const MYSTERY: { kicker: string; title: string; facts: FactId[] }[] = [
  { kicker: "1937", title: "What happened", facts: ["F1"] },
  { kicker: "The island", title: "Why Nikumaroro", facts: ["F2", "F3", "F5", "F6"] },
  { kicker: "The lagoon", title: "What the Taraia Object is", facts: ["F4", "F10", "F13"] },
  { kicker: "The connection", title: "Why Purdue is involved", facts: ["F7", "F8", "F9", "F18"] },
];

/** Skeptic's corner (SPEC §7.1 item 8). S5 is the closing line. */
export const SKEPTICS: FactId[] = ["S1", "S2", "S3", "S4"];
export const SKEPTICS_CLOSING: FactId = "S5";

/** Short "did you know" notes about life on the expedition. */
export const DID_YOU_KNOW: FactId[] = ["F14", "F15", "F12", "F17", "F16"];
