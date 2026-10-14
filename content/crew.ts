// Expedition roster (SPEC §11.3, from Purdue's Oct 7 dispatch). Static by design:
// the roster is stripped from dispatch text and shown from here instead.

export type CrewMember = {
  name: string;
  role: string;
  org: string;
  /** Extra detail from the roster's role column. */
  note?: string;
  /** Purdue "Cradle of Astronauts" alumni (SPEC §11.3 astronaut line). */
  astronaut?: boolean;
};

export const CREW: CrewMember[] = [
  { name: "Rick Pettigrew", role: "Project director (expedition leader)", org: "ALI" },
  { name: "Steve Schultz", role: "Field assistant; Purdue team lead", org: "Purdue", note: "Purdue SVP and general counsel" },
  { name: "Laura Kennedy", role: "Technology specialist", org: "ALI" },
  { name: "Philippa Jorissen", role: "Terrestrial archaeologist", org: "ALI" },
  { name: "Ren LaRocca", role: "Assistant", org: "ALI", note: "Retired cancer physician; has been to Nikumaroro before" },
  { name: "Sirisha Bandla", role: "Technology specialist", org: "Purdue", note: "Purdue alumna", astronaut: true },
  { name: "Marc Hagle", role: "Field assistant", org: "Purdue", note: "Purdue alumnus", astronaut: true },
  { name: "Meere Kenana", role: "Kiribati representative", org: "Kiribati", note: "Curator, Kiribati Culture and Museum" },
  { name: "Agnes Naare", role: "Kiribati representative", org: "Ministry of Line and Phoenix Islands Development" },
  { name: "Heidi Boraia-Tangata", role: "Kiribati representative", org: "Ministry of Line and Phoenix Islands Development" },
  { name: "Michael Krivor", role: "Maritime archaeologist", org: "RECON Offshore" },
  { name: "William Wilson", role: "Maritime archaeologist", org: "RECON Offshore" },
  { name: "Aaron Arrants", role: "Medic and safety officer", org: "", note: "Has been to Nikumaroro before" },
  { name: "Helmut Schleppi", role: "Filmmaker", org: "" },
  { name: "Ella Van Cleave", role: "Filmmaker", org: "" },
  { name: "David Pearson", role: "Filmmaker", org: "" },
  { name: "Matt Maddaloni", role: "Filmmaker", org: "" },
];

export const ASTRONAUT_LINE = "Bandla and Hagle are both members of Purdue's “Cradle of Astronauts.”";

/** Display groups, in order. */
export const CREW_GROUPS: { title: string; match: (c: CrewMember) => boolean }[] = [
  { title: "Archaeological Legacy Institute", match: (c) => c.org === "ALI" },
  { title: "Purdue", match: (c) => c.org === "Purdue" },
  { title: "Kiribati", match: (c) => c.org === "Kiribati" || c.org.startsWith("Ministry") },
  { title: "Maritime archaeology", match: (c) => c.org === "RECON Offshore" },
  { title: "Safety and film crew", match: (c) => c.org === "" },
];
