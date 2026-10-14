// "Test yourself" quiz. Every question is drawn from one Fact Bank entry (SPEC §11),
// and the answer explanation shows that fact and its source. Wrong options are only
// answer choices, never claims.
import type { FactId } from "@/content/facts";

export type QuizQuestion = { q: string; options: string[]; answer: number; fact: FactId };

export const QUIZ: QuizQuestion[] = [
  { q: "In what year did Amelia Earhart vanish?", options: ["1935", "1937", "1939"], answer: 1, fact: "F1" },
  {
    q: "Roughly how many miles of her round-the-world flight had she already flown?",
    options: ["About 7,000", "About 22,000", "All 29,000"],
    answer: 1,
    fact: "F1",
  },
  {
    q: "About how far is Nikumaroro from Howland Island, where she was headed?",
    options: ["40 miles", "400 miles", "4,000 miles"],
    answer: 1,
    fact: "F2",
  },
  {
    q: "When was the Taraia Object first spotted in satellite images?",
    options: ["1998", "2020", "2025"],
    answer: 1,
    fact: "F4",
  },
  {
    q: "From aerial photos, about how far from the lagoon shore does the object seem to lie?",
    options: ["About 10 feet", "About 100 feet", "Half a mile"],
    answer: 0,
    fact: "F10",
  },
  {
    q: "Why does the crew sleep aboard the ship every night?",
    options: ["Sharks in the lagoon", "Coconut crabs", "No fresh water"],
    answer: 1,
    fact: "F12",
  },
  {
    q: "According to a returning team member, which of these is NOT a problem on the island?",
    options: ["Mosquitoes", "Coconut crabs", "Hermit crabs"],
    answer: 0,
    fact: "F17",
  },
  {
    q: "How does the team get from the ship to the shore?",
    options: ["By helicopter", "Through the “blasted channel” in the reef", "Across a sandbar at low tide"],
    answer: 1,
    fact: "F15",
  },
  {
    q: "What did the Purdue Research Foundation pay for back in the 1930s?",
    options: ["Earhart's Lockheed Electra", "A search ship", "Her pilot's license"],
    answer: 0,
    fact: "F7",
  },
];
