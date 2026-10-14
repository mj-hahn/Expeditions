// "In the news" (SPEC §11.4). External links open in a new tab.

export type PressLink = { outlet: string; title: string; date?: string; url: string; kind?: "video" | "podcast" | "site" };

export const PRESS: PressLink[] = [
  {
    outlet: "BBC",
    title: "Expedition hopes to find aviator Amelia Earhart's plane on remote island",
    date: "Oct 10, 2026",
    url: "https://www.bbc.com/news/articles/c3y0e871rk4vo",
  },
  {
    outlet: "CBS News",
    title: "Expedition tries to solve Amelia Earhart mystery",
    date: "Oct 5, 2026",
    url: "https://www.cbsnews.com/video/new-expedition-tries-solve-amelia-earhart-mystery-legacy/",
    kind: "video",
  },
  {
    outlet: "Purdue University",
    title: "“Finding Amelia” podcast miniseries",
    url: "https://stories.purdue.edu/amelia-earhart-podcast/",
    kind: "podcast",
  },
  { outlet: "Official expedition site", title: "amelia.prf.org", url: "https://amelia.prf.org/", kind: "site" },
];
