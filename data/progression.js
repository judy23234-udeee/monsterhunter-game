// ============================================================
// 성장 시스템 설정표 (GAME_DESIGN.md 13장)
//   STAGES · MONSTERS · HUNTERS · SKILLS · EQUIPMENT · MATERIALS · ITEMS · VILLAGE_UPGRADES
// 모든 수치는 여기서만 바꾼다 (CLAUDE.md 2장). 불러올 때 validateProgression()이 서로 맞는지 검사한다.
// 단위: 시간 = 초, 골드 = G, 배율 = 1.0 기준
// ============================================================

// ---------- 재료 (13-3-2) ----------
export const MATERIALS = {
  ASH_JOINT:     { name: '잿빛 관절석', source: '바르그 앞발 손목 파괴', rarity: 'common', color: 0x8a8d93 },
  ASH_FUR:       { name: '잿빛 꼬리털', source: '바르그 꼬리 뿌리 파괴', rarity: 'common', color: 0x55585e },
  VARG_FANG:     { name: '바르그 송곳니', source: '바르그 처치', rarity: 'rare', color: 0xefe3c0 },
  GIANT_CLAW:    { name: '거인의 발톱', source: '오르굼 발꿈치 파괴', rarity: 'common', color: 0xe8e2d0 },
  JOINT_CRYSTAL: { name: '관절 결정', source: '오르굼 무릎 파괴', rarity: 'common', color: 0x8fd0ff },
  TAIL_SHELL:    { name: '꼬리 갑각', source: '오르굼 꼬리 끝 파괴', rarity: 'common', color: 0xb48cff },
  GIANT_CORE:    { name: '거인의 심핵', source: '오르굼 처치', rarity: 'rare', color: 0x2f8f8f },
  IRON_SEG:      { name: '철갑 마디', source: '칼콘 다리 관절 파괴', rarity: 'common', color: 0x2b3a4a },
  KALKON_CORE:   { name: '칼콘 심핵', source: '칼콘 몸통 핵 파괴', rarity: 'rare', color: 0x3d6fd0 },
  STORM_PLUME:   { name: '폭풍 꼬리깃', source: '세라프 꼬리 끝 파괴', rarity: 'common', color: 0xdfeefa },
  SERAPH_TALON:  { name: '세라프 발톱', source: '세라프 착지 발 파괴', rarity: 'common', color: 0xc0c8d0 },
  STORM_SCALE:   { name: '폭풍 비늘', source: '세라프 처치', rarity: 'rare', color: 0x8cc8f0 },
  FOREST_HOOF:   { name: '숲왕 발굽', source: '엘크로 발목 파괴', rarity: 'common', color: 0x5f8f4a },
  OLD_JOINT:     { name: '고목 관절', source: '엘크로 역관절 파괴', rarity: 'common', color: 0x7a5a3a },
  CROWN_ANTLER:  { name: '왕관 뿔', source: '엘크로 처치', rarity: 'ancient', color: 0xe3c35a },
  MURGA_SCALE:   { name: '마디 비늘', source: '무르가 마디 막 파괴', rarity: 'common', color: 0x2f4a30 },
  MURGA_RATTLE:  { name: '울림 방울', source: '무르가 꼬리 방울 파괴 · 처치', rarity: 'rare', color: 0x9fe060 },
  CAP_SHARD:     { name: '갓 결정', source: '녹투르나 촉수 끝 파괴', rarity: 'common', color: 0xb8e8ff },
  ABYSS_CORE:    { name: '심연 핵', source: '녹투르나 처치', rarity: 'ancient', color: 0x5a3a7a },
  ANCIENT_SHARD: { name: '고대 핵편', source: '재도전(강화·고대) 처치', rarity: 'ancient', color: 0xf0a030 },
  IRON_ORE:      { name: '철광석', source: '채집, 마을 공급', rarity: 'common', color: 0x8a8a8a },
  WOOD:          { name: '목재', source: '채집, 마을 공급', rarity: 'common', color: 0x8a5a36 },
  HERB:          { name: '약초', source: '채집', rarity: 'common', color: 0x6fa344 },
};

// ---------- 몬스터 7종 (6장 v0.6) ----------
// 단계마다 다른 종. 같은 종의 색·크기 변형(VARIANTS)은 재도전에서만 쓴다 (STAGES.RECHALLENGE).
//   BASE_HP: 6-8 기본 체력. SPEED_K: 이동 속도 배율. 크기는 단계별 MONSTER_SCALE (아래)
//   MODEL: 이 종의 GLB 경로 — 종마다 다른 파일, 다른 단계와 같이 쓰지 않는다 (검사함). 파일이 없거나 실패·10초 초과면 임시 도형으로 폴백
//   임시 도형(폴백) 모습: BODY 체형 (index.html MONSTER_CONFIG.SHAPES의 키) · COLOR 몸 색 · EYE 눈 발광 색(RGB, 1 넘으면 번짐) · GLOW 발광 부위 색
//          → 단계마다 체형·색·눈 색·크기가 모두 달라 에셋 없이도 구별된다 (검사함)
//   GLB 뼈 이름 규칙 (6-10): 약점 = weak_<PARTS id>, 발 = foot_l·foot_r, 눈 = eye_l·eye_r
//   INTRO: 등장 예고 연출 강도 1~5 (6-0). GLOW: 발광 부위 색 (험악도)
//   PATTERNS[].proto: 프로토타입 동작('slam' 내려찍기 / 'charge' 돌진). null이면 기믹(GIMMICK)이 대신하거나 아직 없음
//   PARTS: 약점 부위 { 이름, 재료, kind(claw·knee·tail·core — 스킬 트리 partBonus 키), 체력, 배율,
//          effect('slow' 이동 느려짐 · 'stomp' 밟기 약해짐 · 'chain' 칼콘 연쇄 · 'phase' 녹투르나 2단계), hidden(기믹으로만 노출) }
//   GIMMICK: 종마다 하나뿐인 기믹과 수치 (시간 = 초, 거리 = 유닛)
export const MONSTERS = {
  SPECIES: {
    varg: {
      name: '잿빛 사냥개 바르그', short: '바르그', BASE_HP: 6000, SPEED_K: 1.6, BODY: 'quad', INTRO: 1, RAGE_AT: 0.5,
      COLOR: 0x2a2c30, EYE: [2.6, 1.3, 0.15], GLOW: null, MODEL: 'assets/build/monsters/varg.glb',
      PATTERNS: [
        { key: 'charge', name: '돌진', proto: 'charge' },
        { key: 'claw', name: '할퀴기 2연', proto: 'slam' },
        { key: 'ambush', name: '매복', proto: null, gimmick: true },
      ],
      PARTS: {
        clawL: { name: '왼 앞발 손목', drop: 'ASH_JOINT', kind: 'claw', hp: 260, mult: 1.8, effect: 'stomp' },
        clawR: { name: '오른 앞발 손목', drop: 'ASH_JOINT', kind: 'claw', hp: 260, mult: 1.8, effect: 'stomp' },
        kneeL: { name: '왼 뒷다리 관절', drop: 'ASH_JOINT', kind: 'knee', hp: 320, mult: 2.0, effect: 'slow' },
        kneeR: { name: '오른 뒷다리 관절', drop: 'ASH_JOINT', kind: 'knee', hp: 320, mult: 2.0, effect: 'slow' },
        tail: { name: '꼬리 뿌리', drop: 'ASH_FUR', kind: 'tail', hp: 280, mult: 2.2 },
      },
      KILL_DROP: { material: 'VARG_FANG', base: 1, extraChance: 0.5, firstGuaranteed: true },
      GIMMICK: { type: 'ambush', name: '매복', AT: [0.7, 0.4], FADE: 0.8, HIDE: [4, 6], SIDE: 7, WIND_K: 0.6 },
      RE_PATTERNS: ['분노 시 돌진 2연속', '매복 2번 연속'],
    },
    kalkon: {
      name: '철갑 다리게 칼콘', short: '칼콘', BASE_HP: 8000, SPEED_K: 1.1, BODY: 'crab', INTRO: 2, RAGE_AT: 0.5,
      COLOR: 0x101820, EYE: [0.3, 2.4, 2.2], GLOW: 0x3fd0c8, MODEL: 'assets/build/monsters/kalkon.glb',
      PATTERNS: [
        { key: 'legs', name: '다리 찍기 연타', proto: 'slam' },
        { key: 'spin', name: '회전', proto: 'charge' },
        { key: 'sand', name: '모래 분사', proto: null },
      ],
      PARTS: {
        legL1: { name: '왼 앞다리 관절', drop: 'IRON_SEG', kind: 'knee', hp: 200, mult: 1.6, effect: 'chain', side: 'L' },
        legL2: { name: '왼 둘째 다리 관절', drop: 'IRON_SEG', kind: 'knee', hp: 200, mult: 1.6, effect: 'chain', side: 'L' },
        legL3: { name: '왼 셋째 다리 관절', drop: 'IRON_SEG', kind: 'knee', hp: 200, mult: 1.6, effect: 'chain', side: 'L' },
        legL4: { name: '왼 뒷다리 관절', drop: 'IRON_SEG', kind: 'knee', hp: 200, mult: 1.6, effect: 'chain', side: 'L' },
        legR1: { name: '오른 앞다리 관절', drop: 'IRON_SEG', kind: 'knee', hp: 200, mult: 1.6, effect: 'chain', side: 'R' },
        legR2: { name: '오른 둘째 다리 관절', drop: 'IRON_SEG', kind: 'knee', hp: 200, mult: 1.6, effect: 'chain', side: 'R' },
        legR3: { name: '오른 셋째 다리 관절', drop: 'IRON_SEG', kind: 'knee', hp: 200, mult: 1.6, effect: 'chain', side: 'R' },
        legR4: { name: '오른 뒷다리 관절', drop: 'IRON_SEG', kind: 'knee', hp: 200, mult: 1.6, effect: 'chain', side: 'R' },
        core: { name: '몸통 핵', drop: 'KALKON_CORE', kind: 'core', hp: 420, mult: 2.6, hidden: true },
      },
      KILL_DROP: { material: 'KALKON_CORE', base: 1, extraChance: 0, chance: 0.3, firstGuaranteed: false },
      GIMMICK: { type: 'chain', name: '부위 연쇄', LEGS: 2, EXPOSE: 6, TILT: 0.35 },
      RE_PATTERNS: ['회전 2바퀴', '핵 노출 시간 6 → 4초'],
    },
    orgum: {
      name: '회색 거인 오르굼', short: '오르굼', BASE_HP: 9000, SPEED_K: 1.0, BODY: 'biped', INTRO: 3, RAGE_AT: 0.4,
      COLOR: 0x15171b, EYE: [2.4, 2.4, 2.3], GLOW: null, MODEL: 'assets/build/monsters/orgum.glb',
      PATTERNS: [
        { key: 'stomp', name: '밟기', proto: 'slam' },
        { key: 'sweep', name: '손 쓸기', proto: 'slam' },
        { key: 'grab', name: '들여다보기→잡기', proto: null, gimmick: true },
      ],
      PARTS: {
        clawL: { name: '왼 발꿈치', drop: 'GIANT_CLAW', kind: 'claw', hp: 260, mult: 1.8, effect: 'stomp' },
        clawR: { name: '오른 발꿈치', drop: 'GIANT_CLAW', kind: 'claw', hp: 260, mult: 1.8, effect: 'stomp' },
        kneeL: { name: '왼 무릎', drop: 'JOINT_CRYSTAL', kind: 'knee', hp: 320, mult: 2.0, effect: 'slow' },
        kneeR: { name: '오른 무릎', drop: 'JOINT_CRYSTAL', kind: 'knee', hp: 320, mult: 2.0, effect: 'slow' },
        tail: { name: '꼬리 끝', drop: 'TAIL_SHELL', kind: 'tail', hp: 280, mult: 2.2 },
      },
      KILL_DROP: { material: 'GIANT_CORE', base: 1, extraChance: 0, chance: 0.3, firstGuaranteed: true },
      GIMMICK: { type: 'grab', name: '들여다보기→잡기', CHANCE: 0.35, MIN_DIST: 3, MAX_DIST: 9, WIND: 2.0, LEAN: 0.9, R: 2.4, DMG_K: 1.1, HOLD: 1.6, MASH: 0.2 },
      RE_PATTERNS: ['밟기 2연속', '잡기 직후 손 쓸기'],
    },
    murga: {
      name: '땅울림 뱀 무르가', short: '무르가', BASE_HP: 10000, SPEED_K: 1.3, BODY: 'serpent', INTRO: 3, RAGE_AT: 0.4,
      COLOR: 0x1a2a1c, EYE: [1.4, 2.8, 0.4], GLOW: 0x9fe060, MODEL: 'assets/build/monsters/murga.glb',
      PATTERNS: [
        { key: 'coil', name: '몸 휘감기', proto: 'slam' },
        { key: 'rattle', name: '꼬리 방울', proto: 'slam' },
        { key: 'burrow', name: '솟구치기', proto: null, gimmick: true },
      ],
      PARTS: {
        seg1: { name: '앞 마디 막', drop: 'MURGA_SCALE', kind: 'knee', hp: 260, mult: 1.8, effect: 'slow' },
        seg2: { name: '가운데 마디 막', drop: 'MURGA_SCALE', kind: 'knee', hp: 260, mult: 1.8 },
        seg3: { name: '뒤 마디 막', drop: 'MURGA_SCALE', kind: 'knee', hp: 260, mult: 1.8 },
        rattle: { name: '꼬리 방울', drop: 'MURGA_RATTLE', kind: 'tail', hp: 300, mult: 2.2 },
        jaw: { name: '턱 아래', drop: 'MURGA_SCALE', kind: 'claw', hp: 240, mult: 1.6, hidden: true },
      },
      KILL_DROP: { material: 'MURGA_RATTLE', base: 1, extraChance: 0.3, firstGuaranteed: true },
      GIMMICK: { type: 'burrow', name: '땅속 잠행', EVERY: [9, 13], SINK: 1.0, TUNNEL: [3, 5], SPEED: 7, CRACK_EVERY: 0.12, WIND: 1.2, RISE: 0.35, R: 3.5, DMG_K: 1.3, STAGGER: 2.2, HOUSE_R: 2.5 },
      RE_PATTERNS: ['균열선 2개 (하나는 가짜)', '휘감기 범위 1.3배'],
    },
    seraph: {
      name: '폭풍날개 세라프', short: '세라프', BASE_HP: 11000, SPEED_K: 1.3, BODY: 'wyvern', INTRO: 4, RAGE_AT: 0.4,
      COLOR: 0x1c2230, EYE: [0.4, 1.2, 3.0], GLOW: 0x7fc8ff, MODEL: 'assets/build/monsters/seraph.glb',
      PATTERNS: [
        { key: 'tail', name: '꼬리 휘두르기', proto: 'slam' },
        { key: 'dive', name: '활공 낙하', proto: 'charge' },
        { key: 'gust', name: '날개 돌풍', proto: null },
      ],
      PARTS: {
        clawL: { name: '왼 착지 발', drop: 'SERAPH_TALON', kind: 'claw', hp: 260, mult: 1.8, effect: 'stomp' },
        clawR: { name: '오른 착지 발', drop: 'SERAPH_TALON', kind: 'claw', hp: 260, mult: 1.8, effect: 'stomp' },
        wingL: { name: '왼 날개 관절', drop: 'SERAPH_TALON', kind: 'knee', hp: 300, mult: 2.0, effect: 'slow' },
        wingR: { name: '오른 날개 관절', drop: 'SERAPH_TALON', kind: 'knee', hp: 300, mult: 2.0, effect: 'slow' },
        tail: { name: '꼬리 끝', drop: 'STORM_PLUME', kind: 'tail', hp: 280, mult: 2.2 },
      },
      KILL_DROP: { material: 'STORM_SCALE', base: 1, extraChance: 0.5, firstGuaranteed: true },
      GIMMICK: { type: 'flight', name: '공중 단계', AT: [0.6, 0.3], RISE: 1.2, TIME: 15, HEIGHT: 8, AIM: 2.0, DROP: 0.35, R: 3.5, DMG_K: 1.0, GROUND: 1.0, LAND_STAGGER: 2.5 },
      RE_PATTERNS: ['활공 낙하 2회', '공중 단계 15 → 20초'],
    },
    elkro: {
      name: '숲의 왕관 엘크로', short: '엘크로', BASE_HP: 13000, SPEED_K: 1.2, BODY: 'stilt', INTRO: 4, RAGE_AT: 0.3,
      COLOR: 0x1a2018, EYE: [2.8, 2.2, 0.5], GLOW: 0xd8f070, MODEL: 'assets/build/monsters/elkro.glb',
      PATTERNS: [
        { key: 'stomp', name: '앞발 내려찍기', proto: 'slam' },
        { key: 'ram', name: '뿔 들이받기', proto: 'charge' },
        { key: 'freeze', name: '정지', proto: null, gimmick: true },
      ],
      PARTS: {
        clawL: { name: '왼 앞 발목', drop: 'FOREST_HOOF', kind: 'claw', hp: 220, mult: 2.0, effect: 'stomp' },
        clawR: { name: '오른 앞 발목', drop: 'FOREST_HOOF', kind: 'claw', hp: 220, mult: 2.0, effect: 'stomp' },
        hindL: { name: '왼 뒤 발목', drop: 'FOREST_HOOF', kind: 'claw', hp: 220, mult: 2.0 },
        hindR: { name: '오른 뒤 발목', drop: 'FOREST_HOOF', kind: 'claw', hp: 220, mult: 2.0 },
        kneeL: { name: '왼 역관절', drop: 'OLD_JOINT', kind: 'knee', hp: 280, mult: 1.8, effect: 'slow' },
        kneeR: { name: '오른 역관절', drop: 'OLD_JOINT', kind: 'knee', hp: 280, mult: 1.8, effect: 'slow' },
      },
      KILL_DROP: { material: 'CROWN_ANTLER', base: 1, extraChance: 0, chance: 0.2, firstGuaranteed: true },
      GIMMICK: { type: 'freeze', name: '정지', EVERY: [11, 16], TIME: [3, 6], R: 10, MOVE_TOL: 0.6, WIND: 0.35, DMG_K: 1.3, REWARD: 2.0 },
      RE_PATTERNS: ['정지 후 2연 찍기', '정지 중 포자가 시야를 가림'],
    },
    nocturna: {
      name: '밤덮개 녹투르나', short: '녹투르나', BASE_HP: 18000, SPEED_K: 0.8, BODY: 'floater', INTRO: 5, RAGE_AT: 0.3,
      COLOR: 0x1c1424, EYE: [2.6, 2.8, 3.0], GLOW: 0xb8e8ff, MODEL: 'assets/build/monsters/nocturna.glb',
      PATTERNS: [
        { key: 'lash', name: '촉수 내리꽂기', proto: 'slam' },
        { key: 'press', name: '갓 내려앉기', proto: 'slam' },
        { key: 'swallow', name: '빛 삼키기', proto: null, gimmick: true },
      ],
      PARTS: Object.fromEntries([...Array(8).keys()].map((i) => [`tip${i + 1}`,
        { name: `촉수 끝 ${i + 1}`, drop: 'CAP_SHARD', kind: 'claw', hp: 200, mult: 1.8, effect: 'phase' }]).concat([
        ['core', { name: '갓 아래 핵', drop: 'ABYSS_CORE', kind: 'core', hp: 600, mult: 2.6, hidden: true }]])),
      KILL_DROP: { material: 'ABYSS_CORE', base: 1, extraChance: 0, chance: 0.3, firstGuaranteed: true },
      GIMMICK: { type: 'swallow', name: '빛 삼키기', AT: [0.7, 0.4], WIND: 3.0, TIME: 20, DARK: 0.85, PHASE_TIPS: 4, END_STAGGER: 2.0, CORE_STAGGER: 3.0 },
      RE_PATTERNS: ['(재도전 Ⅰ 없음)', '빛 삼키기 3회 (70·50·25%)'],
    },
  },
  // 변형: 재도전에서만 쓴다 (STAGES.RECHALLENGE[등급].variant). 색조·윤곽 빛·크기·눈색·분노 시점·추가 드롭
  //   TINT: 몸 색을 color 쪽으로 amount만큼 섞음. RIM: 윤곽 빛 색 (null이면 LIGHT_CONFIG 기본)
  VARIANTS: {
    normal:  { label: '일반', SCALE: 1.0, EYE: null, RAGE_ADD: 0, TINT: null, RIM: null, EXTRA_DROP: null },
    elite:   { label: '강화', SCALE: 1.05, EYE: [3.0, 1.4, 0.1], RAGE_ADD: 0.1, TINT: { color: 0x6a1e10, amount: 0.45 }, RIM: 0xff9a5a,
      EXTRA_DROP: { material: 'ANCIENT_SHARD', base: 1, extraChance: 0.3 } },
    ancient: { label: '고대', SCALE: 1.1, EYE: [3.0, 2.2, 0.6], RAGE_ADD: 0, TINT: { color: 0x6a5420, amount: 0.5 }, RIM: 0xffe08a,
      EXTRA_DROP: { material: 'ANCIENT_SHARD', base: 2, extraChance: 0 } },
  },
  BASE_HIT: 30,        // 패턴 평균 피해. DMG_K는 이 값 기준 (13-1-1)
};

// ---------- 도감 완성 보상 ----------
// 완성도 = (만난 종 + 공개된 약점 부위 + 얻은 드롭 재료) ÷ 전체 (src/progress.js bestiaryProgress). AT %에 닿으면 한 번 받는다
export const BESTIARY = {
  REWARDS: [
    { AT: 25, GOLD: 300 },
    { AT: 50, GOLD: 800 },
    { AT: 75, GOLD: 1500 },
    { AT: 100, GOLD: 3000, MATS: { ANCIENT_SHARD: 2 } },
  ],
};

// ---------- 단계별 몬스터 크기 (6-0) ----------
// 높이 = 집 높이 × 배율. 단계마다 MIN_STEP 이상 커져야 한다 (검사함). 재도전은 여기에 변형 SCALE(×1.05~1.1)을 곱한다
export const MONSTER_SCALE = {
  BY_STAGE: { 1: 3.0, 2: 3.4, 3: 4.0, 4: 4.4, 5: 4.8, 6: 5.4, 7: 7.0 },   // 집 대비 배율
  MIN_STEP: 0.3,
};

// ---------- 스테이지 7단계 + 재도전 (13-1 v0.6, 6-9) ----------
// monsterId: 그 단계에만 나오는 몬스터 (MONSTERS.SPECIES 키). 단계마다 달라야 한다
// PATTERNS: 'all' 또는 그 종의 패턴 key 목록. INTRO는 종의 값을 따른다
export const STAGES = {
  RULES: {
    TIME_LIMIT: [600, 900, 900, 900, 900, 900, 1080],
    LIVES: 3, RETREAT_HP: 0.30, WIND_MIN: 0.6,
    STARS: { VILLAGE_MIN: 0.6 },
    STAR_GATE: { 5: 8, 7: 15 },   // 메인 단계 별만 센다 (재도전 별 제외)
    FIRST_CLEAR_GOLD_K: 2.0, STAR_GOLD_K: 0.1,   // 경험치 비율은 HUNTERS.EXP
    FAIL_KEEP: 0.5, STAR3_REROLL: 1, RETREAT_DROP_K: 0.5, RETREAT_GOLD_K: 0.7,
    START_GOLD: 200,
    // 마을 공격: 결정할 때마다 CHANCE 확률(또는 사냥꾼이 멀면 항상)로 TARGETS 가중치에 따라 목표를 고르고 COMMIT초 동안 유지
    RAID: {
      COMMIT: 6,              // 초, 한 번 정한 마을 목표를 유지하는 시간
      ROLL_EVERY: 6,          // 초, 습격 여부를 굴리는 간격 (= COMMIT이면 CHANCE ≈ 마을을 노리는 시간 비율)
      PEN_DMG: 5,             // 목장 습격 1회당 마을 체력 감소 (%) — 가축은 다치지 않고 놀라 흩어진다
      PEN_COOLDOWN: 6,        // 초, 같은 목장 습격 판정 간격
      LABEL: { house: '건물 파괴', pen: '가축 습격', shelter: '대피소 노리기' },
      SHORT: { house: '건물', pen: '가축', shelter: '대피소' },
      WARN: { pen: '목장을 노린다!', shelter: '대피소를 노린다!' },   // 이 목표를 정하면 알림
    },
    DANGER_LABELS: ['', '낮음', '보통', '높음', '매우 높음', '극도'],
    BANNER_TIME: 6,           // 초, 스테이지 시작 안내 표시 시간
  },
  // 메인 7단계: 단계마다 다른 종 (6-0). 체력·피해 배율은 13-9 시뮬레이터로 맞춘다
  LIST: [
    { id: 1, monsterId: 'varg', DANGER: 1, RAID: { CHANCE: 0.10, TARGETS: { house: 1 } }, HP_K: 0.75, SPEED_K: 0.85, WIND_K: 1.30, DMG_K: 0.60, RAGE_AT: null, PATTERNS: 'all', CLEAR_EXTRA: null, TIME_STAR: 150, REC_LV: 1, REC_GEAR: [1, 0], EXP: 300, GOLD: 200, UPKEEP: 60, JOB_UNLOCK: 'kito' },
    { id: 2, monsterId: 'kalkon', DANGER: 2, RAID: { CHANCE: 0.25, TARGETS: { house: 1 } }, HP_K: 1.30, SPEED_K: 1.00, WIND_K: 1.15, DMG_K: 0.80, RAGE_AT: 0.50, PATTERNS: 'all', CLEAR_EXTRA: null, TIME_STAR: 225, REC_LV: 4, REC_GEAR: [1, 3], EXP: 700, GOLD: 300, UPKEEP: 80, JOB_UNLOCK: 'fin' },
    { id: 3, monsterId: 'orgum', DANGER: 2, RAID: { CHANCE: 0.30, TARGETS: { house: 0.6, pen: 0.4 } }, HP_K: 1.70, SPEED_K: 1.00, WIND_K: 1.10, DMG_K: 1.00, RAGE_AT: 0.40, PATTERNS: 'all', CLEAR_EXTRA: { villageMin: 0.4 }, TIME_STAR: 270, REC_LV: 7, REC_GEAR: [2, 2], EXP: 1450, GOLD: 540, UPKEEP: 110, JOB_UNLOCK: 'odd' },
    { id: 4, monsterId: 'murga', DANGER: 3, RAID: { CHANCE: 0.35, TARGETS: { pen: 1 } }, HP_K: 2.20, SPEED_K: 1.00, WIND_K: 1.00, DMG_K: 1.00, RAGE_AT: 0.40, PATTERNS: 'all', CLEAR_EXTRA: null, TIME_STAR: 315, REC_LV: 10, REC_GEAR: [3, 0], EXP: 2300, GOLD: 750, UPKEEP: 150, JOB_UNLOCK: 'lena' },
    { id: 5, monsterId: 'seraph', DANGER: 3, RAID: { CHANCE: 0.40, TARGETS: { house: 0.5, pen: 0.5 } }, HP_K: 3.00, SPEED_K: 1.00, WIND_K: 0.95, DMG_K: 1.15, RAGE_AT: 0.40, PATTERNS: 'all', CLEAR_EXTRA: null, TIME_STAR: 360, REC_LV: 13, REC_GEAR: [3, 3], EXP: 3600, GOLD: 900, UPKEEP: 200, JOB_UNLOCK: 'mago' },
    { id: 6, monsterId: 'elkro', DANGER: 4, RAID: { CHANCE: 0.40, TARGETS: { shelter: 0.4, pen: 0.6 } }, HP_K: 3.60, SPEED_K: 1.00, WIND_K: 0.85, DMG_K: 1.10, RAGE_AT: 0.30, PATTERNS: 'all', CLEAR_EXTRA: { shelterAlive: true }, TIME_STAR: 450, REC_LV: 17, REC_GEAR: [4, 2], EXP: 4500, GOLD: 1200, UPKEEP: 260, JOB_UNLOCK: null },
    { id: 7, monsterId: 'nocturna', DANGER: 5, RAID: { CHANCE: 0.40, TARGETS: { shelter: 0.4, house: 0.3, pen: 0.3 } }, HP_K: 4.40, SPEED_K: 1.00, WIND_K: 0.80, DMG_K: 1.00, RAGE_AT: 0.30, PATTERNS: 'all', CLEAR_EXTRA: { killOnly: true }, TIME_STAR: 540, REC_LV: 20, REC_GEAR: [4, 4], EXP: 6000, GOLD: 1800, UPKEEP: 350, JOB_UNLOCK: null },
  ],
  // 재도전 (6-9): 같은 단계를 더 어렵게. 메인 해금·별 관문에는 안 들어간다
  //   UNLOCK: 'clear' 그 단계 첫 클리어 / 'final' 최종 단계 클리어. SKIP: 이 등급이 없는 단계
  //   DOUBLE_P: 공격 뒤 같은 공격을 한 번 더 할 확률 (종별 강화 패턴), GIMMICK_K: 기믹 시간·횟수 배율
  RECHALLENGE: {
    1: { label: '재도전 Ⅰ', variant: 'elite', UNLOCK: 'clear', SKIP: [7], HP_K: 1.35, DMG_K: 1.1, WIND_K: 0.95, EXP_K: 1.3, GOLD_K: 1.15, TIME_K: 1.3, DOUBLE_P: 0.25, GIMMICK_K: 1.0 },
    2: { label: '재도전 Ⅱ', variant: 'ancient', UNLOCK: 'final', SKIP: [], HP_K: 1.6, DMG_K: 1.25, WIND_K: 0.85, EXP_K: 1.6, GOLD_K: 1.4, TIME_K: 1.3, DOUBLE_P: 0.45, GIMMICK_K: 1.3 },
  },
};

// ---------- 사냥꾼: 레벨 1~30 (계정 공유) + 직업 6종 (13-2-1, 13-2-3) ----------
export const HUNTERS = {
  LEVEL: {
    MAX: 30,
    // NEXT[i] = 레벨 i+1 → i+2 에 필요한 EXP (표가 기준, 참고식 80 × L^1.45)
    NEXT: [80, 220, 390, 600, 830, 1080, 1350, 1630, 1940, 2250, 2590, 2940, 3300, 3670, 4060,
      4460, 4870, 5290, 5720, 6160, 6620, 7070, 7540, 8020, 8510, 9010, 9520, 10040, 10550],
    TOTAL_AT_MAX: 130310,       // 검사용: NEXT 합계와 같아야 함
    HP_BASE: 100, HP_PER: 5,    // HP = 100 + 5 × (L − 1), 직업 HP_K 곱함
    ATK_PER: 0.03,              // ATK_K = 1 + 0.03 × (L − 1)
    DEF_PER: 2,                 // DEF = 2 × (L − 1)
    UNLOCKS: {
      1: ['BASIC_COMBO', 'ROLL', 'SLOT_CONSUMABLE_2', 'GEAR_1'], 3: ['JOB_S1'], 4: ['SLOT_CONSUMABLE_3'], 5: ['GEAR_2'],
      6: ['JOB_P1'], 7: ['FOOT_SENSE'], 9: ['SLOT_PLACEABLE_1'], 10: ['JOB_S2', 'GEAR_3'], 12: ['SLOT_CONSUMABLE_4'],
      13: ['PERFECT_DODGE'], 15: ['GEAR_4'], 16: ['JOB_P2'], 18: ['SLOT_PLACEABLE_2'], 19: ['QUICK_RISE'],
      20: ['JOB_ULT', 'GEAR_5'], 22: ['GIANT_HUNTER'], 25: ['GRIT'], 28: ['SLOT_PLACEABLE_3'], 30: ['JOB_AWAKE'],
    },
  },
  // 직업: LOOK = 옷 색, START = 처음 받는 장비·소모품 (무기는 1등급, 방어구는 계정 공용)
  //   ROLES: 역할 태그 (사냥꾼 선택 화면) — HUNTERS.ROLES 키
  JOBS: {
    bri:  { name: '브리', weapon: '대검', icon: '🗡', HP_K: 1.20, MOVE_K: 0.95, UNLOCK_STAGE: 0, ROLES: ['melee'],
      DESC: '느리고 묵직한 3연 베기. 마지막 타는 회전 베기', LOOK: { tunic: 0xc94f3a, pants: 0x3d4a66, hair: 0x6b3d22 },
      START: { weapon: { grade: 1, enh: 0 }, items: { POTION: 2 } } },
    kito: { name: '키토', weapon: '쌍단검', icon: '⚔', HP_K: 0.90, MOVE_K: 1.25, UNLOCK_STAGE: 1, ROLES: ['melee'],
      DESC: '빠른 4연타와 짧고 잦은 구르기. 관절을 여러 번 긁는다', LOOK: { tunic: 0x3f8f5f, pants: 0x3a3a3a, hair: 0x2b2b2b },
      START: { weapon: { grade: 1, enh: 0 }, items: { POTION: 1, SMOKE_ORB: 1 } } },
    fin:  { name: '핀', weapon: '석궁', icon: '🏹', HP_K: 0.90, MOVE_K: 1.05, UNLOCK_STAGE: 2, ROLES: ['ranged'],
      DESC: '멀리서 쏘는 석궁. 높은 부위도 맞히지만 맞으면 아프다', LOOK: { tunic: 0x3d6fa6, pants: 0x5a4a3a, hair: 0xe3c35a },
      START: { weapon: { grade: 1, enh: 0 }, items: { POTION: 2 } } },
    odd:  { name: '오드', weapon: '해머', icon: '🔨', HP_K: 1.30, MOVE_K: 0.90, UNLOCK_STAGE: 3, ROLES: ['melee', 'tank'],
      DESC: '느린 2연타 해머. 맞힐수록 기절 게이지가 쌓여 몬스터를 넘어뜨린다', LOOK: { tunic: 0x8a5a36, pants: 0x3a3a3a, hair: 0x5a3a24 },
      START: { weapon: { grade: 1, enh: 0 }, items: { POTION: 2 } } },
    lena: { name: '레나', weapon: '창과 방패', icon: '🛡', HP_K: 1.50, MOVE_K: 0.90, UNLOCK_STAGE: 4, ROLES: ['tank'],
      DESC: '길게 찌르는 창. 구르기 대신 짧은 뒷걸음, 가드로 버틴다', LOOK: { tunic: 0xb8c0c8, pants: 0x4a5a7a, hair: 0x8a3a2a },
      START: { weapon: { grade: 1, enh: 0 }, items: { POTION: 3 } } },
    mago: { name: '마고', weapon: '갈고리', icon: '🪝', HP_K: 1.10, MOVE_K: 1.05, UNLOCK_STAGE: 5, ROLES: ['trap'],
      DESC: '넓게 휘두르는 갈고리. 발 묶기·덫·그물로 몬스터를 붙잡는다', LOOK: { tunic: 0x7a4f9a, pants: 0x3d3a4a, hair: 0x2b2b2b },
      START: { weapon: { grade: 1, enh: 0 }, items: { POTION: 1, SMOKE_ORB: 1 } } },
  },
  // 무기별 조작: 콤보 길이·속도·사거리·높이·기절치·구르기 (PLAYER_CONFIG.ATTACK / ROLL을 이 값으로 바꾼다)
  //   ANIM: slash 베기 · smash 내려치기 · thrust 찌르기 · shoot 쏘기
  //   SKILL_BASE: 직업 스킬 피해의 기준값 (스킬 mult를 곱함)
  //   VOXELS: 팔 파츠에 덧붙이는 무기 복셀 [x0,x1,y0,y1,z0,z1,색키] (사냥꾼 칸 좌표)
  //   GROW: 등급이 오르면 from 칸에서 dir 방향으로 EQUIPMENT.LOOK.BLADE_ADD[등급-1]칸(최대 MAX) 늘린다. 2등급부터 'steel'·'iron'은 등급 main 색, 'guard'는 accent 색
  WEAPONS: {
    bri:  { name: '대검', ANIM: 'slash', SPIN_LAST: true, DAMAGE: [50, 58, 100], WIND: [0.16, 0.15, 0.28], ACTIVE: 0.1, RECOVER: [0.28, 0.28, 0.48],
      LUNGE: [1.2, 1.2, 0.8], REACH: 1.45, ARC_COS: 0.0, REACH_Y: 2.1, STUN: [6, 6, 12], BREAK_K: 1.1, SKILL_BASE: 60, ROLL: null, RANGED: null,
      VOXELS: { armR: [[1, 3, 3, 3, 1, 1, 'guard'], [2, 2, 2, 3, 2, 8, 'steel']], armL: [] },
      GROW: { armR: [{ from: [[2, 2, 9], [2, 3, 9]], dir: [0, 0, 1] }], armL: [], color: 'steel' } },
    kito: { name: '쌍단검', ANIM: 'slash', SPIN_LAST: true, DAMAGE: [32, 32, 34, 54], WIND: [0.05, 0.05, 0.05, 0.1], ACTIVE: 0.06, RECOVER: [0.1, 0.1, 0.1, 0.25],
      LUNGE: [2.4, 2.4, 2.4, 1.6], REACH: 1.05, ARC_COS: 0.3, REACH_Y: 1.9, STUN: [2, 2, 2, 4], BREAK_K: 0.9, SKILL_BASE: 55,
      ROLL: { TIME: 0.35, IFRAME: 0.32, COOLDOWN: 0.8, DIST: 3.6 }, RANGED: null,
      VOXELS: { armR: [[2, 2, 3, 3, 1, 1, 'guard'], [2, 2, 3, 3, 2, 4, 'steel']], armL: [[-3, -3, 3, 3, 1, 1, 'guard'], [-3, -3, 3, 3, 2, 4, 'steel']] },
      GROW: { armR: [{ from: [[2, 3, 5]], dir: [0, 0, 1] }], armL: [{ from: [[-3, 3, 5]], dir: [0, 0, 1] }], color: 'steel' } },
    fin:  { name: '석궁', ANIM: 'shoot', SPIN_LAST: false, DAMAGE: [56, 56, 56], WIND: [0.12, 0.12, 0.12], ACTIVE: 0.05, RECOVER: [0.25, 0.25, 0.55],
      LUNGE: [-0.6, -0.6, -0.6], REACH: 0.9, ARC_COS: 0.3, REACH_Y: 1.9, STUN: [1, 1, 1], BREAK_K: 0.9, SKILL_BASE: 30, ROLL: null,
      RANGED: { RANGE: 9, CONE_COS: 0.5, REACH_Y: 8 },
      VOXELS: { armR: [[2, 2, 3, 3, 1, 4, 'wood'], [0, 4, 3, 3, 4, 4, 'wood'], [2, 2, 3, 3, 5, 5, 'steel']], armL: [] },
      GROW: { armR: [{ from: [[-1, 3, 4]], dir: [-1, 0, 0] }, { from: [[5, 3, 4]], dir: [1, 0, 0] }], armL: [], color: 'wood' } },
    odd:  { name: '해머', ANIM: 'smash', SPIN_LAST: false, DAMAGE: [60, 115], WIND: [0.22, 0.34], ACTIVE: 0.1, RECOVER: [0.38, 0.6],
      LUNGE: [0.8, 0.6], REACH: 1.3, ARC_COS: 0.1, REACH_Y: 2.0, STUN: [10, 20], BREAK_K: 1.3, SKILL_BASE: 70, ROLL: null, RANGED: null,
      VOXELS: { armR: [[2, 2, 3, 3, 1, 5, 'wood'], [1, 3, 2, 4, 6, 7, 'iron']], armL: [] },
      GROW: { armR: [{ from: [[1, 2, 8], [2, 2, 8], [3, 2, 8], [1, 3, 8], [2, 3, 8], [3, 3, 8], [1, 4, 8], [2, 4, 8], [3, 4, 8]], dir: [0, 0, 1] }], armL: [], color: 'iron', MAX: 2 } },
    lena: { name: '창과 방패', ANIM: 'thrust', SPIN_LAST: false, DAMAGE: [64, 64, 115], WIND: [0.1, 0.1, 0.18], ACTIVE: 0.08, RECOVER: [0.22, 0.22, 0.36],
      LUNGE: [1.6, 1.6, 2.4], REACH: 1.9, ARC_COS: 0.55, REACH_Y: 2.4, STUN: [4, 4, 8], BREAK_K: 1.0, SKILL_BASE: 50,
      ROLL: { TIME: 0.3, IFRAME: 0.25, COOLDOWN: 0.9, DIST: 2.0, BACKSTEP: true }, RANGED: null,
      VOXELS: { armR: [[2, 2, 3, 3, 1, 9, 'wood'], [2, 2, 3, 3, 10, 11, 'steel']], armL: [[-4, -4, 2, 6, -1, 1, 'shield'], [-4, -4, 4, 4, 0, 0, 'emblem']] },
      GROW: { armR: [{ from: [[2, 3, 12]], dir: [0, 0, 1] }], armL: [], color: 'steel' } },
    mago: { name: '갈고리', ANIM: 'slash', SPIN_LAST: true, DAMAGE: [66, 66, 106], WIND: [0.1, 0.12, 0.16], ACTIVE: 0.08, RECOVER: [0.24, 0.24, 0.4],
      LUNGE: [1.0, 1.0, 0.6], REACH: 2.3, ARC_COS: -0.2, REACH_Y: 2.6, STUN: [4, 4, 8], BREAK_K: 1.0, SKILL_BASE: 40, ROLL: null, RANGED: null,
      VOXELS: { armR: [[2, 2, 3, 3, 1, 2, 'rope'], [2, 2, 3, 5, 3, 3, 'steel'], [2, 2, 5, 5, 2, 2, 'steel']], armL: [[-3, -3, 3, 4, 1, 1, 'rope']] },
      GROW: { armR: [{ from: [[2, 6, 3]], dir: [0, 1, 0] }], armL: [], color: 'steel' } },
  },
  WEAPON_COLORS: { guard: 0xc9a043, steel: 0xd8dde3, wood: 0x8a5a36, iron: 0x6a6f78, shield: 0x3d5f9a, emblem: 0xe3c35a, rope: 0xc8a878 },
  DEFAULT_ROLL: { TIME: 0.45, IFRAME: 0.4, COOLDOWN: 1.2, DIST: 3.4 },
  // 직업별 점프 공격 (GAME_DESIGN 16-6). 공통 수치는 index.html JUMP_CONFIG · CLIMB_CONFIG
  //   H: [탭, 길게] 최고 높이(유닛) · AIR_HITS 한 번 점프에 공중 공격 수 · AIR_K 공중 공격 피해 배율(콤보 1타 기준) · AIR_REACH 공중 공격 닿는 높이 더함(유닛)
  //   AIR_RANGED 공중에서 볼트 · HOVER 최고점 공중 정지(초)
  //   PLUNGE_K 낙하 내려찍기 배율 · PLUNGE_R 착지 범위(유닛) · PLUNGE_BREAK 부위 파괴 배율 · PLUNGE_STUN 기절치 · PLUNGE_CD 쿨다운(초) · PLUNGE_GUARD 낙하 중 피해 없음
  //   CLIMB 올라타기 가능 · CLIMB_K 오르기 속도 배율 · GRIP_K 붙기 게이지 감소 배율 · GRAB 붙을 수 있는 거리(유닛) · BRACE_K 버티기 때 흔들림 손실 배율 · FALL_K 낙하 피해 배율
  JUMP: {
    bri:  { H: [1.0, 1.4], AIR_HITS: 1, AIR_K: 1.0, AIR_REACH: 0, PLUNGE_K: 1.8, PLUNGE_R: 1.4, PLUNGE_BREAK: 1.5, PLUNGE_STUN: 15, PLUNGE_CD: 4,
      CLIMB: true, CLIMB_K: 0.8, GRIP_K: 1.2, GRAB: 1.4, BRACE_K: 1.0, FALL_K: 1 },
    kito: { H: [1.2, 1.8], AIR_HITS: 3, AIR_K: 0.5, AIR_REACH: 0, PLUNGE_K: 1.2, PLUNGE_R: 1.1, PLUNGE_BREAK: 1.0, PLUNGE_STUN: 6, PLUNGE_CD: 3,
      CLIMB: true, CLIMB_K: 1.5, GRIP_K: 0.8, GRAB: 1.6, BRACE_K: 1.0, FALL_K: 1 },
    fin:  { H: [1.1, 1.6], AIR_HITS: 3, AIR_K: 0.6, AIR_REACH: 0, AIR_RANGED: true, HOVER: 0.3, PLUNGE_K: 1.0, PLUNGE_R: 1.0, PLUNGE_BREAK: 1.0, PLUNGE_STUN: 4, PLUNGE_CD: 4,
      CLIMB: false },
    odd:  { H: [0.9, 1.3], AIR_HITS: 1, AIR_K: 1.0, AIR_REACH: 0, PLUNGE_K: 1.6, PLUNGE_R: 2.2, PLUNGE_BREAK: 2.0, PLUNGE_STUN: 25, PLUNGE_CD: 5,
      CLIMB: false },
    lena: { H: [1.0, 1.4], AIR_HITS: 1, AIR_K: 1.0, AIR_REACH: 0.6, PLUNGE_K: 1.4, PLUNGE_R: 1.2, PLUNGE_BREAK: 1.0, PLUNGE_STUN: 10, PLUNGE_CD: 4, PLUNGE_GUARD: true,
      CLIMB: true, CLIMB_K: 1.0, GRIP_K: 1.0, GRAB: 1.4, BRACE_K: 0.5, FALL_K: 1 },
    mago: { H: [1.1, 1.6], AIR_HITS: 2, AIR_K: 0.7, AIR_REACH: 0, PLUNGE_K: 1.2, PLUNGE_R: 1.2, PLUNGE_BREAK: 1.0, PLUNGE_STUN: 8, PLUNGE_CD: 4,
      CLIMB: true, CLIMB_K: 1.3, GRIP_K: 0.9, GRAB: 3.0, BRACE_K: 1.0, FALL_K: 0 },
  },
  // 경험치 획득원 — 스테이지 EXP(STAGES.LIST[].EXP)에 곱하는 비율.
  //   처치·부위 파괴는 사냥 중 바로, 나머지는 끝날 때. 합계 1.0 + 첫 클리어 0.5 = 13-6의 "첫 클리어 ×1.5"와 같다
  EXP: {
    KILL_K: 0.30,         // 처치하는 순간
    PART_K: 0.04,         // 약점 부위 하나 파괴할 때마다 (5부위 = 0.20)
    CLEAR_K: 0.35,        // 클리어
    VILLAGE_K: 0.10,      // 마을 체력 ≥ STAGES.RULES.STARS.VILLAGE_MIN 으로 클리어 (마을 보호)
    SHELTER_K: 0.05,      // 대피소 주민을 지켜 냄 (감사 꾸러미를 받음)
    FIRST_K: 0.50,        // 첫 클리어 보너스
    FAIL_CLEAR_K: 0.5,    // 실패하면 CLEAR_K의 절반
  },
  LEVEL_UP: { HEAL_K: 0.3 },   // 레벨업 순간 최대 체력의 30% 회복 (연출 수치는 index.html PLAYER_CONFIG.LEVEL_UP_FX)
  START_JOB: 'bri',
};

// ---------- 스킬 (13-2-2, 13-2-3) + 스킬 트리 ----------
// 직업 스킬 type: strike 강타 · dash 돌진 타격 · multi 연타 · aoe 주변 타격 · shot 사격 · buff 일정 시간 강화 · bind 발 묶기 · trap 덫 · net 강제 다운
//   cd = 쿨다운(초). ULT는 쿨다운 대신 궁극기 게이지(ULT_GAUGE)가 가득 차야 쓴다.
//   P1·P2·AWAKE는 fx(효과 키)를 더한다 — 효과 키 목록은 src/progress.js FX_DEFAULTS
export const SKILLS = {
  COMMON: {
    FOOT_SENSE:    { name: '발치 감각', lv: 7, desc: '경직 중 약점 표시 +0.5초', value: 0.5 },
    PERFECT_DODGE: { name: '완벽 회피', lv: 13, desc: '판정 0.2초 전 회피 시 다음 공격 +30% (3초)', window: 0.2, bonus: 0.3, time: 3 },
    QUICK_RISE:    { name: '재빠른 기상', lv: 19, desc: '일어난 뒤 무적 +1초', value: 1.0 },
    GIANT_HUNTER:  { name: '거인 사냥꾼', lv: 22, desc: '부위 파괴 수치 +15%', value: 0.15 },
    GRIT:          { name: '불굴', lv: 25, desc: 'HP 30% 이하 공격 +15%', hpBelow: 0.3, bonus: 0.15 },
  },
  SLOTS: { CONSUMABLE: { 1: 2, 4: 3, 12: 4 }, PLACEABLE: { 9: 1, 18: 2, 28: 3 } },
  ULT_GAUGE: { MAX: 100, HIT: 2, WEAK_HIT: 4, DODGE: 5, BREAK: 15 },
  JOB_UNLOCK_LV: { S1: 3, P1: 6, S2: 10, P2: 16, ULT: 20, AWAKE: 30 },
  JOB: {
    bri: {
      S1: { name: '3단 차지 베기', icon: '⚡', type: 'strike', cd: 6, wind: 0.6, mult: 3.2, breakK: 1.5, stun: 20, reach: 1.6 },
      S2: { name: '어깨 받기', icon: '💨', type: 'dash', cd: 10, dist: 3.5, time: 0.3, mult: 1.4, stun: 30, reach: 1.2 },
      ULT: { name: '거인 쪼개기', icon: '🌋', type: 'strike', wind: 0.8, mult: 6.0, breakK: 3, stun: 40, reach: 1.8 },
      P1: { name: '버티기', desc: '공격 중 받는 피해 −30%', fx: { attackGuard: 0.3 } },
      P2: { name: '발 공략', desc: '발톱 피해 +15%', fx: { partBonus: { claw: 0.15 } } },
      AWAKE: { name: '각성', desc: '궁극기 +30%', fx: { ultMul: 0.3 } },
    },
    kito: {
      S1: { name: '질주', icon: '💨', type: 'buff', cd: 15, time: 5, fx: { rollCdMul: -0.5, moveMul: 0.2 } },
      S2: { name: '관절 난무', icon: '✴', type: 'multi', cd: 12, hits: 6, time: 0.8, mult: 0.8, jointK: 0.5, reach: 1.3 },
      ULT: { name: '그림자 걸음', icon: '🌑', type: 'buff', time: 4, fx: { invuln: 1, atkBuff: 0.5, moveMul: 0.3 } },
      P1: { name: '연타 리듬', desc: '5번째 타격마다 ×1.5', fx: { everyN: 5, everyMul: 0.5 } },
      P2: { name: '날랜 몸', desc: '구르기 쿨다운 −15%', fx: { rollCdMul: -0.15 } },
      AWAKE: { name: '각성', desc: '궁극기 +30%', fx: { ultMul: 0.3 } },
    },
    fin: {
      S1: { name: '조준 사격', icon: '🎯', type: 'shot', cd: 4, wind: 0.25, mult: 1.8, pierce: 1, range: 11 },
      S2: { name: '관통 볼트', icon: '➹', type: 'shot', cd: 10, wind: 0.3, mult: 1.4, pierce: 2, range: 12 },
      ULT: { name: '망루 저격', icon: '✦', type: 'shot', wind: 0.6, mult: 7.0, pierce: 1, range: 16, sure: true },
      P1: { name: '먼 거리', desc: '6유닛 이상에서 피해 +20%', fx: { farMul: 0.2, farDist: 6 } },
      P2: { name: '높은 부위', desc: '꼬리 피해 +15%', fx: { partBonus: { tail: 0.15 } } },
      AWAKE: { name: '각성', desc: '궁극기 +30%', fx: { ultMul: 0.3 } },
    },
    odd: {
      S1: { name: '내려찍기', icon: '🔨', type: 'strike', cd: 8, wind: 0.45, mult: 2.5, breakK: 2, stun: 30, reach: 1.5 },
      S2: { name: '땅 울림', icon: '◎', type: 'aoe', cd: 14, wind: 0.3, radius: 2.5, mult: 0.8, stun: 40 },
      ULT: { name: '산 부수기', icon: '⛰', type: 'strike', wind: 0.7, mult: 8.0, altMult: 5.0, needDown: true, breakK: 2, stun: 60, reach: 1.6 },
      P1: { name: '묵직함', desc: '기절치 +25%', fx: { stunMul: 0.25 } },
      P2: { name: '다운 공략', desc: '경직 중 피해 +20%', fx: { staggerDmg: 0.2 } },
      AWAKE: { name: '각성', desc: '궁극기 +30%', fx: { ultMul: 0.3 } },
    },
    lena: {
      S1: { name: '가드', icon: '🛡', type: 'buff', cd: 6, time: 1.5, fx: { guard: 0.8 } },
      S2: { name: '반격 찌르기', icon: '➶', type: 'strike', cd: 8, wind: 0.15, mult: 2.0, jointK: 0.5, stun: 15, reach: 2.1 },
      ULT: { name: '성벽', icon: '🏰', type: 'buff', time: 6, fx: { dmgTaken: -0.5, villageGuard: 0.5 } },
      P1: { name: '굳건함', desc: '가드로 막을 때 HP +3', fx: { guardHeal: 3 } },
      P2: { name: '버팀', desc: '넉백 −50%', fx: { knockMul: -0.5 } },
      AWAKE: { name: '각성', desc: '궁극기 +30%', fx: { ultMul: 0.3 } },
    },
    mago: {
      S1: { name: '발 묶기', icon: '⛓', type: 'bind', cd: 30, time: 4 },
      S2: { name: '덫 설치', icon: '⊗', type: 'trap', cd: 20, down: 3 },
      ULT: { name: '그물 낙하', icon: '🕸', type: 'net', down: 6 },
      P1: { name: '덫 장인', desc: '묶기·덫·그물 시간 +30%', fx: { trapMul: 0.3 } },
      P2: { name: '묶인 먹잇감', desc: '묶인 몬스터에게 피해 +20%', fx: { boundMul: 0.2 } },
      AWAKE: { name: '각성', desc: '궁극기 +30%', fx: { ultMul: 0.3 } },
    },
  },
  // 스킬 트리: 레벨마다 포인트 1. 같은 갈래의 앞 노드를 1 이상 찍어야 다음 노드가 열린다.
  //   전부 찍으면 33포인트, 레벨 30까지 받는 포인트는 29 → 갈래를 골라야 한다
  TREE: {
    POINTS_PER_LEVEL: 1,          // Lv2부터 레벨마다
    RESPEC_GOLD_PER_LV: 50,       // 초기화 비용 = 레벨 × 50 G
    BRANCHES: {
      attack: { name: '공격', icon: '⚔', nodes: [
        { key: 'sharpen',     name: '날 세우기',   icon: '🗡', max: 3, lv: 2,  fx: { atkMul: 0.04 },      desc: '공격 +4%' },
        { key: 'weakspot',    name: '약점 노리기', icon: '🎯', max: 3, lv: 5,  fx: { weakMul: 0.06 },     desc: '약점 피해 +6%' },
        { key: 'breaker',     name: '부위 파괴자', icon: '💥', max: 2, lv: 10, fx: { breakMul: 0.10 },    desc: '부위 파괴 수치 +10%' },
        { key: 'finisher',    name: '마무리 일격', icon: '✦', max: 2, lv: 15, fx: { finisherMul: 0.15 }, desc: '콤보 마지막 타 +15%' },
        { key: 'giantslayer', name: '거인 사냥',   icon: '👑', max: 1, lv: 20, fx: { staggerDmg: 0.20 },  desc: '경직 중 피해 +20%' },
      ] },
      survival: { name: '생존', icon: '🛡', nodes: [
        { key: 'toughness', name: '단련된 몸',     icon: '❤', max: 3, lv: 2,  fx: { hpMul: 0.06 },                    desc: '최대 체력 +6%' },
        { key: 'hide',      name: '굳은 피부',     icon: '🪨', max: 3, lv: 5,  fx: { defAdd: 4 },                      desc: '방어 +4' },
        { key: 'nimble',    name: '재빠른 구르기', icon: '🌀', max: 2, lv: 10, fx: { rollCdMul: -0.08 },               desc: '구르기 쿨다운 −8%' },
        { key: 'steady',    name: '버팀',          icon: '⚓', max: 2, lv: 15, fx: { knockMul: -0.2, hurtIframe: 0.15 }, desc: '넉백 −20%, 맞은 뒤 무적 +0.15초' },
        { key: 'laststand', name: '불굴',          icon: '🔥', max: 1, lv: 20, fx: { lastStand: 1 },                   desc: '쓰러질 공격을 사냥마다 한 번 HP 1로 버팀' },
      ] },
      support: { name: '보조', icon: '✚', nodes: [
        { key: 'collector', name: '수집가',      icon: '🎒', max: 3, lv: 2,  fx: { extraDrop: 0.10 },     desc: '부위 파괴 시 재료가 하나 더 나올 확률 +10%' },
        { key: 'guardian',  name: '마을 수호자', icon: '🏠', max: 3, lv: 5,  fx: { villageDmgMul: -0.08 }, desc: '마을이 받는 피해 −8%' },
        { key: 'focus',     name: '스킬 순환',   icon: '⏱', max: 2, lv: 10, fx: { skillCdMul: -0.10 },   desc: '직업 스킬 쿨다운 −10%' },
        { key: 'scholar',   name: '배움',        icon: '📖', max: 2, lv: 15, fx: { expMul: 0.10 },        desc: '경험치 +10%' },
        { key: 'medic',     name: '응급 처치',   icon: '✚', max: 1, lv: 20, fx: { breakHeal: 8 },         desc: '부위를 파괴하면 HP +8' },
      ] },
    },
  },
};

// ---------- 장비 (13-3) ----------
export const EQUIPMENT = {
  SLOTS: ['weapon', 'head', 'body', 'legs', 'charm'],
  SLOT_NAMES: { weapon: '무기', head: '머리', body: '몸', legs: '다리', charm: '장신구' },
  SLOT_ICONS: { weapon: '⚔', head: '⛑', body: '🦺', legs: '🥾', charm: '📿' },
  ARMOR_NAMES: { head: '투구', body: '갑옷', legs: '각반' },   // 이름 = 등급 이름 + 부위 (예: 잿빛 투구)
  // 장신구: 등급마다 효과(fx, src/progress.js FX_DEFAULTS 키)가 다르다. 강화 1단계마다 효과 +ENH.CHARM_K
  CHARMS: {
    1: { name: '나무 부적', fx: { hpMul: 0.03 }, desc: '최대 체력 +3%' },
    2: { name: '송곳니 목걸이', fx: { weakMul: 0.05 }, desc: '약점 피해 +5%' },
    3: { name: '결정 귀걸이', fx: { breakMul: 0.08 }, desc: '부위 파괴 수치 +8%' },
    4: { name: '폭풍깃 장식', fx: { rollCdMul: -0.10, skillCdMul: -0.05 }, desc: '구르기 쿨 −10%, 스킬 쿨 −5%' },
    5: { name: '고대 핵 펜던트', fx: { atkMul: 0.05, ultMul: 0.15 }, desc: '공격 +5%, 궁극기 +15%' },
  },
  GRADES: {
    1:  { name: '견습', set: '천옷', REQ_LV: 1, REQ_VILLAGE: 1, ATK_MUL: 1.00, DEF: 4 },
    2:  { name: '잿빛', set: '바르그 세트', REQ_LV: 5, REQ_VILLAGE: 2, ATK_MUL: 1.15, DEF: 8 },
    3:  { name: '철갑', set: '철갑 세트', REQ_LV: 10, REQ_VILLAGE: 3, ATK_MUL: 1.35, DEF: 13 },
    4:  { name: '폭풍', set: '폭풍 세트', REQ_LV: 15, REQ_VILLAGE: 4, ATK_MUL: 1.60, DEF: 19 },
    5:  { name: '고대', set: '고대 세트', REQ_LV: 20, REQ_VILLAGE: 5, ATK_MUL: 1.90, DEF: 26 },
  },
  ALT_SETS: { forest: { name: '숲왕', set: '숲왕 세트', grade: 5, afterStage: 10 } },
  // 강화: 비용 = COST[등급-1] × 목표 단계 (방어구·장신구 × ARMOR_K), 대장간(마을) 레벨 할인 적용. 실패 없음
  ENH: { MAX: 5, ATK: 0.04, DEF: 1, COST: [20, 50, 120, 250, 500], ARMOR_K: 0.5, CHARM_K: 0.15 },
  SET_BONUS: {
    2: { two: { rollCdK: -0.1 }, three: { chargeDmgTaken: -0.2 } },
    3: { two: { def: 8 }, three: { staggerDmg: 0.15 } },
    4: { two: { move: 0.08 }, three: { highReach: 0.4 } },
    5: { two: { ultGain: 0.2 }, three: { breakHeal: 10 } },
    forest: { two: { fearK: -0.5 }, three: { windK: 0.15 } },
  },
  // 레시피: 무기는 6직업 공통 재료, 방어구는 세 부위 같은 레시피, 장신구는 따로
  RECIPES: {
    1: { weapon: { mats: { IRON_ORE: 3 }, gold: 100 }, armor: { mats: { WOOD: 2 }, gold: 50 },
         charm: { mats: { WOOD: 3, HERB: 1 }, gold: 60 } },
    2: { weapon: { mats: { ASH_JOINT: 3, VARG_FANG: 1, IRON_SEG: 1, IRON_ORE: 4 }, gold: 300 },
         armor: { mats: { ASH_JOINT: 1, IRON_SEG: 1, IRON_ORE: 2 }, gold: 150 },
         charm: { mats: { VARG_FANG: 1, ASH_FUR: 2, IRON_ORE: 2 }, gold: 200 } },
    3: { weapon: { mats: { GIANT_CLAW: 3, TAIL_SHELL: 1, KALKON_CORE: 1, IRON_ORE: 8 }, gold: 700 },
         armor: { mats: { JOINT_CRYSTAL: 1, IRON_SEG: 2, IRON_ORE: 4 }, gold: 350 },
         charm: { mats: { JOINT_CRYSTAL: 2, GIANT_CORE: 1, IRON_ORE: 3 }, gold: 500 } },
    4: { weapon: { mats: { STORM_PLUME: 3, STORM_SCALE: 1, MURGA_RATTLE: 1, IRON_ORE: 12 }, gold: 1500 },
         armor: { mats: { SERAPH_TALON: 2, MURGA_SCALE: 2, IRON_ORE: 6 }, gold: 750 },
         charm: { mats: { STORM_PLUME: 2, MURGA_RATTLE: 1, IRON_ORE: 4 }, gold: 1000 } },
    5: { weapon: { mats: { ANCIENT_SHARD: 3, FOREST_HOOF: 3, IRON_ORE: 13 }, gold: 2400 },
         armor: { mats: { ANCIENT_SHARD: 1, OLD_JOINT: 2, STORM_SCALE: 1, IRON_ORE: 9 }, gold: 1200 },
         charm: { mats: { ANCIENT_SHARD: 2, FOREST_HOOF: 1, IRON_ORE: 5 }, gold: 1800 } },
    forest: { weapon: { mats: { CROWN_ANTLER: 1, FOREST_HOOF: 3, OLD_JOINT: 2, IRON_ORE: 13 }, gold: 2400 },
              armor: { mats: { FOREST_HOOF: 1, OLD_JOINT: 1, ANCIENT_SHARD: 1, IRON_ORE: 9 }, gold: 1200 } },
  },
  STARTER: { weaponGrade: 1, armorGrade: 1 },   // 첫 직업은 1등급 세트 무료
  // 외형 규칙 (13-3-4) — 기존 파츠에 복셀을 덧붙인다
  LOOK: {
    EXTRA_VOXEL_MAX: 120, HUNTER_VOXEL_MAX: 320, HEAD_MAX_W: 6, WEAPON_MAX_LEN_K: 1.2,
    ENH_TRIM: 3, ENH_GLOW: 5, SILHOUETTE_ORDER: ['head', 'shoulder', 'back'],
    BLADE_ADD: [0, 1, 2, 3, 3],                   // 등급별 칼날 추가 칸
    PARTS: {
      head: ['머리카락', '머리띠', '반투구', '투구+장식', '관/뿔 장식'],
      body: ['천옷', '가슴 덧댐', '어깨받이 1칸', '어깨받이 2칸+짧은 망토', '긴 망토'],
      legs: ['천바지', '각반', '정강이 보호대', '무릎 장식', '발광 테두리'],
    },
    PALETTE: { 1: [0xd8c8a8, 0x8a6a4a], 2: [0x8a8d93, 0xb5432f], 3: [0xd8d4c8, 0x2f8f8f], 4: [0xdfeefa, 0xc0c8d0], 5: [0xf0a030, 0x1b1b1b], forest: [0x5f8f4a, 0xe3c35a] },
    // 등급별 외형 파츠 (사냥꾼 복셀 좌표, 각 파츠 피벗 기준). 상자 [x0,x1,y0,y1,z0,z1,색키]
    //   색키: main/accent = PALETTE[등급], glow = GLOW_COLOR, 생략 = main
    //   1등급은 추가 없음(천옷). 파츠는 SHOULDER/LEGS를 왼쪽 기준으로 적고 오른쪽은 x 대칭(x' = -1 - x)
    HEAD: {      // 머리 파츠 (head 피벗)
      2: [[-3, 2, 10, 10, -3, 1]],
      3: [[-3, 2, 10, 11, -3, 1], [-3, 2, 12, 12, -2, 0]],
      4: [[-3, 2, 10, 11, -3, 1], [-3, 2, 12, 12, -2, 0], [-1, 0, 13, 13, -2, 0, 'accent']],
      5: [[-3, 2, 10, 11, -3, 1], [-3, 2, 12, 12, -2, 0], [-3, -3, 12, 13, -1, -1, 'accent'], [2, 2, 12, 13, -1, -1, 'accent'], [-1, 0, 12, 12, 0, 0, 'glow']],
    },
    BODY: {      // 몸통 파츠 (torso 피벗)
      2: [[-2, 1, 5, 6, 1, 1]],
      3: [[-2, 1, 5, 6, 1, 1]],
      4: [[-2, 1, 5, 6, 1, 1], [-2, 1, 4, 6, -2, -2, 'accent']],
      5: [[-2, 1, 5, 6, 1, 1], [-2, 1, 1, 6, -2, -2, 'accent'], [-2, 1, 4, 4, 1, 1, 'glow']],
    },
    SHOULDER: {  // 어깨받이 (armL 피벗, armR은 대칭) — 몸 등급을 따른다
      3: [[-4, -4, 6, 6, -1, 0]],
      4: [[-4, -3, 6, 7, -1, 0]],
      5: [[-4, -3, 6, 7, -1, 0], [-4, -4, 8, 8, -1, 0, 'accent']],
    },
    LEGS: {      // 다리 (legL 피벗, legR은 대칭)
      2: [[-2, -1, 1, 1, 1, 1]],
      3: [[-2, -1, 0, 2, 1, 1]],
      4: [[-2, -1, 0, 2, 1, 1], [-2, -1, 3, 3, 1, 1, 'accent']],
      5: [[-2, -1, 0, 2, 1, 1], [-2, -1, 3, 3, 1, 1, 'accent'], [-2, -1, 0, 0, -1, 0, 'glow']],
    },
    CHARM: { LOW: [[-1, 0, 6, 6, 1, 1]], HIGH: [[-1, 0, 5, 6, 1, 1]], HIGH_FROM: 3 },   // 가슴 장식 (torso 피벗), 장신구 색 = accent
    TRIM_LIGHTEN: 0.35,      // 강화 ENH_TRIM 이상: main 색을 이만큼 밝게
    GLOW_COLOR: 0xfff3c0,    // 강화 ENH_GLOW 또는 5등급 발광 칸
  },
};

// ---------- 아이템 (13-5-1, 13-5-2) ----------
//   전투 중 퀵슬롯으로 쓰는 것은 icon·cd가 있다. cd: 같은 아이템 재사용 대기(초), max: 들고 다닐 수 있는 최대 개수
//   unlock: null 처음부터 · { lv } 사냥꾼 레벨 · { stage } 그 단계 클리어 · { diner } 마을 레벨 / 설치물은 village = 마을 레벨
export const ITEMS = {
  CONSUMABLES: {
    POTION:      { name: '회복약', icon: '🧪', heal: 30, over: 1, use: 0.8, cd: 6, max: 5, price: 40, mats: { HERB: 2 }, unlock: null,
      desc: '체력 30을 1초에 걸쳐 회복' },
    POTION_PLUS: { name: '고급 회복약', icon: '⚗', heal: 70, over: 1, use: 0.8, cd: 10, max: 3, price: 120, mats: { HERB: 3, ASH_FUR: 1 }, unlock: { lv: 10 },
      desc: '체력 70을 1초에 걸쳐 회복' },
    BREAD:       { name: '기운 빵', staminaK: 0.5, time: 60, use: 0.6, max: 3, price: 60, mats: { WOOD: 1, HERB: 1 }, unlock: { diner: 2 } },
    CALM_TEA:    { name: '진정 차', fearK: -0.5, downK: -0.4, time: 60, use: 0.6, max: 3, price: 80, mats: { HERB: 2 }, unlock: { diner: 3 } },
    FLASH_ORB:   { name: '섬광 구슬', icon: '✴', stagger: 2.0, halfAfter: 3, use: 0.4, cd: 20, max: 3, price: 150, mats: { JOINT_CRYSTAL: 1, IRON_ORE: 1 }, unlock: { stage: 4 },
      desc: '눈부신 빛으로 2초 넘어뜨림 (한 사냥에 3번째부터 절반)' },
    SMOKE_ORB:   { name: '연막', icon: '💨', lose: 6, radius: 4, use: 0.4, cd: 20, max: 3, price: 100, mats: { WOOD: 1, HERB: 1 }, unlock: { stage: 1 },
      desc: '6초 동안 몬스터가 사냥꾼을 놓치고 헤맴' },
  },
  PLACEABLES: {
    SNARE:     { name: '함정', icon: '🪤', down: 3.0, repeat: [2.0, 0], setup: 1.5, cd: 15, max: 2, price: 300, mats: { IRON_SEG: 2, IRON_ORE: 3 }, village: 2,
      desc: '발밑에 설치. 밟으면 3초 쓰러짐' },
    LURE_CRACKER: { name: '유인 폭죽', icon: '🎆', lure: 6, throw: 6, setup: 0.5, cd: 18, max: 2, price: 150, mats: { WOOD: 2, HERB: 1 }, village: 2,
      desc: '앞으로 던져 터뜨림. 6초 동안 몬스터가 그쪽으로 감 (마을 공격도 멈춤)' },
    BARRICADE: { name: '방벽', icon: '🧱', blocks: 1, stagger: 1.5, r: 1.4, place: 2.0, setup: 2.0, cd: 20, max: 2, price: 250, mats: { WOOD: 6 }, village: 3,
      desc: '앞에 세움. 몬스터의 돌진·발을 한 번 막고 1.5초 비틀거리게 함' },
    LANTERN:   { name: '등불 기둥', radius: 4, time: 60, setup: 0.8, max: 3, price: 80, mats: { WOOD: 2, HERB: 1 }, village: 4, maxActive: 1 },
    BALLISTA:  { name: '지원 노포', time: 10, dps: 20, setup: 2.0, max: 1, price: 400, mats: { SERAPH_TALON: 1, IRON_ORE: 5 }, village: 5 },
  },
  // 대피소 보호 보너스 (프로토타입 '마을의 감사 꾸러미') — 받는 즉시 풀린다
  BUNDLES: {
    THANKS_BUNDLE: { name: '마을의 감사 꾸러미', goldPerVillageLv: 50, items: { POTION: 1 }, mats: { WOOD: 3 } },
  },
  GATHER: { POINTS: 3, TABLE: [{ mat: 'IRON_ORE', chance: 0.6, min: 1, max: 2 }, { mat: 'WOOD', chance: 0.5, min: 1, max: 3 }, { mat: 'HERB', chance: 0.4, min: 1, max: 2 }] },
  PART_EXTRA_CHANCE: 0.35,   // 부위 파괴 시 1개 더 나올 확률
  // 부위 파괴 희귀 드롭: 종의 핵심 재료(KILL_DROP.material)가 RARE_BASE × 부위 배율(약점 1.5~1.8) 확률로 나온다.
  //   정예·고대 변형은 ANCIENT_ELITE 확률로 고대 파편이 따로 나온다
  BREAK_DROP: { RARE_BASE: 0.06, ANCIENT_ELITE: 0.08, ANCIENT_MAT: 'ANCIENT_SHARD' },
  // 전투 퀵슬롯: 3칸. 사냥 전에 상점 '퀵슬롯' 탭에서 고른다. 쓰면 가방에서 빠진다
  QUICK: {
    SLOTS: 3, GLOBAL_CD: 0.8,   // 초, 아무 아이템이나 쓴 뒤 다음 아이템까지
    USABLE: ['POTION', 'POTION_PLUS', 'SMOKE_ORB', 'FLASH_ORB', 'SNARE', 'LURE_CRACKER', 'BARRICADE'],
    DEFAULT: ['POTION', 'SMOKE_ORB', 'SNARE'],
  },
  // 상점: 퀵슬롯용 아이템만 판다. 가격은 각 아이템 price (골드)
  SHOP: { LIST: ['POTION', 'POTION_PLUS', 'SMOKE_ORB', 'FLASH_ORB', 'SNARE', 'LURE_CRACKER', 'BARRICADE'] },
};

// ---------- 마을 레벨 1~5 (13-4) ----------
export const VILLAGE_UPGRADES = {
  LEVELS: {
    1: { cost: 0, mats: {}, gearCap: 1, villagers: 8, livestock: 8, supply: { IRON_ORE: 1, WOOD: 3 } },
    2: { cost: 600, mats: { WOOD: 20, VARG_FANG: 2 }, gearCap: 2, villagers: 9, livestock: 10, supply: { IRON_ORE: 2, WOOD: 6 } },
    3: { cost: 1500, mats: { WOOD: 40, GIANT_CORE: 1 }, gearCap: 3, villagers: 10, livestock: 12, supply: { IRON_ORE: 3, WOOD: 9 } },
    4: { cost: 2500, mats: { WOOD: 60, KALKON_CORE: 1 }, gearCap: 4, villagers: 11, livestock: 14, supply: { IRON_ORE: 4, WOOD: 12 } },
    5: { cost: 4000, mats: { WOOD: 80, STORM_SCALE: 2, ANCIENT_SHARD: 1 }, gearCap: 5, villagers: 12, livestock: 16, supply: { IRON_ORE: 5, WOOD: 15 } },
  },
  FACILITIES: {
    SMITHY:  { name: '대장간', enhDiscount: [0, 0.05, 0.10, 0.15, 0.20] },
    DINER:   { name: '식당', menus: ['체력 +10', '스태미나 회복 +20%', '구르기 쿨 −10%', '공격 +5%', '공포 연출 −50%'] },
    TRAP:    { name: '덫 공방', unlockAt: 2, items: { 2: ['SNARE', 'LURE_CRACKER'], 3: ['BARRICADE'], 4: ['LANTERN'], 5: ['BALLISTA'] } },
    // 아래는 마을 레벨(1~5)별 값. 배열 [Lv1, Lv2, Lv3, Lv4, Lv5]
    WALL:    { name: '성벽', hp: [0, 15, 25, 40, 60] },   // 마을 체력(%) 피해를 먼저 막아 주는 방어막
    TOWER:   { name: '포탑', count: [0, 0, 1, 2, 3], dmg: 25, interval: 2.5, range: 16 },   // 개, 피해, 초, m — 사거리 안 몬스터에 볼트 발사
    SHELTER: { name: '대피소', hp: [10, 13, 16, 20, 24], capacity: [6, 8, 10, 12, 12] },   // 집 체력 단위 · 주민 수
    HOUSE:   { name: '집', hp: [4, 5, 6, 7, 8], repair: [100, 120, 140, 160, 180] },
    HELPER:  { name: '주민 도우미', count: [0, 1, 1, 2, 3], interval: 10, heal: 6, repair: 1 },   // 명, 초마다 한 명씩: 사냥꾼 체력 회복 또는 금 간 집 수리
  },
};

// ============================================================
// 검사: 서로 가리키는 키가 실제로 있는지, 표 합계가 맞는지
// ============================================================
export function validateProgression() {
  const errors = [];
  const needMat = (k, where) => { if (!MATERIALS[k]) errors.push(`${where}: 재료 '${k}' 없음`); };
  const needMats = (obj, where) => Object.keys(obj || {}).forEach((k) => needMat(k, where));

  const ids = STAGES.LIST.map((s) => s.id);
  if (ids.length !== 7 || ids.some((id, i) => id !== i + 1)) errors.push('STAGES.LIST: 1~7 순서가 아님');
  if (STAGES.RULES.TIME_LIMIT.length !== STAGES.LIST.length) errors.push('STAGES.RULES.TIME_LIMIT 길이 불일치');
  for (const s of STAGES.LIST) {
    const sp = MONSTERS.SPECIES[s.monsterId];
    if (!sp) { errors.push(`스테이지 ${s.id}: monsterId '${s.monsterId}' 없음`); continue; }
    if (s.PATTERNS !== 'all') for (const p of s.PATTERNS) if (!sp.PATTERNS.some((q) => q.key === p)) errors.push(`스테이지 ${s.id}: 패턴 '${p}'이(가) ${s.monsterId}에 없음`);
    if (!(MONSTER_SCALE.BY_STAGE[s.id] > 0)) errors.push(`스테이지 ${s.id}: MONSTER_SCALE.BY_STAGE 없음`);
    if (s.JOB_UNLOCK && !HUNTERS.JOBS[s.JOB_UNLOCK]) errors.push(`스테이지 ${s.id}: 직업 '${s.JOB_UNLOCK}' 없음`);
    if (!EQUIPMENT.GRADES[s.REC_GEAR[0]]) errors.push(`스테이지 ${s.id}: 권장 장비 등급 없음`);
    if (!(s.DANGER >= 1 && s.DANGER <= 5)) errors.push(`스테이지 ${s.id}: DANGER는 1~5`);
    if (!s.RAID || !(s.RAID.CHANCE >= 0 && s.RAID.CHANCE <= 1)) errors.push(`스테이지 ${s.id}: RAID.CHANCE는 0~1`);
    for (const k of Object.keys(s.RAID?.TARGETS || {})) if (!STAGES.RULES.RAID.LABEL[k]) errors.push(`스테이지 ${s.id}: 마을 공격 '${k}' 정의 없음`);
  }
  const PART_KINDS = ['claw', 'knee', 'tail', 'core'], GIMMICKS = ['ambush', 'chain', 'grab', 'burrow', 'flight', 'freeze', 'swallow'];
  for (const [k, sp] of Object.entries(MONSTERS.SPECIES)) {
    for (const [pid, p] of Object.entries(sp.PARTS)) {
      needMat(p.drop, `MONSTERS.${k}.PARTS.${pid}`);
      if (!PART_KINDS.includes(p.kind) || !(p.hp > 0) || !(p.mult > 0)) errors.push(`MONSTERS.${k}.PARTS.${pid}: kind·hp·mult 확인`);
    }
    needMat(sp.KILL_DROP.material, `MONSTERS.${k}.KILL_DROP`);
    if (!GIMMICKS.includes(sp.GIMMICK?.type)) errors.push(`MONSTERS.${k}.GIMMICK.type 모름`);
    if (!(sp.INTRO >= 1 && sp.INTRO <= 5)) errors.push(`MONSTERS.${k}: INTRO 1~5`);
    if (!sp.BODY || !Array.isArray(sp.EYE) || sp.EYE.length !== 3) errors.push(`MONSTERS.${k}: 임시 도형 BODY·EYE 확인`);
  }
  // 크기는 단계마다 MIN_STEP 이상 커져야 한다 (6-0)
  STAGES.LIST.forEach((s, i) => {
    const prev = STAGES.LIST[i - 1];
    if (prev && MONSTER_SCALE.BY_STAGE[s.id] - MONSTER_SCALE.BY_STAGE[prev.id] < MONSTER_SCALE.MIN_STEP - 1e-9) errors.push(`스테이지 ${s.id}: 크기가 앞 단계보다 ${MONSTER_SCALE.MIN_STEP} 이상 커야 함 (MONSTER_SCALE)`);
  });
  // 단계마다 고유한 몬스터 · 모델 파일 재사용 금지 · 임시 도형도 단계마다 달라 보여야 함 (체형·색·눈 색이 모두 다름)
  const uniq = (list, what) => { const seen = {}; list.forEach(([id, v]) => { if (v == null) return; if (seen[v]) errors.push(`${what} '${v}'를 ${seen[v]}·${id}단계가 같이 씀`); else seen[v] = id; }); };
  uniq(STAGES.LIST.map((s) => [s.id, s.monsterId]), 'monsterId');
  uniq(STAGES.LIST.map((s) => [s.id, MONSTERS.SPECIES[s.monsterId]?.MODEL]), '모델');
  for (const key of ['BODY', 'COLOR']) uniq(STAGES.LIST.map((s) => [s.id, MONSTERS.SPECIES[s.monsterId]?.[key]]), `임시 도형 ${key}`);
  uniq(STAGES.LIST.map((s) => [s.id, MONSTERS.SPECIES[s.monsterId]?.EYE.join(',')]), '임시 도형 눈 색');
  uniq(STAGES.LIST.map((s) => [s.id, MONSTERS.SPECIES[s.monsterId]?.GIMMICK?.type]), '기믹');   // 단계마다 새 기믹 1개
  // 변형(강화·고대)은 같은 종의 재도전 난이도로만: 메인 단계 항목에 변형을 적지 않는다
  for (const s of STAGES.LIST) for (const k of ['variant', 'VARIANT', 'variantKey']) if (k in s) errors.push(`스테이지 ${s.id}: 변형은 STAGES.RECHALLENGE에서만 (메인 단계에 '${k}' 있음)`);
  if (MONSTERS.VARIANTS.normal?.SCALE !== 1 || MONSTERS.VARIANTS.normal?.TINT) errors.push('MONSTERS.VARIANTS.normal: 메인 단계 외형을 바꾸면 안 됨 (SCALE 1 · TINT 없음)');
  for (const [tier, r] of Object.entries(STAGES.RECHALLENGE)) if (!MONSTERS.VARIANTS[r.variant]) errors.push(`STAGES.RECHALLENGE.${tier}: 변형 '${r.variant}' 없음`);
  for (const [k, v] of Object.entries(MONSTERS.VARIANTS)) if (v.EXTRA_DROP) needMat(v.EXTRA_DROP.material, `MONSTERS.VARIANTS.${k}`);
  // 도감 보상: AT은 1~100에서 커지는 순서, 재료는 있어야 함
  BESTIARY.REWARDS.forEach((r, i) => {
    if (!(r.AT > 0 && r.AT <= 100) || (i && r.AT <= BESTIARY.REWARDS[i - 1].AT)) errors.push(`BESTIARY.REWARDS[${i}].AT은 1~100, 커지는 순서`);
    needMats(r.MATS, `BESTIARY.REWARDS[${i}]`);
  });

  const L = HUNTERS.LEVEL;
  if (L.NEXT.length !== L.MAX - 1) errors.push(`HUNTERS.LEVEL.NEXT 길이 ${L.NEXT.length} ≠ ${L.MAX - 1}`);
  const total = L.NEXT.reduce((a, b) => a + b, 0);
  if (total !== L.TOTAL_AT_MAX) errors.push(`HUNTERS.LEVEL: NEXT 합계 ${total} ≠ TOTAL_AT_MAX ${L.TOTAL_AT_MAX}`);
  if (!HUNTERS.JOBS[HUNTERS.START_JOB]) errors.push('HUNTERS.START_JOB 없음');
  const SKILL_TYPES = ['strike', 'dash', 'multi', 'aoe', 'shot', 'buff', 'bind', 'trap', 'net'];
  for (const [j, job] of Object.entries(HUNTERS.JOBS)) {
    if (!SKILLS.JOB[j]) errors.push(`SKILLS.JOB.${j} 없음`);
    const W = HUNTERS.WEAPONS[j];
    if (!W) { errors.push(`HUNTERS.WEAPONS.${j} 없음`); continue; }
    const ROLE_KEYS = ['tank', 'ranged', 'trap', 'melee'];   // 역할 태그 (사냥꾼 선택 화면): 1개 이상, 정해진 키만
    if (!job.ROLES?.length || job.ROLES.some((r) => !ROLE_KEYS.includes(r))) errors.push(`HUNTERS.JOBS.${j}.ROLES는 ${ROLE_KEYS.join('·')} 중 1개 이상`);
    const J = HUNTERS.JUMP[j];   // 점프 공격 (16-6): 직업마다 있어야 하고 높이는 [탭 < 길게]
    if (!J) errors.push(`HUNTERS.JUMP.${j} 없음`);
    else if (!(J.H[0] > 0 && J.H[1] > J.H[0])) errors.push(`HUNTERS.JUMP.${j}.H는 [탭, 길게]이고 길게가 더 높아야 함`);
    const n = W.DAMAGE.length;
    for (const k of ['WIND', 'RECOVER', 'LUNGE', 'STUN']) if (W[k].length !== n) errors.push(`HUNTERS.WEAPONS.${j}.${k} 길이 ${W[k].length} ≠ DAMAGE ${n}`);
    for (const b of [...W.VOXELS.armR, ...W.VOXELS.armL]) if (HUNTERS.WEAPON_COLORS[b[6]] === undefined) errors.push(`HUNTERS.WEAPONS.${j}: 색 '${b[6]}' 없음`);
    for (const i of Object.keys(job.START.items)) if (!ITEMS.CONSUMABLES[i]) errors.push(`HUNTERS.JOBS.${j}.START: 아이템 '${i}' 없음`);
    for (const slot of ['S1', 'S2', 'ULT']) {
      const s = SKILLS.JOB[j]?.[slot];
      if (!s || !SKILL_TYPES.includes(s.type)) errors.push(`SKILLS.JOB.${j}.${slot}: type 없음/모름`);
      else if (slot !== 'ULT' && !(s.cd > 0)) errors.push(`SKILLS.JOB.${j}.${slot}: cd 필요`);
    }
  }
  const E = HUNTERS.EXP, expSum = E.KILL_K + E.PART_K * 5 + E.CLEAR_K + E.VILLAGE_K + E.SHELTER_K;
  if (Math.abs(expSum - 1) > 1e-6) errors.push(`HUNTERS.EXP 합계(첫 클리어 제외) ${expSum.toFixed(2)} ≠ 1.00`);
  const treeKeys = new Set();
  for (const [bk, br] of Object.entries(SKILLS.TREE.BRANCHES)) for (const nd of br.nodes) {
    if (treeKeys.has(nd.key)) errors.push(`SKILLS.TREE: 키 '${nd.key}' 중복`);
    treeKeys.add(nd.key);
    if (!(nd.max >= 1) || !(nd.lv >= 1)) errors.push(`SKILLS.TREE.${bk}.${nd.key}: max/lv 확인`);
  }
  for (const k of Object.values(L.UNLOCKS).flat()) {
    const known = SKILLS.COMMON[k] || /^(BASIC_COMBO|ROLL|SLOT_|GEAR_|JOB_)/.test(k);
    if (!known) errors.push(`HUNTERS.LEVEL.UNLOCKS: '${k}' 정의 없음`);
  }

  for (const [g, r] of Object.entries(EQUIPMENT.RECIPES)) for (const k of ['weapon', 'armor', 'charm']) {
    if (r[k]) needMats(r[k].mats, `EQUIPMENT.RECIPES.${g}.${k}`);
    else if (EQUIPMENT.GRADES[g]) errors.push(`EQUIPMENT.RECIPES.${g}.${k} 없음`);
  }
  for (const g of Object.keys(EQUIPMENT.GRADES)) if (!EQUIPMENT.CHARMS[g]) errors.push(`EQUIPMENT.CHARMS.${g} 없음`);
  for (const s of EQUIPMENT.SLOTS) if (!EQUIPMENT.SLOT_NAMES[s] || !EQUIPMENT.SLOT_ICONS[s]) errors.push(`EQUIPMENT.SLOT_NAMES/ICONS.${s} 없음`);
  for (const [j, W] of Object.entries(HUNTERS.WEAPONS)) if (!W.GROW || HUNTERS.WEAPON_COLORS[W.GROW.color] === undefined) errors.push(`HUNTERS.WEAPONS.${j}.GROW 확인`);
  needMat(ITEMS.BREAK_DROP.ANCIENT_MAT, 'ITEMS.BREAK_DROP');
  const anyItem = (k) => ITEMS.CONSUMABLES[k] || ITEMS.PLACEABLES[k];
  for (const k of [...ITEMS.QUICK.USABLE, ...ITEMS.QUICK.DEFAULT, ...ITEMS.SHOP.LIST]) {
    const it = anyItem(k);
    if (!it) errors.push(`ITEMS.QUICK/SHOP: '${k}' 없음`);
    else if (!it.icon || !(it.cd > 0) || !(it.price > 0)) errors.push(`ITEMS.${k}: 퀵슬롯용 icon·cd·price 필요`);
  }
  if (ITEMS.QUICK.DEFAULT.length !== ITEMS.QUICK.SLOTS) errors.push('ITEMS.QUICK.DEFAULT 길이 ≠ SLOTS');
  for (const [k, f] of Object.entries(VILLAGE_UPGRADES.FACILITIES)) for (const arr of Object.values(f)) {
    if (Array.isArray(arr) && arr.length !== 5 && k !== 'DINER') errors.push(`VILLAGE_UPGRADES.FACILITIES.${k}: 레벨 1~5 배열 길이 5 필요`);
  }
  for (const list of Object.values(VILLAGE_UPGRADES.FACILITIES.TRAP.items)) for (const k of list) if (!ITEMS.PLACEABLES[k]) errors.push(`TRAP.items: '${k}' 없음`);
  if (EQUIPMENT.ENH.COST.length !== Object.keys(EQUIPMENT.GRADES).length) errors.push('EQUIPMENT.ENH.COST 길이 불일치');
  for (const [k, it] of Object.entries({ ...ITEMS.CONSUMABLES, ...ITEMS.PLACEABLES })) needMats(it.mats, `ITEMS.${k}`);
  for (const [k, b] of Object.entries(ITEMS.BUNDLES)) { needMats(b.mats, `ITEMS.BUNDLES.${k}`); for (const i of Object.keys(b.items)) if (!ITEMS.CONSUMABLES[i]) errors.push(`ITEMS.BUNDLES.${k}: 아이템 '${i}' 없음`); }
  for (const g of ITEMS.GATHER.TABLE) needMat(g.mat, 'ITEMS.GATHER');
  for (const [lv, v] of Object.entries(VILLAGE_UPGRADES.LEVELS)) { needMats(v.mats, `VILLAGE_UPGRADES.LEVELS.${lv}`); needMats(v.supply, `VILLAGE_UPGRADES.LEVELS.${lv}.supply`); }
  return errors;
}

// 실행 중에 실수로 고치지 못하게 얼린다
function deepFreeze(o) { Object.values(o).forEach((v) => { if (v && typeof v === 'object') deepFreeze(v); }); return Object.freeze(o); }
[MATERIALS, MONSTERS, MONSTER_SCALE, STAGES, HUNTERS, SKILLS, EQUIPMENT, ITEMS, VILLAGE_UPGRADES].forEach(deepFreeze);
