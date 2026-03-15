// actions/attack.ts
import { type GameState, type Actor } from "../types/game";
import { parseAndRoll } from "../utils/dice";

export function attackAction(state: GameState, targetActorId: string): string {
  const room = state.rooms[state.currentRoomId];
  const target: Actor = state.actors[targetActorId];
  const player = state.player;

  if (!room.actorIds.includes(targetActorId) || !target) {
    return `Action failed: Target not found in room.`;
  }

  let log = "";
  state.isInCombat = true;

  // --- PLAYER ATTACK PHASE ---
  // Determine player's weapon and modifier
  const weapon = player.equippedWeaponId
    ? state.items[player.equippedWeaponId]
    : null;
  const statKey = weapon?.mod || "strength";
  const modValue = player.mods[statKey] || 0;

  // D20 Attack Roll
  const attackRoll = Math.floor(Math.random() * 20) + 1 + modValue;

  if (attackRoll >= target.ac) {
    // Hit!
    const damageDice = weapon?.dice || "1d4"; // Unarmed strike defaults to 1d4
    const damage = parseAndRoll(damageDice, modValue);
    target.hp -= damage;
    log += `HIT! Player rolled ${attackRoll} against AC ${target.ac}. Dealt ${damage} damage to ${target.name}. `;

    if (target.hp <= 0) {
      log += `ENEMY SLAIN! ${target.name} drops to the floor. `;
      // Drop enemy items into the room
      if (target.itemIds && target.itemIds.length > 0) {
        room.itemIds.push(...target.itemIds);
        log += `Dropped loot: ${target.itemIds.join(", ")}. `;
      }
      // Remove dead actor from room
      room.actorIds = room.actorIds.filter((id) => id !== targetActorId);
    }
  } else {
    log += `MISSED! Player rolled ${attackRoll} against AC ${target.ac}. `;
  }

  // --- ENEMY RETALIATION PHASE ---
  const remainingHostiles = room.actorIds
    .map((id) => state.actors[id])
    .filter((actor) => actor && actor.isHostile && actor.hp > 0);

  if (remainingHostiles.length === 0) {
    state.isInCombat = false;
    log += "Combat has ended.";
    return log;
  }

  for (const hostile of remainingHostiles) {
    // Simplistic enemy attack (assumes standard melee using strength)
    const eMod = hostile.mods.strength || 0;
    const eAttackRoll = Math.floor(Math.random() * 20) + 1 + eMod;

    if (eAttackRoll >= player.ac) {
      // Hardcoded 1d6 for generic enemies for now, or check hostile.itemIds if you want to get fancy!
      const eDamage = parseAndRoll("1d6", eMod);
      player.hp -= eDamage;
      log += `${hostile.name} attacks and HITS for ${eDamage} damage! `;
    } else {
      log += `${hostile.name} attacks and MISSES. `;
    }
  }

  if (player.hp <= 0) {
    state.flags.isGameOver = true;
    log += "PLAYER HAS DIED.";
  }

  // Advance the global clock
  state.currentTurn += 1;

  return log;
}
