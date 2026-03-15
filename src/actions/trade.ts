import { type GameState } from "../types/game";

export function talkAction(
  state: GameState,
  targetActorId: string,
  spokenWords: string
): string {
  const currentRoom = state.rooms[state.currentRoomId];

  if (!currentRoom.actorIds.includes(targetActorId)) {
    return `Action failed: Actor '${targetActorId}' is not in this room.`;
  }

  const actor = state.actors[targetActorId];

  if (actor.isHostile) {
    return `Player attempted to speak to ${actor.name}, but they are hostile! They might attack instead.`;
  }

  return `Player said to ${actor.name}: "${spokenWords}". System note to DM: Roleplay ${actor.name}'s response based on their role and description.`;
}
