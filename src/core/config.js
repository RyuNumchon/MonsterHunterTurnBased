/* Every balance knob lives here. */
export const CONFIG = {
  PLAYER_MAX_HP: 150, MAX_CARTS: 3, MAX_ITEMS_PER_TURN: 3,
  // Sharpness (PP equivalent), 40 points:
  //   Green 26–40: DMG ×1.2, Hit +10 | Yellow 13–25: ×1.0 | Red 0–12: BOUNCE ×0.5, Hit −10, 5% max-HP recoil
  SHARP_MAX: 40, SHARP_GREEN: 26, SHARP_YELLOW: 13, BOUNCE_RECOIL_PCT: 0.05,
  OVERALL_HIT: 90, MONSTER_HIT: 60, MONSTER_HIT_FLASHED: 30,
  MIGHT_MULT: 1.25, WAKE_MULT: 2, GUARD_TAKEN: 0.4, HEAVY_INTERRUPT_CHANCE: 0.30,
  FLEE_MIN: 4, FLEE_MAX: 6, FLEE_CHANCE: 0.5, LOW_HP_FLEE: 0.25, LOW_HP_FLEE_CHANCE: 0.4,
  REST_HEAL_PCT: 0.03, SLEEP_CHANCE: 0.35, NEST_SLEEP_CHANCE: 0.8, WAKE_AFTER: 6, ROAM_CHANCE: 0.5,
  TAIL_ATK_MULT: 0.75, BODY_CRACK_MULT: 1.10,
  // Traps & capture
  CAPTURE_PCT: 0.25, TRAP_TURNS_FIRST: 3, TRAP_TURNS_AFTER: 2, TRAP_HIT_BONUS: 25, TRANQ_NEEDED: 2,
    // Status effects (definitions live in src/data/status.js)
  STUN_BUILD: 15, STUN_BUILD_HEAVY: 25,             // % stun chance added per consecutive hit taken
  SLOW_HIT_BONUS: 15, SLOW_ESCAPE_MULT: .5, SLOW_MOVE_MULT: 1.6,
  // Rewards
  CARVES: 3, SMALL_CARVES: 1, MAIN_REWARDS: 4, CAPTURE_MAIN_REWARDS: 5, CAPTURE_BONUS: 3, CAPTURE_ZENNY_MULT: 1.2,
  // Field movement (ms per tile). Chasing monsters are FASTER than the hunter.
  MOVE_MS: 150, BOSS_CHASE_MS: 95, SMALL_CHASE_MS: 115, WANDER_MS: 320,
  ESCAPE_CHANCE: 0.75, GRACE_MS: 2500, BOSS_AGGRO: 5, GATHER_USES: 2, START_ZENNY: 1500,
  // Text
  TEXT_SPEED: 14, AUTO_ADVANCE: 900, AUTO: true
};

// Great Sword: Charge, Charge, then Release on turn 3 = Lv3 (3×)
export const CHARGE_MULT = [1, 2, 3];