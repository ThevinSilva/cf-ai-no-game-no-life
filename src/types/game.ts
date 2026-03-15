// ---------------------------------------------------------
// CORE TYPES
// ---------------------------------------------------------

type Ability =
  | "strength"
  | "dexterity"
  | "constitution"
  | "intelligence"
  | "wisdom"
  | "charisma";
type Role = "trader" | "generic" | "enemy" | "ally";
type ItemType = "weapon" | "armor" | "consumable" | "misc" | "prop";

// ---------------------------------------------------------
// ENTITIES
// ---------------------------------------------------------

interface Creature {
  id: string; // Added ID here so Player and Actors automatically inherit it
  name: string;
  characterClass: string; // E.g., "Mercenary", "Hacker", "Fighter"
  hp: number;
  maxHp: number;
  ac: number;
  mods: Record<Ability, number>; // Storing modifiers directly is great for AI games!
}

interface Player extends Creature {
  level: number;
  xp: number;
  credits: number; // Sci-fi/Cyberpunk vibes? Love it.

  itemIds: string[]; // Inventory
  skillIds: string[]; // Equipped or known skills

  // You likely need to know what they are actively holding to calculate standard attacks
  equippedWeaponId?: string;
  equippedArmorId?: string;
}

interface Actor extends Creature {
  description: string;
  isHostile: boolean;
  role: Role;
  coreMemories: string[];
  itemIds: string[];
  skillIds: string[];
}

// ---------------------------------------------------------
// ENVIRONMENT
// ---------------------------------------------------------

interface Room {
  id: string; // Added ID so the roomNodes adjacency list can reference it
  name: string;
  description: string;
  isSafe: boolean;
  itemIds: string[];
  hiddenItemIds: string[];
  actorIds: string[];
}

// ---------------------------------------------------------
// MECHANICS (Items & Skills)
// ---------------------------------------------------------

interface Item {
  id: string;
  name: string;
  description: string;
  value: number;
  type: ItemType;

  // IMPORTANT: These must be optional (?).
  // A healing potion shouldn't require an 'ac' property!
  dice?: string;
  mod?: Ability;
  ac?: number;
}

interface Skill {
  id: string;
  name: string;
  description: string;

  // Added these so the engine can calculate the skill's effect
  dice?: string; // e.g., "2d6"
  mod?: Ability; // e.g., "strength"

  cooldown: number; // Cooldown in turns
  lastUsedTurn: number; // The turn number when the skill was last used. -1 if never used.
}

// ---------------------------------------------------------
// GLOBAL STATE
// ---------------------------------------------------------

interface GameState {
  player: Player;
  currentRoomId: string;
  creditDropRoomId?: string;

  // GLOBAL CLOCK: You MUST have this if you are using 'lastUsedTurn' in Skills!
  currentTurn: number;
  isInCombat: boolean;

  // ECS REGISTRIES:
  items: Record<string, Item>;
  skills: Record<string, Skill>;
  actors: Record<string, Actor>;
  rooms: Record<string, Room>;

  roomNodes: Record<string, string[]>;
  flags: Record<string, boolean | string | number>;
  sceneImageBase64: null | string; // For dynamic scene rendering, if you choose to implement it
}

export type {
  GameState,
  Player,
  Actor,
  Room,
  Item,
  Skill,
  Ability,
  Role,
  ItemType
};
