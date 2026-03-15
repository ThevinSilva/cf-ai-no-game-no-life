import { type GameState, type Player } from "../types/game";
import generateActors from "../tools/ActorGeneration";
import generateItems from "../tools/ItemGeneration";
import generateSkills from "../tools/SkillGeneration";
import generateRooms from "../tools/RoomGeneration";
import type { LanguageModel } from "ai";

export default async function initializeGameState(
  setting: string,
  theme: string,
  level: number,
  playerClass: string,
  jsonGeneratorModel: LanguageModel
): Promise<GameState> {
  try {
    const [items, skills] = await Promise.all([
      generateItems(setting, theme, jsonGeneratorModel),
      generateSkills(
        { characterClass: playerClass, theme, level },
        jsonGeneratorModel
      )
    ]);

    const actors = await generateActors(
      { setting, theme, level },
      { items, skills },
      jsonGeneratorModel
    );

    const rooms = await generateRooms(
      { setting, theme, level },
      { actors, items },
      jsonGeneratorModel
    );

    const itemsRecord = Object.fromEntries(items.map((i) => [i.id, i]));
    const skillsRecord = Object.fromEntries(skills.map((s) => [s.id, s]));
    const actorsRecord = Object.fromEntries(actors.map((a) => [a.id, a]));
    const roomsRecord = Object.fromEntries(rooms.map((r) => [r.id, r]));

    // --- ID VALIDATION PHASE ---
    // Ensure all actors only reference items and skills that actually exist
    for (const actor of actors) {
      actor.itemIds = actor.itemIds.filter((id) => {
        if (!itemsRecord[id]) {
          console.warn(`Validation Error: Actor ${actor.name} (${actor.id}) references missing item ID: ${id}`);
          return false;
        }
        return true;
      });
      actor.skillIds = actor.skillIds.filter((id) => {
        if (!skillsRecord[id]) {
          console.warn(`Validation Error: Actor ${actor.name} (${actor.id}) references missing skill ID: ${id}`);
          return false;
        }
        return true;
      });
    }

    // Ensure all rooms only reference actors and items that actually exist
    for (const room of rooms) {
      room.actorIds = room.actorIds.filter((id) => {
        if (!actorsRecord[id]) {
          console.warn(`Validation Error: Room ${room.name} (${room.id}) references missing actor ID: ${id}`);
          return false;
        }
        return true;
      });
      room.itemIds = room.itemIds.filter((id) => {
        if (!itemsRecord[id]) {
          console.warn(`Validation Error: Room ${room.name} (${room.id}) references missing item ID: ${id}`);
          return false;
        }
        return true;
      });
      room.hiddenItemIds = room.hiddenItemIds.filter((id) => {
        if (!itemsRecord[id]) {
          console.warn(`Validation Error: Room ${room.name} (${room.id}) references missing hidden item ID: ${id}`);
          return false;
        }
        return true;
      });
    }

    // Build the Dungeon Map (Linear Path: Room 0 <-> Room 1 <-> Room 2)
    const roomNodes: Record<string, string[]> = {};
    for (let i = 0; i < rooms.length; i++) {
      const currentId = rooms[i].id;
      roomNodes[currentId] = [];
      // Link to previous room
      if (i > 0) roomNodes[currentId].push(rooms[i - 1].id);
      // Link to next room
      if (i < rooms.length - 1) roomNodes[currentId].push(rooms[i + 1].id);
    }

    // Find the Safe Room to set as the respawn point
    const safeRoomId = rooms.find((r) => r.isSafe)?.id || rooms[0].id;
    const startingRoomId = rooms[0].id;

    // Define the default Player stat block based on the generated level
    const defaultPlayer: Player = {
      id: "player_1",
      name: "Thevin",
      characterClass: playerClass,
      level: level,
      xp: 0,
      hp: 15 + level * 5,
      maxHp: 15 + level * 5,
      ac: 13,
      credits: 10,
      mods: {
        strength: 0,
        dexterity: 3,
        constitution: 1,
        intelligence: 2,
        wisdom: 0,
        charisma: 1
      },
      itemIds: [],
      skillIds: [],
      equippedWeaponId: undefined,
      equippedArmorId: undefined
    };

    // ==========================================
    // PHASE 5: Assemble the Global State
    // ==========================================
    const initialState: GameState = {
      player: defaultPlayer,
      currentRoomId: startingRoomId,
      creditDropRoomId: safeRoomId,

      currentTurn: 0,
      isInCombat: false,

      skills: skillsRecord,
      items: itemsRecord,
      actors: actorsRecord,
      rooms: roomsRecord,

      roomNodes: roomNodes,
      sceneImageBase64: "", // Start with an empty image, the engine can generate it on the fly based on the current room and actors
      flags: {
        isGameOver: false
      }
    };

    return initialState;
  } catch (error) {
    console.error("Critical error during game state initialization:", error);
    // Re-throw the error with a more descriptive message if it's not already one of our custom ones
    if (error instanceof Error && error.message.includes("Failed to generate")) {
      throw error;
    }
    throw new Error(`Critical error during game state initialization: ${error instanceof Error ? error.message : String(error)}`);
  }
}
