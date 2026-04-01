import { type GameState, type Player, type Ability } from "../types/game";
import generateActors from "../tools/ActorGeneration";
import generateItems from "../tools/ItemGeneration";
import generateSkills from "../tools/SkillGeneration";
import generateRooms from "../tools/RoomGeneration";
import type { LanguageModel } from "ai";

export default async function initializeGameState(setting: string, theme: string, level: number, playerClass: string, jsonGeneratorModel: LanguageModel, playerStats?: Record<Ability, number>): Promise<GameState> {
    console.time("initializeGameState");
    try {
        const [items, skills] = await Promise.all([generateItems(setting, theme, jsonGeneratorModel), generateSkills({ characterClass: playerClass, theme, level }, jsonGeneratorModel)]);

        console.log("Generated items:", items);
        console.log("Generated skills:", items);

        const actors = await generateActors({ setting, theme, level }, { items, skills }, jsonGeneratorModel);
        const rooms = await generateRooms({ setting, theme, level }, { actors, items }, jsonGeneratorModel);

        const itemsRecord = Object.fromEntries(items.map((i) => [i.id, i]));
        const skillsRecord = Object.fromEntries(skills.map((s) => [s.id, s]));
        const actorsRecord = Object.fromEntries(actors.map((a) => [a.id, a]));
        const roomsRecord = Object.fromEntries(rooms.map((r) => [r.id, r]));

        const roomNodes: Record<string, string[]> = {};
        for (let i = 0; i < rooms.length; i++) {
            const currentId = rooms[i].id;
            roomNodes[currentId] = [];
            if (i > 0) roomNodes[currentId].push(rooms[i - 1].id);
            if (i < rooms.length - 1) roomNodes[currentId].push(rooms[i + 1].id);
        }

        const safeRoomId = rooms.find((r) => r.isSafe)?.id || rooms[0].id;
        const startingRoomId = rooms[0].id;

        const defaultPlayer: Player = {
            id: "player_1",
            name: "Thevin",
            characterClass: playerClass,
            level: level,
            xp: 0,
            hp: 20 + (playerStats?.constitution || 0) * 5, // HP scaled by CON
            maxHp: 20 + (playerStats?.constitution || 0) * 5,
            ac: 10 + (playerStats?.dexterity || 0), // AC scaled by DEX
            credits: 50,
            mods: playerStats || {
                strength: 0,
                dexterity: 0,
                constitution: 0,
                intelligence: 0,
                wisdom: 0,
                charisma: 0,
            },
            itemIds: [], // Empty as requested
            skillIds: [], // Empty as requested
            equippedWeaponId: undefined,
            equippedArmorId: undefined,
        };

        const initialState: GameState = {
            status: "playing",
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
                isGameOver: false,
            },
        };

        return initialState;
    } catch (error) {
        console.error("Critical error during game state initialization:", error);
        // Re-throw the error with a more descriptive message if it's not already one of our custom ones
        if (error instanceof Error && error.message.includes("Failed to generate")) {
            throw error;
        }
        throw new Error(`Critical error during game state initialization: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
        console.timeEnd("initializeGameState");
    }
}
