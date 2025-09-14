// Random team name generator
const fruits = [
  "apple",
  "banana",
  "cherry",
  "date",
  "elderberry",
  "fig",
  "grape",
  "honeydew",
  "kiwi",
  "lemon",
  "mango",
  "orange",
  "papaya",
  "quince",
  "raspberry",
  "strawberry",
  "tangerine",
  "watermelon",
  "blueberry",
  "blackberry",
  "cranberry",
  "pineapple",
];

const words = [
  "team",
  "squad",
  "crew",
  "group",
  "unit",
  "force",
  "band",
  "club",
  "circle",
  "alliance",
  "coalition",
  "federation",
  "guild",
  "league",
  "network",
  "partnership",
  "union",
  "collective",
  "assembly",
  "council",
  "board",
  "committee",
];

const adjectives = [
  "bright",
  "swift",
  "bold",
  "sharp",
  "quick",
  "smart",
  "strong",
  "fast",
  "clever",
  "wise",
  "brave",
  "calm",
  "cool",
  "fresh",
  "new",
  "prime",
  "elite",
  "pro",
  "ace",
  "top",
  "best",
  "super",
];

export function generateRandomTeamName(): { name: string; slug: string } {
  // Randomly select components
  const fruit = fruits[Math.floor(Math.random() * fruits.length)];
  const word = words[Math.floor(Math.random() * words.length)];
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const number = Math.floor(Math.random() * 999) + 1;

  // Create name without hyphens (for display)
  const name = `${adjective} ${fruit} ${word} ${number}`;

  // Create slug with hyphens (for URL)
  const slug = `${adjective}-${fruit}-${word}-${number}`;

  return { name, slug };
}
