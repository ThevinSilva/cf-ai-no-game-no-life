import { type GameState } from "../types/game";
import { parseAndRoll } from "../utils/dice";

export function consumeAction(state: GameState, targetItemId: string): string {
  const player = state.player;

  if (!player.itemIds.includes(targetItemId)) {
    return `Action failed: Player does not have item '${targetItemId}' in their inventory.`;
  }

  const item = state.items[targetItemId];

  if (item.type !== "consumable") {
    return `Action failed: ${item.name} is not a consumable item.`;
  }

  // Roll healing dice (e.g., "2d4")
  const healAmount = parseAndRoll(item.dice, 0);

  player.hp = Math.min(player.maxHp, player.hp + healAmount);

  // Remove the consumed item from inventory
  player.itemIds = player.itemIds.filter((id) => id !== targetItemId);

  return `Player consumed ${item.name}. Recovered ${healAmount} HP. Current HP: ${player.hp}/${player.maxHp}.`;
}
