import type { FactId } from "@/content/facts";

/** The last flight, in order. Every sentence comes from the Fact Bank (SPEC §11.6). */
export const TIMELINE_1937: { time: string; title: string; facts: FactId[] }[] = [
  { time: "July 2, 10:00 a.m. (Lae time)", title: "Takeoff from Lae", facts: ["H1", "H2", "H3"] },
  { time: "At Howland Island", title: "The Itasca waits", facts: ["H4", "H5"] },
  { time: "7:42 a.m.", title: "Running low on fuel", facts: ["H6"] },
  { time: "7:58 a.m.", title: "Her strongest signal", facts: ["H7"] },
  { time: "8:43 a.m.", title: "The last message", facts: ["H8"] },
  { time: "About two hours later", title: "The search begins", facts: ["H9"] },
  { time: "The days that followed", title: "The Navy joins in", facts: ["H10"] },
  { time: "July 18, 1937", title: "The search ends", facts: ["H11"] },
];

export const TIMELINE_NOTE = "Times from 7:42 a.m. on are as logged by the Itasca, in local time at Howland Island.";
