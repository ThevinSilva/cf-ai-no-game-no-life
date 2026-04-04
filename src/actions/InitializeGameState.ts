import type { GameState, Player, GenerationConfig } from "../types/game";
import generateActors from "../tools/ActorGeneration";
import generateItems from "../tools/ItemGeneration";
import generateSkills from "../tools/SkillGeneration";
import generateRooms from "../tools/RoomGeneration";
import generateSpecSheet from "../tools/SpecSheetGeneration";

export default async function initializeGameState({ setting, theme, level, characterClass, jsonGeneratorModel, stats, name }: GenerationConfig): Promise<GameState> {
    try {
        const specSheet = await generateSpecSheet({ name, setting, theme, level, characterClass, jsonGeneratorModel, stats });
        const [items, skills, actors, rooms] = await Promise.all([generateItems(specSheet, jsonGeneratorModel), generateSkills(specSheet, jsonGeneratorModel), generateActors(specSheet, jsonGeneratorModel), generateRooms(specSheet, jsonGeneratorModel)]);
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
            name,
            characterClass,
            level,
            xp: 0,
            hp: 20 + (stats?.constitution || 0) * 5,
            maxHp: 20 + (stats?.constitution || 0) * 5,
            ac: 10 + (stats?.dexterity || 0),
            credits: 50,
            mods: stats || {
                strength: 0,
                dexterity: 0,
                constitution: 0,
                intelligence: 0,
                wisdom: 0,
                charisma: 0,
            },
            itemIds: [],
            skillIds: [],
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
            sceneImageBase64: "",
            flags: {
                isGameOver: false,
            },
        };

        return initialState;
    } catch (error) {
        console.error("Critical error during game state initialization:", error);
        if (error instanceof Error && error.message.includes("Failed to generate")) {
            throw error;
        }
        throw new Error(`Critical error during game state initialization: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
        console.timeEnd("initializeGameState");
    }
}
