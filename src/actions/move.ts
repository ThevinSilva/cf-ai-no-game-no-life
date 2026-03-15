// actions/move.ts
import { type GameState } from "../types/game";

export function moveAction(state: GameState, targetRoomId: string): string {
  const currentRoomId = state.currentRoomId;
  const connectedRooms = state.roomNodes[currentRoomId] || [];

  if (!connectedRooms.includes(targetRoomId)) {
    return `Action failed: Room '${targetRoomId}' is not connected to the current location.`;
  }

  // Perform the move
  state.currentRoomId = targetRoomId;

  // Check if the new room has hostile actors to trigger combat state
  const newRoom = state.rooms[targetRoomId];
  const hasHostiles = newRoom.actorIds.some(
    (id) => state.actors[id]?.isHostile
  );
  state.isInCombat = hasHostiles;

  return `Player successfully moved to ${newRoom.name}. System note to DM: Narrate their arrival and describe what they see.`;
}
