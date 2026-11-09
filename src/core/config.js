/* Every balance knob lives here. */
export const CONFIG = {
  PLAYER_MAX_HP: 150, MAX_CARTS: 3, MAX_ITEMS_PER_TURN: 3,
  // Sharpness: Green 26–40 ×1.2/+10 hit | Yellow 13–25 ×1.0 | Red 0–12 BOUNCE ×0.5/−10 hit + 5% recoil
  SHARP_MAX: 40, SHARP_GREEN: 26, SHARP_YELLOW: 13, BOUNCE_RECOIL_PCT: 0.05,
  OVERALL_HIT: 90, MONSTER_HIT: 60, MONSTER_HIT_FLASHED: 30,
  MIGHT_MULT: 1.25, WAKE_MULT: 2, GUARD_TAKEN: 0.4, HEAVY_INTERRUPT_CHANCE: 0.30,
  TAIL_ATK_MULT: 0.75, BODY_CRACK_MULT: 1.10,
  WHETSTONE_SHARP: 15,              // sharpness restored per whetstone (max 40)
  CRIT_MULT: 1.5,
  CRIT_NEG_MULT: 0.5,
  BASE_DEF: 10,          // hunter's defense without armor
  CHARGE_MAX: 2,
  CHARGE_LV1_MULT: 2,
  OVERCHARGE_MULT: 0.8,
  MOVE_SLOTS: 4,
  GUARDABLE: ['stun', 'tremor', 'wind', 'roar'],   // blocked by a successful dodge/block/counter

  // Big monster: fleeing mid-battle, limping, sleeping, healing
  FLEE_MIN: 4, FLEE_MAX: 6, FLEE_CHANCE: 0.5, LOW_HP_FLEE: 0.25, LOW_HP_FLEE_CHANCE: 0.4,
  SLEEP_AFTER_TURNS: 3,    // a limping monster sleeps after 3 turns (any kind) without being found
  REST_HEAL_PCT: 0.03,     // healed per world turn ONLY while asleep
  WAKE_AFTER: 6,           // world turns of sleep before it wakes on its own

  // Roaming on the field (real time)
  ROAM_MIN_MS: 20000, ROAM_MAX_MS: 35000,   // big monster changes area every 20–35 s
  SMALL_ROAM_RADIUS: 8,                     // tiles a small monster may wander from home

  // Large-monster phases
  BOSS_LOW_HP: 0.4,                       // "low health" for enrage frequency and quick fleeing
  ENRAGE_CHANCE: 0.12, ENRAGE_CHANCE_LOW: 0.35,
  ENRAGE_TURNS: [6, 12], ENRAGE_MAX: 15,
  ENRAGE_COOLDOWN: 4, ENRAGE_COOLDOWN_LOW: 1,
  ENRAGE_ATK: 1.3, ENRAGE_SPD: 1.25, ENRAGE_HUNTER_ACC: -12,
  FATIGUE_TURNS: [4, 8], FATIGUE_MAX: 8, FATIGUE_SKIP: 0.15,
  FATIGUE_SPD: 0.75, FATIGUE_DMG_TAKEN: 1.2, FATIGUE_HUNTER_ACC: 15,
  // Fleeing: FLEE_MIN/FLEE_MAX (existing) now apply only when tired or at low HP
  FLEE_LONG_MIN: 10, FLEE_LONG_MAX: 15,

  // Traps & capture
  CAPTURE_PCT: 0.15, TRAP_TURNS_FIRST: 3, TRAP_TURNS_AFTER: 2, TRAP_HIT_BONUS: 25, TRANQ_NEEDED: 2,

  // Stun. Hunter: % added per consecutive hit taken, capped. Monsters: blunt weapons only (KO).
  STUN_BUILD: 6, STUN_BUILD_HEAVY: 12, STUN_CAP: 30,
  KO_BUILD: 10, KO_BUILD_HEAD: 25,

  // Speed (battle/speed.js)
  HUNTER_SPEED: 100, SLOW_SPEED_MULT: .5,
  SPEED_HIT_FACTOR: .25, SPEED_HIT_CAP: 15, SPEED_ESCAPE_FACTOR: .005,

  // Rewards
  CARVES: 3, SMALL_CARVES: 1, TAIL_CARVES: 1, MAIN_REWARDS: 4, CAPTURE_MAIN_REWARDS: 5, CAPTURE_BONUS: 3, CAPTURE_ZENNY_MULT: 1.2,

  // Field movement: ms per tile at speed 100 (scaled by speed). Chasing monsters stay faster than the hunter.
  MOVE_MS: 140, BOSS_CHASE_MS: 105, SMALL_CHASE_MS: 115, WANDER_MS: 300,
  ESCAPE_CHANCE: 0.75, GRACE_MS: 2500, BOSS_AGGRO: 5, GATHER_USES: 2, FARM_USES: 1, START_ZENNY: 1500,

  // Text
  TEXT_SPEED: 14, AUTO_ADVANCE: 900, AUTO: true,

  // Item management
  POUCH_PAGES: 3, POUCH_PAGE_SIZE: 8,     // 24 slots, one item kind per slot
  STACK_DEFAULT: 10,
  STACK: {},                              // per-item overrides, e.g. { whetstone: 20, HONEY: 5 }
  CRAFT_POUCH_SUCCESS: 0.7,               // combining at the ITEM BOX always succeeds

  // Timing meter (monster attacks)
  METER: true,                                    // false = old hit-chance roll
  METER_KEYS: 'WASD',
  METER_SLOW_MS: 2600, METER_FAST_MS: 110,        // one sweep: very slow … impossible
  METER_SPEED_MED: .4, METER_SPEED_LEAN: .25,     // typical roll; how far a speed gap leans rolls
  METER_SPEED_SENS: 2.5, METER_SPEED_CUT: .6,     // speed gap → how much of the range is cut (max 60%)
  METER_MIN_ZONE: .004,                           // ≈ one pixel
  METER_ZONE_MED: .6, METER_ACC_SCALE: 30, METER_ACC_W: .25, METER_DANGER_W: .5,
  METER_FLASH_BONUS: .2, METER_STUCK_PENALTY: .3,
  METER_LEAD_MS: 450, METER_RESULT_MS: 380,
  GUARD_PERFECT_SHARP: .5,                        // perfect guard pays half the sharpness cost
  COUNTER_MULT: 1.5,                              // counter strike power
  METER_ROAR_DANGER: .5,
  WAKE_METER_SPEED_MAX: .35,       // wake-up meter: slow pointer…
  WAKE_METER_ZONE_MED: .65,        // …and a big zone
  // Meter difficulty by monster size: speedMax = fastest part of the range allowed,
  // danger = how much move danger counts, zone = zone-size bonus
  METER_SMALL: { speedMax: .70, danger: .70, zone: .08 },
  METER_LARGE: { speedMax: .85, danger: .85, zone: .04 },
  NEST_SLEEP_TURNS: 3, NEST_HEAL: .2,        // NEST_AREA: your nest area id, if monsters have no m.nest
  PAINT_DMG: 1,
  BATTLE_COMBINE_PAGE: 6,

  DEBUG_LOG: true,       // hidden numbers go to the browser console (F12); false = silent
};

// Great Sword: Charge, Charge, then Release on turn 3 = Lv3 (3×)
export const CHARGE_MULT = [1, 2, 3];