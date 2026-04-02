import { type GameState } from "../types/game";

const initialState: GameState = {
    // --- Global State ---
    currentTurn: 0,
    currentRoomId: "",
    creditDropRoomId: undefined, // Added to track death drops
    isInCombat: false,
    status: "setup",

    player: {
        id: "player_1",
        name: "Thevin",
        characterClass: "Rogue",
        level: 1,
        xp: 0,
        hp: 15,
        maxHp: 15,
        ac: 13,
        credits: 10,
        mods: {
            strength: -1,
            dexterity: 3,
            constitution: 1,
            intelligence: 2,
            wisdom: 0,
            charisma: 1,
        },
        itemIds: [],
        skillIds: [],
        equippedWeaponId: undefined,
        equippedArmorId: undefined,
    },

    actors: {
        actor_hub_guide: {
            id: "actor_hub_guide",
            name: "The Keeper",
            characterClass: "Guide", // Required by Creature interface
            hp: 100,
            maxHp: 100,
            ac: 20,
            // Changed raw stats to modifiers (10 = 0, 20 = +5)
            mods: {
                strength: -5,
                dexterity: -5,
                constitution: 0,
                intelligence: 5,
                wisdom: 5,
                charisma: 5,
            },
            description: "A serene, timeless figure bound to the sanctuary. Facilitates leveling up.",
            role: "generic", // Fixed syntax error and mapped to valid Role
            isHostile: false,
            coreMemories: [],
            itemIds: [],
            skillIds: [],
            // (Note: If you kept coreMemories/recentDialogue in your Actor type, add them back here)
        },
        actor_wandering_trader: {
            id: "actor_wandering_trader",
            name: "The Peddler",
            characterClass: "Merchant",
            hp: 50,
            maxHp: 50,
            ac: 15,
            mods: {
                strength: 0,
                dexterity: 2,
                constitution: 1,
                intelligence: 2,
                wisdom: 3,
                charisma: 4,
            },
            description: "A mysterious merchant carrying a massive backpack.",
            role: "trader",
            isHostile: false,
            coreMemories: [],
            itemIds: [],
            skillIds: [],
        },
        enemy_goblin_thief: {
            id: "enemy_goblin_thief",
            name: "Goblin Thief",
            characterClass: "Scavenger",
            hp: 7,
            maxHp: 7,
            ac: 12,
            mods: {
                strength: -1,
                dexterity: 2,
                constitution: 0,
                intelligence: 0,
                wisdom: -1,
                charisma: -1,
            },
            description: "A scrawny, green-skinned scavenger wielding a rusted blade.",
            role: "enemy",
            isHostile: true,
            coreMemories: [],
            itemIds: [],
            skillIds: [],
        },
    },

    items: {},

    rooms: {
        room_sanctuary: {
            id: "room_sanctuary",
            name: "The Sanctuary", // Renamed from roomName
            description: "A world between worlds where the player can escape to. A quaint small establishment with a garden, a fountain and small house shrouded in mist.",
            isSafe: true, // Renamed from isSafeRoom
            itemIds: ["prop_mystical_fog"], // Mapped to the global items registry
            hiddenItemIds: [],
            actorIds: ["actor_hub_guide"], // Renamed from presentActorIds
        },
    },

    skills: {},

    roomNodes: {},

    flags: {
        // Renamed from worldFlags
        isGameOver: false, // Moved this from root level to flags
    },
    sceneImageBase64: null, // Moved this from root level to flags
};

export default initialState;
