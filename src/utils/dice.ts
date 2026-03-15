export function parseAndRoll(
  diceString?: string,
  modifier: number = 0
): number {
  if (!diceString) return modifier; // e.g., an attack that just does flat modifier damage

  const match = diceString.toLowerCase().match(/(\d+)d(\d+)/);
  if (!match) return modifier;

  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  let total = 0;

  for (let i = 0; i < count; i++) {
    total += Math.floor(Math.random() * sides) + 1;
  }

  return total + modifier;
}
