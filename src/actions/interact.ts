// actions/interact.ts
import { type GameState } from "../types/game";

export function interactAction(state: GameState, targetItemId: string): string {
  const currentRoom = state.rooms[state.currentRoomId];
  const item = state.items[targetItemId];

  if (!item) {
    return `Action failed: Item '${targetItemId}' does not exist in the game state.`;
  }

  // Ensure the item is actually in the room (preventing cross-room teleportation looting)
  if (
    !currentRoom.itemIds.includes(targetItemId) &&
    !currentRoom.hiddenItemIds.includes(targetItemId)
  ) {
    return `Action failed: ${item.name} is not in this room.`;
  }

  if (item.type === "prop") {
    return `Player interacted with the prop: ${item.name}. System note to DM: Narrate the interaction based on the prop's description.`;
  }

  // It's loot! Move it from the room to the player's inventory
  currentRoom.itemIds = currentRoom.itemIds.filter((id) => id !== targetItemId);
  currentRoom.hiddenItemIds = currentRoom.hiddenItemIds.filter(
    (id) => id !== targetItemId
  );

  state.player.itemIds.push(targetItemId);

  return `Player picked up ${item.name} and added it to their inventory.`;
}
