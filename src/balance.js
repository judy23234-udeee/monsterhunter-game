// ============================================================
// 밸런스 시뮬레이터 — index.html?balance=1
//   레벨·장비 조합마다 스테이지 1~10을 몬테카를로로 돌려
//   예상 클리어 시간·성공률, 재화 수입·지출 곡선, 재료 병목을 표로 보여 준다.
//   게임 수치는 모두 설정표에서 읽는다:
//     data/progression.js (STAGES·MONSTERS·HUNTERS·SKILLS·EQUIPMENT·ITEMS·VILLAGE_UPGRADES)
//     index.html의 MONSTER_CONFIG·PLAYER_CONFIG·COMBAT_CONFIG (mount 때 넘겨받음)
//   아래 BALANCE_CONFIG는 "플레이어가 실제로 어떻게 싸우는가"에 대한 가정이다. 플레이테스트로 맞춘다.
// ============================================================
import { STAGES, MONSTERS, HUNTERS, SKILLS, EQUIPMENT, ITEMS, VILLAGE_UPGRADES, MATERIALS } from '../data/progression.js';
import * as Progress from './progress.js';

export const BALANCE_CONFIG = {
  RUNS: 300,                 // 조합 하나당 시뮬레이션 횟수 (?runs=)
  SEED: 20261102,            // 같은 설정이면 같은 결과
  DT: 0.25,                  // 초, 시뮬레이션 한 걸음
  JOB: 'bri',                // 기본 직업 (?job=)

  // --- 사냥꾼 공격 가정 ---
  UPTIME: 0.25,              // 평소 실제로 때리는 시간 비율 (이동·회피·접근 제외, GAME_DESIGN 13-6-1의 25%)
  PUNISH_UPTIME: 0.45,       // 몬스터 공격 직후 빈틈(내려찍기·돌진 뒤 경직)에 때리는 비율 — 방금 피해서 멀리 있을 때가 많다
  STAGGER_UPTIME: 0.85,      // 부위 파괴·기절·덫으로 넘어졌을 때 때리는 비율
  RANGED_UPTIME_K: 1.25,     // 원거리 무기(RANGED)는 더 오래 때린다
  RANGED_HIT_K: 0.7,         // 원거리 무기는 멀리 있어 덜 맞는다 (몬스터 공격 명중 확률 배율)
  MOVE_DODGE_EXP: 1.5,       // 빠른 직업일수록 덜 맞는다: 명중 확률 × (직업 MOVE_K)^−EXP
  WEAK_SHARE: 0.55,          // 때린 것 중 약점 부위에 들어가는 비율 (부위가 남아 있을 때)
  SKILL_READY_USE: 0.8,      // 스킬이 준비됐을 때 바로 쓰는 확률 (걸음마다)
  AOE_PARTS: 2,              // 범위 스킬이 맞히는 부위 수
  TRAP_HIT_P: 0.6,           // 덫·그물이 실제로 걸릴 확률
  BIND_STAGGER_K: 0.5,       // 발 묶기 시간을 경직 시간으로 환산하는 비율
  BUFF_TIMING: 0.5,          // 가드 같은 방어 버프가 실제 피격 순간에 켜져 있을 비율
  DPS_SD: 0.22,              // 런마다 공격 실력 편차 (로그정규 표준편차)

  // --- 피격 가정 ---
  HIT_P: 0.2,                // 예고 배율 1.0일 때 몬스터 공격 1번에 맞을 확률
  HIT_P_WIND_EXP: 1.6,       // 예고가 길수록 덜 맞음: HIT_P × (예고 배율)^−EXP
  HIT_P_MAX: 0.8,
  DODGE_SD: 0.3,             // 런마다 회피 실력 편차
  APPROACH_SEC: 1.6,         // 초, 공격 사이 몬스터가 다가오는 시간 (쿨다운에 더함)
  CHARGE_SHARE: 0.35,        // 돌진이 허용된 단계에서 공격 중 돌진 비율
  STOMP_PER_MIN: 1.2,        // 분당 밟기(발 근처 잔피해)에 맞는 횟수
  POTION_AT: 0.4,            // 체력이 이 비율 아래면 회복약
  POTIONS: 3,                // 사냥에 들고 가는 회복약 (상점 최대 5)
  HELPER_HEAL_SHARE: 0.5,    // 도우미 일 중 회복 비율 (나머지는 수리)
  TOWER_UPTIME: 0.5,         // 포탑 사거리 안에 몬스터가 있는 시간 비율

  // --- 마을 가정 ---
  RAID_LOSS_PER_MIN: 40,     // 마을 공격 확률 1.0일 때 분당 마을 체력 손실 (%) — 자동 테스트 봇(강함) 1~5단계 실측: 14~28%/분 (GAME_DESIGN 14장)
  COLLATERAL_PER_MIN: 8,    // 습격이 아니어도 마을 안에서 싸우며 생기는 분당 손실 (%) — 내려찍기·발에 집이 휘말림
  RAID_TARGET_K: { house: 1.0, pen: 0.8, shelter: 1.1 },
  SHELTER_SAFE: 0.35,        // 마을 체력이 이 비율 이상이면 대피소가 남아 있다고 본다

  // --- 비교할 조합 (권장 기준 차이) ---
  BUILDS: [
    { key: 'rec', label: '권장', dLv: 0, dGrade: 0, dEnh: 0 },
    { key: 'lvm', label: 'Lv −3', dLv: -3, dGrade: 0, dEnh: 0 },
    { key: 'lvp', label: 'Lv +3', dLv: 3, dGrade: 0, dEnh: 0 },
    { key: 'gm', label: '장비 −1등급', dLv: 0, dGrade: -1, dEnh: 0 },
    { key: 'ep', label: '강화 +2', dLv: 0, dGrade: 0, dEnh: 2 },
  ],

  // --- 종별 기믹 가정 (GAME_DESIGN 6장, 수치는 data GIMMICK) ---
  GIMMICK: {
    AMBUSH_HIT_K: 1.0,       // 매복 뒤 덮치기: 예고가 짧아 그만큼 더 맞음 (예고 배율로 계산) × 이 값
    GRAB_HOLD_DMG: 0,        // 잡혀 있는 동안 추가 피해 없음 (잡힌 시간만 공격 못 함)
    FREEZE_MOVE_P: 0.3,      // 엘크로 정지 중 참지 못하고 움직일 확률 → 빠른 반격
    SWALLOW_HIT_K: 1.3,      // 어둠 속에서는 더 맞음
    SWALLOW_UPTIME_K: 0.8,   // 어둠 속에서는 덜 때림
    FLIGHT_RANGED_K: 0.5,    // 공중 단계에서 원거리 무기가 때리는 시간 비율 (근접은 0)
  },

  // --- 판정 기준 ---
  TARGET_MIN: [1.5, 2.5, 3.0, 3.5, 4.0, 5.0, 6.0],   // 분, GAME_DESIGN 13-1-1 목표 처치 시간 (7단계)
  EASY: { SUCCESS: 0.98, TIME_K: 0.55 },   // 성공률 98% 이상이고 목표 시간의 55% 안이면 '너무 쉬움'
  HARD: { SUCCESS: 0.70, TIME_K: 1.6 },    // 성공률 70% 미만이거나 목표의 1.6배를 넘으면 '너무 어려움'
  STEP_JUMP: 0.2,                          // 이전 단계보다 성공률이 20%p 넘게 떨어지면 '난이도 급등'

  // --- 경제 경로 (7단계 + 재도전) ---
  PLAN_REPEATS: [1, 2, 2, 3, 3, 3, 0],      // 첫 클리어 뒤 그 단계 반복 횟수
  // 그 단계 장비를 맞추기 전에 하는 재도전 [단계, 등급, 횟수] — 5등급 장비의 고대 핵편용. 조합은 RE_BUILD_FROM 단계의 권장 + RE_LV_PLUS
  //   v0.16: 7단계 권장을 4등급+4로 내려 1회차 경로에는 재도전이 없다 (5등급·마을 Lv5는 엔딩 후 목표)
  PLAN_RE: {},
  RE_BUILD_FROM: 6, RE_LV_PLUS: 2,
  RE2_LV_PLUS: 5, RE2_ENH: 4,   // 재도전 Ⅱ(엔딩 후) 조합: 최종 단계 권장 + 레벨 5, 강화 +4
  MAX_TRIES: 6,                                    // 첫 클리어 시도 상한 (기대 시도 수 = 1 / 성공률)
  ARMOR_SLOTS: ['head', 'body', 'legs'],           // 장비를 맞출 때 사는 방어구 (장신구는 제외)
  BUNDLES_PER_CLEAR: 2,                            // 클리어 1회당 평균 감사 꾸러미 수 (테스트 플레이에서 2)
  GOLD_SURPLUS_K: 0.35, GOLD_SURPLUS_MIN: 1000,   // 다음 단계 준비 뒤 잔액이 누적 수입의 35%와 1000 G를 둘 다 넘으면 '재화 과잉'
};

// ---------- 난수 (같은 시드면 같은 결과) ----------
function rngFrom(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const gauss = (rng) => Math.sqrt(-2 * Math.log(rng() || 1e-9)) * Math.cos(2 * Math.PI * rng());
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const avg = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN);
const pct = (a, q) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const expForLevel = (lv) => HUNTERS.LEVEL.NEXT.slice(0, lv - 1).reduce((s, x) => s + x, 0);

// 시뮬레이션용 가짜 저장 → Progress.hunterStats로 능력치를 계산 (게임과 같은 식)
function fakeSave(job, lv, grade, enh, village) {
  const items = [{ id: 1, slot: 'weapon', job, grade, enh }];
  const equipped = { weapon: { [job]: 1 }, head: null, body: null, legs: null, charm: null };
  ['head', 'body', 'legs'].forEach((s, i) => { items.push({ id: i + 2, slot: s, grade, enh }); equipped[s] = i + 2; });
  return { hunter: { level: lv, exp: expForLevel(lv), job }, skills: { tree: {} }, equipment: { items, equipped, nextId: 5 },
    village: { level: village }, inventory: { materials: {}, items: {} }, currency: { gold: 0 }, stages: {}, quickslots: [], bestiary: {} };
}

// ---------- 사냥 1회 시뮬레이션 ----------
// cfg: { MC: MONSTER_CONFIG, CC: COMBAT_CONFIG } (게임 설정표), build: { job, lv, grade, enh, village }
function prepare(stageId, build, cfg, tier = 0) {
  const B = BALANCE_CONFIG, MC = cfg.MC;
  const s = Progress.resolveStage(stageId, tier), st = s.stage;
  const save = fakeSave(build.job, build.lv, build.grade, build.enh, build.village);
  const hs = Progress.hunterStats(save), fx = hs.fx, W = HUNTERS.WEAPONS[build.job];
  const comboT = W.DAMAGE.reduce((a, _, i) => a + W.WIND[i] + W.ACTIVE + W.RECOVER[i], 0);
  const comboDps = W.DAMAGE.reduce((a, b) => a + b, 0) / comboT;
  const hitRate = W.DAMAGE.length / comboT;
  const stunPerHit = avg(W.STUN);
  const skills = Progress.jobSkills(save, build.job).filter((x) => x.unlocked);
  const vs = Progress.villageStats(save);
  // 방어 버프(가드·피해 감소)의 평균 효과
  let guard = 0;
  for (const sk of skills) if (sk.def.type === 'buff' && sk.def.cd) guard += (sk.def.fx.guard || 0) * Math.min(1, sk.def.time / sk.def.cd) * B.BUFF_TIMING;
  const potion = ITEMS.CONSUMABLES.POTION;
  return {
    s, st, hs, fx, W, comboDps, hitRate, stunPerHit, skills, vs, guard: Math.min(0.9, guard), potionHeal: potion.heal,
    // 종별 약점 (숨은 핵·턱은 기믹으로만 추가)
    parts: Object.entries(s.parts).filter(([, p]) => !p.hidden).map(([id, p]) => ({ id, hp: p.hp, mult: p.mult, side: p.side, effect: p.effect })),
    hidden: Object.entries(s.parts).filter(([, p]) => p.hidden).map(([id, p]) => ({ id, hp: p.hp, mult: p.mult })),
    G: s.gimmick, gK: s.gimmickK, doubleP: s.doubleP,
    ranged: W.RANGED ? B.RANGED_UPTIME_K : 1, rangedHit: (W.RANGED ? B.RANGED_HIT_K : 1) * Math.pow(HUNTERS.JOBS[build.job].MOVE_K, -B.MOVE_DODGE_EXP),
    attacks: [s.allowSlam && { P: MC.SLAM, kind: 'slam' }, s.allowCharge && { P: MC.CHARGE, kind: 'charge' }].filter(Boolean),
    raidK: Object.entries(st.RAID.TARGETS).reduce((a, [k, w]) => a + w * (B.RAID_TARGET_K[k] ?? 1), 0) / Object.values(st.RAID.TARGETS).reduce((a, w) => a + w, 0),
    limit: STAGES.RULES.TIME_LIMIT[stageId - 1],
  };
}

function simulate(P, cfg, rng) {
  const B = BALANCE_CONFIG, MC = cfg.MC, dt = B.DT, st = P.st, fx = P.fx;
  const skillK = Math.exp(gauss(rng) * B.DPS_SD), dodgeK = Math.exp(gauss(rng) * B.DODGE_SD);
  const hpMax = P.hs.hp, atk = P.hs.atkMul, defK = 100 / (100 + P.hs.def);
  const parts = P.parts.map((p) => ({ ...p })), broken = [];
  let t = 0, mhp = P.s.hp, php = hpMax, rage = false, stagger = 0, stun = 0, gauge = 0, potions = B.POTIONS, potionsUsed = 0;
  let village = 100, wall = P.vs.wall, nextAtk = B.APPROACH_SEC + MC.AI.COOLDOWN, hitsTaken = 0;
  const cd = {}; for (const sk of P.skills) cd[sk.slot] = sk.slot === 'ULT' ? 0 : sk.def.cd * rng();
  const ultOn = P.skills.some((x) => x.slot === 'ULT');
  const SB = P.W.SKILL_BASE;
  const weakMult = () => { const alive = parts.filter((p) => p.hp > 0); return alive.length ? alive.reduce((a, p) => a + p.mult, 0) / alive.length : 0; };
  let punish = false;   // 지금 경직이 공격 뒤 빈틈인지 (true) 넘어짐인지 (false)
  const down = (time) => { if (time >= stagger) punish = false; stagger = Math.max(stagger, time); };
  const result = (outcome) => ({ outcome, t, village, broken, potionsUsed, hitsTaken, php: php / hpMax });
  // 종별 기믹 (6장): busy = 몬스터가 사라지거나 숨어 있어 서로 공격하지 못하는 시간, held = 사냥꾼만 못 때리는 시간(잡힘)
  const G = P.G, GB = B.GIMMICK, sw = MC.SLAM.WIND, avgR = (r) => (r[0] + r[1]) / 2;
  const gim = { done: {}, next: G.EVERY ? avgR(G.EVERY) : Infinity, busy: 0, after: null, held: 0, darkUntil: -1, flightUntil: -1, flightNext: 0, chain: {}, phase2: false };
  const at = [...(G.AT || [])]; if (P.gK > 1 && at.length) at.splice(1, 0, (at[0] + at[1]) / 2);
  const attackPlayer = (P0, windK, dmgK2 = 1) => {   // 예고가 있는 공격 1번 (명중하면 피해)
    const pHit = clamp(B.HIT_P * P.rangedHit * dodgeK * Math.pow(windK, -B.HIT_P_WIND_EXP) * (t < gim.darkUntil ? GB.SWALLOW_HIT_K : 1), 0, B.HIT_P_MAX);
    if (rng() < pHit) { php -= Math.round(P0.DMG * P.s.dmgK * dmgK2) * (rage ? MC.RAGE.DMG_K : 1) * defK * (1 - P.guard); hitsTaken++; return true; }
    return false;
  };
  const addHidden = (id) => { const h = P.hidden.find((x) => x.id === id); if (h && !parts.some((p) => p.id === id)) parts.push({ ...h }); };
  const dropHidden = (id) => { const i = parts.findIndex((p) => p.id === id && p.hp > 0); if (i >= 0) parts.splice(i, 1); };

  while (t < P.limit) {
    t += dt;
    // --- 기믹 시작 ---
    if (!gim.busy && stagger <= 0) {
      for (const a of at) if (!gim.done[a] && mhp <= P.s.hp * a) {
        gim.done[a] = true;
        if (G.type === 'ambush') { gim.busy = G.FADE + avgR(G.HIDE) * P.gK; gim.after = () => { attackPlayer(MC.SLAM, P.s.windK * G.WIND_K * GB.AMBUSH_HIT_K); down(MC.SLAM.STAGGER); punish = true; }; }
        if (G.type === 'flight') { gim.flightUntil = t + G.RISE + G.TIME * P.gK; gim.flightNext = t + G.RISE + G.AIM; }
        if (G.type === 'swallow') { gim.busy = G.WIND; gim.after = () => { gim.darkUntil = t + G.TIME * P.gK; }; }
        break;
      }
      if (G.EVERY && !gim.busy && (gim.next -= dt) <= 0) {
        gim.next = avgR(G.EVERY) / P.gK;
        if (G.type === 'burrow') { gim.busy = G.SINK + avgR(G.TUNNEL) + G.WIND * P.s.windK; gim.after = () => { attackPlayer(MC.SLAM, P.s.windK * G.WIND / sw, G.DMG_K); addHidden('jaw'); down(G.STAGGER); gim.jawUntil = t + G.STAGGER; }; }
        if (G.type === 'freeze') { gim.busy = avgR(G.TIME) * P.gK; gim.after = () => { if (rng() < GB.FREEZE_MOVE_P) attackPlayer(MC.SLAM, P.s.windK * G.WIND / sw, G.DMG_K); else down(G.REWARD); }; }
      }
    }
    if (gim.busy > 0) { gim.busy -= dt; if (gim.busy <= 0) { gim.busy = 0; const f = gim.after; gim.after = null; if (f) f(); } else continue; }
    if (gim.jawUntil && t > gim.jawUntil) { dropHidden('jaw'); gim.jawUntil = 0; }
    if (gim.coreUntil && t > gim.coreUntil) { dropHidden('core'); gim.coreUntil = 0; }
    const flying = t < gim.flightUntil;
    if (gim.flightUntil > 0 && !flying) { gim.flightUntil = -1; down(G.LAND_STAGGER); }   // 공중 단계 끝: 크게 착지
    const stag = stagger > 0 && !flying;
    // --- 사냥꾼 공격 ---
    const darkK = t < gim.darkUntil ? GB.SWALLOW_UPTIME_K : 1, flyK = flying ? (P.W.RANGED ? GB.FLIGHT_RANGED_K : 0) : 1;
    const heldK = gim.held > 0 ? 0 : 1; gim.held = Math.max(0, gim.held - dt);
    const upt = (stag ? (punish ? B.PUNISH_UPTIME : B.STAGGER_UPTIME) : B.UPTIME) * P.ranged * darkK * flyK * heldK;
    const dmgK = stag ? MC.STAGGER_DMG_K * (1 + fx.staggerDmg) : 1;
    const wm = weakMult(), ws = wm > 0 ? B.WEAK_SHARE : 0;
    const mixK = ws * wm * (1 + fx.weakMul) + (1 - ws) * MC.BODY_MULT;
    let dmg = P.comboDps * upt * dt * atk * skillK * dmgK * mixK;
    const hits = P.hitRate * upt * dt;
    const hitPart = (amount) => {   // 약점 피해는 남은 부위 하나에 쌓여 부위 파괴
      const alive = parts.filter((p) => p.hp > 0);
      if (!alive.length) return;
      const p = alive[Math.floor(rng() * alive.length)];
      p.hp -= amount * P.W.BREAK_K * (1 + fx.breakMul);
      if (p.hp <= 0) {
        broken.push(p.id); gauge += SKILLS.ULT_GAUGE.BREAK;
        if (stag) stagger = Math.min(stagger + MC.BREAK.EXTEND, MC.BREAK.DOWN_TIME); else down(MC.BREAK.DOWN_TIME);
        // 칼콘: 같은 쪽 다리 n개 → 핵 노출 / 녹투르나: 촉수 n개 → 2단계(핵을 노릴 수 있음)
        if (p.effect === 'chain' && !gim.chain[p.side] && broken.filter((id) => P.parts.find((q) => q.id === id)?.side === p.side).length >= G.LEGS) {
          gim.chain[p.side] = true; addHidden('core'); down(G.EXPOSE / P.gK); gim.coreUntil = t + G.EXPOSE / P.gK;
        }
        if (p.effect === 'phase' && !gim.phase2 && broken.filter((id) => P.parts.find((q) => q.id === id)?.effect === 'phase').length >= G.PHASE_TIPS) { gim.phase2 = true; addHidden('core'); }
      }
    };
    if (ws) hitPart(P.comboDps * upt * dt * atk * skillK * dmgK * ws * wm);
    stun = Math.max(0, stun + P.stunPerHit * hits * (1 + fx.stunMul) - MC.STUN.DECAY * dt);
    if (stun >= MC.STUN.MAX && !stag) { stun = 0; down(MC.STUN.TIME); }
    if (ultOn) gauge += hits * (ws * SKILLS.ULT_GAUGE.WEAK_HIT + (1 - ws) * SKILLS.ULT_GAUGE.HIT);
    // --- 직업 스킬 (게임과 같은 표: SKILLS.JOB) ---
    for (const sk of P.skills) {
      const d = sk.def, ult = sk.slot === 'ULT';
      if (ult ? gauge < SKILLS.ULT_GAUGE.MAX : (cd[sk.slot] -= dt) > 0) continue;
      if (rng() > B.SKILL_READY_USE) continue;
      const k = ult ? 1 + fx.ultMul : 1;
      if (['strike', 'dash', 'multi', 'aoe', 'shot'].includes(d.type)) {
        const m = (d.needDown && !stag ? d.altMult : d.mult) * (d.hits || 1) * (d.type === 'aoe' ? B.AOE_PARTS : 1);
        const sd = SB * atk * skillK * m * k * dmgK * (wm > 0 ? (1 + wm) / 2 : 1);
        dmg += sd;
        if (wm > 0) hitPart(sd * B.WEAK_SHARE * (d.breakK || 1));
        stun += (d.stun || 0) * (1 + fx.stunMul);
      } else if (d.type === 'bind') down(d.time * B.BIND_STAGGER_K * k);
      else if (d.type === 'trap' || d.type === 'net') { if (rng() < B.TRAP_HIT_P) down((d.down || 0) * (1 + fx.trapMul) * k); }
      if (ult) gauge = 0; else cd[sk.slot] = d.cd * Math.max(0.2, 1 + fx.skillCdMul);
    }
    // --- 포탑 ---
    if (P.vs.towers) dmg += P.vs.towers * P.vs.towerDmg / P.vs.towerInterval * B.TOWER_UPTIME * dt * (1 + wm) / 2;
    mhp -= dmg;
    if (mhp <= 0) return result('win');
    if (!rage && P.s.rageAt && mhp <= P.s.hp * P.s.rageAt) rage = true;

    // --- 몬스터 ---
    if (flying) {   // 공중 단계: 그림자를 따라와 낙하만 반복 (마을 공격 없음)
      if (stagger > 0) stagger -= dt;
      if (t >= gim.flightNext) { attackPlayer(MC.SLAM, P.s.windK * G.AIM / sw, G.DMG_K); gim.flightNext = t + G.DROP + G.GROUND + G.RISE + G.AIM; }
      if (php < hpMax * B.POTION_AT && potions > 0) { php = Math.min(hpMax, php + P.potionHeal); potions--; potionsUsed++; }
      if (php <= 0) return result('death');
      continue;
    }
    if (stag) { stagger -= dt; continue; }
    // 마을 공격 (성벽이 먼저 받음)
    let loss = (st.RAID.CHANCE * B.RAID_LOSS_PER_MIN * P.raidK + B.COLLATERAL_PER_MIN) / 60 * dt * Math.max(0, 1 + fx.villageDmgMul);
    const wl = Math.min(wall, loss); wall -= wl; loss -= wl;
    village -= loss;
    if (village <= 0) return result('village');
    // 밟기 잔피해
    if (rng() < B.STOMP_PER_MIN / 60 * dt) { php -= Math.max(1, MC.STOMP.DMG * P.s.dmgK) * defK * (1 - P.guard); hitsTaken++; }
    // 패턴 공격
    if ((nextAtk -= dt) <= 0 && P.attacks.length) {
      const dark = t < gim.darkUntil;   // 빛 삼키기 중에는 내리꽂기(내려찍기)만
      const charge = !dark && P.attacks.find((a) => a.kind === 'charge'), slam = P.attacks.find((a) => a.kind === 'slam');
      const a = charge && (!slam || rng() < B.CHARGE_SHARE) ? charge : (slam || charge);
      const windK = P.s.windK * (rage ? MC.RAGE.WIND_K : 1);
      if (G.type === 'grab' && a === slam && rng() < G.CHANCE) {   // 오르굼 잡기: 예고가 길지만 잡히면 그동안 못 때림
        if (attackPlayer(a.P, windK * G.WIND / sw, G.DMG_K)) gim.held = G.HOLD;
      } else attackPlayer(a.P, windK);
      // 재도전: 같은 공격을 한 번 더 (짧은 예고)
      if (P.doubleP && rng() < P.doubleP) attackPlayer(a.P, windK * 0.6);
      down(a.P.STAGGER * (rage ? MC.RAGE.STAGGER_K : 1)); punish = true;   // 공격 뒤 빈틈
      nextAtk = MC.AI.COOLDOWN + B.APPROACH_SEC + a.P.WIND * windK;
    }
    // 도우미 회복 · 회복약
    if (P.vs.helpers) php = Math.min(hpMax, php + P.vs.helpers * P.vs.helperHeal / P.vs.helperInterval * B.HELPER_HEAL_SHARE * dt);
    if (php < hpMax * B.POTION_AT && potions > 0) { php = Math.min(hpMax, php + P.potionHeal); potions--; potionsUsed++; }
    if (php <= 0) return result('death');
  }
  return result('time');
}

// 한 조합(단계 × 빌드)을 RUNS번 → 요약
function runCase(stageId, build, cfg, runs, rng, tier = 0) {
  const P = prepare(stageId, build, cfg, tier), st = P.st, R0 = STAGES.RULES;
  const times = [], out = { win: 0, death: 0, time: 0, village: 0, extra: 0 }, star = [0, 0, 0], brokenCount = {};
  let villageSum = 0, potions = 0, kills = 0;
  for (let i = 0; i < runs; i++) {
    const r = simulate(P, cfg, rng);
    let cleared = r.outcome === 'win';
    if (cleared && st.CLEAR_EXTRA?.villageMin && r.village / 100 < st.CLEAR_EXTRA.villageMin) cleared = false;
    if (cleared && st.CLEAR_EXTRA?.shelterAlive && r.village / 100 < BALANCE_CONFIG.SHELTER_SAFE) cleared = false;
    if (r.outcome === 'win') kills++;
    if (cleared) {
      out.win++; times.push(r.t);
      star[0]++; if (r.village / 100 >= R0.STARS.VILLAGE_MIN) star[1]++; if (r.t <= P.s.timeStar) star[2]++;
    } else out[r.outcome === 'win' ? 'extra' : r.outcome]++;
    villageSum += Math.max(0, r.village); potions += r.potionsUsed;
    for (const id of r.broken) brokenCount[id] = (brokenCount[id] || 0) + 1;
  }
  return {
    stageId, tier, build, hp: P.hs.hp, atk: P.hs.atkMul, def: P.hs.def, monsterHp: P.s.hp,
    multOf: Object.fromEntries([...P.parts, ...P.hidden].map((p) => [p.id, p.mult])),
    success: out.win / runs, outcomes: Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v / runs])),
    tMed: pct(times, 0.5), tP25: pct(times, 0.25), tP75: pct(times, 0.75),
    star: star.map((x) => x / runs), starExp: star.reduce((a, x) => a + x, 0) / runs,
    village: villageSum / runs, potions: potions / runs, killRate: kills / runs,
    breakRate: Object.fromEntries([...P.parts, ...P.hidden].map((p) => [p.id, (brokenCount[p.id] || 0) / runs])),
  };
}

// 단계별 빌드 (권장 기준 ± 차이). 마을 레벨은 그 등급을 만들 수 있는 최소 레벨
function buildFor(stageId, b, job) {
  const st = Progress.stageById(stageId), [g0, e0] = st.REC_GEAR;
  const grade = clamp(g0 + b.dGrade, 1, 5), enh = clamp((b.dGrade < 0 ? EQUIPMENT.ENH.MAX - 1 : e0) + b.dEnh, 0, EQUIPMENT.ENH.MAX);
  return { job, lv: clamp(st.REC_LV + b.dLv, 1, HUNTERS.LEVEL.MAX), grade, enh, village: Math.max(EQUIPMENT.GRADES[grade].REQ_VILLAGE, EQUIPMENT.GRADES[g0].REQ_VILLAGE) };
}

// ---------- 경제 경로: 계획대로 사냥하며 장비·마을을 맞출 때의 골드·경험치·재료 ----------
function addMats(bag, mats, k = 1) { for (const [m, n] of Object.entries(mats || {})) bag[m] = (bag[m] || 0) + n * k; }
function expectedDrops(stageId, rec, cleared, first, tier = 0) {
  const st = Progress.stageById(stageId), sp = MONSTERS.SPECIES[st.monsterId], R0 = STAGES.RULES;
  const va = MONSTERS.VARIANTS[tier ? STAGES.RECHALLENGE[tier].variant : 'normal'];
  const D = ITEMS.BREAK_DROP, bag = {}, keep = cleared ? 1 : R0.FAIL_KEEP;
  for (const [pid, p] of Object.entries(sp.PARTS)) {
    const br = rec.breakRate[pid] || 0;
    addMats(bag, { [p.drop]: br * (1 + ITEMS.PART_EXTRA_CHANCE) * keep });
    addMats(bag, { [sp.KILL_DROP.material]: br * D.RARE_BASE * (rec.multOf[pid] || 1) * keep });
    if (tier) addMats(bag, { [D.ANCIENT_MAT]: br * D.ANCIENT_ELITE * keep });
  }
  if (cleared) {
    const rolls = 1 + rec.star[2] / Math.max(rec.success, 1e-9) * R0.STAR3_REROLL;
    const kd = sp.KILL_DROP, kill = (first && kd.firstGuaranteed ? 1 : (kd.chance ?? 1)) * (kd.base + (kd.extraChance || 0));
    addMats(bag, { [kd.material]: kill * rolls });
    if (va.EXTRA_DROP) addMats(bag, { [va.EXTRA_DROP.material]: (va.EXTRA_DROP.base + (va.EXTRA_DROP.extraChance || 0)) * rolls });
    addMats(bag, ITEMS.BUNDLES.THANKS_BUNDLE.mats, BALANCE_CONFIG.BUNDLES_PER_CLEAR);
  }
  for (const g of ITEMS.GATHER.TABLE) addMats(bag, { [g.mat]: ITEMS.GATHER.POINTS * g.chance * (g.min + g.max) / 2 * keep });
  return bag;
}

function economy(recRows, reRows = {}) {
  const B = BALANCE_CONFIG, R0 = STAGES.RULES, E = HUNTERS.EXP, BUN = ITEMS.BUNDLES.THANKS_BUNDLE;
  const state = { gold: R0.START_GOLD, exp: 0, grade: 1, enh: 0, village: 1, mats: {} };
  const curve = [{ hunt: 0, income: 0, spend: 0, gold: state.gold, stage: 0 }];
  const rows = [], shortages = [];
  let hunt = 0, income = 0, spend = 0;
  const pay = (g, what, stageId) => { state.gold -= g; spend += g; if (state.gold < 0) shortages.push({ kind: 'gold', stageId, what, short: -state.gold }); };
  const useMats = (mats, what, stageId) => {
    for (const [m, n] of Object.entries(mats)) {
      const have = state.mats[m] || 0;
      if (have + 1e-6 < n) shortages.push({ kind: 'mat', stageId, what, mat: m, need: n, have });
      state.mats[m] = Math.max(0, have - n);
    }
  };
  // 재도전 사냥 (성공률만큼 클리어): 재도전 배율(EXP·G)과 변형 추가 드롭(고대 핵편)
  const reHunt = (sid, tier, n, id) => {
    const rec = reRows[`${sid}r${tier}`], st = Progress.stageById(sid), RE = STAGES.RECHALLENGE[tier];
    if (!rec) return { gold: 0, exp: 0, n: 0 };
    let gold = 0, exp = 0;
    for (let i = 0; i < n; i++) {
      const p = rec.success;
      const g1 = p * (st.GOLD * RE.GOLD_K * (1 + R0.STAR_GOLD_K * rec.starExp / Math.max(p, 1e-9)) + BUN.goldPerVillageLv * state.village * B.BUNDLES_PER_CLEAR);
      const e1 = st.EXP * RE.EXP_K * (p * (E.KILL_K + E.CLEAR_K + E.VILLAGE_K * 0.5) + (1 - p) * E.CLEAR_K * E.FAIL_CLEAR_K);
      const win = expectedDrops(sid, rec, true, false, tier), lose = expectedDrops(sid, rec, false, false, tier);
      for (const [m, v] of Object.entries(win)) state.mats[m] = (state.mats[m] || 0) + p * v;
      for (const [m, v] of Object.entries(lose)) state.mats[m] = (state.mats[m] || 0) + (1 - p) * v;
      state.gold += g1 - st.UPKEEP; income += g1; spend += st.UPKEEP; state.exp += e1; gold += g1 - st.UPKEEP; exp += e1;
      hunt++; curve.push({ hunt, income, spend, gold: state.gold, stage: id });
    }
    return { gold, exp, n };
  };
  for (const rec of recRows) {
    const id = rec.stageId, st = Progress.stageById(id);
    // 0) 이 단계 장비를 맞추기 전에 하는 재도전 (PLAN_RE)
    const reDone = (B.PLAN_RE[id] || []).map(([sid, tier, n]) => { const r = reHunt(sid, tier, n, id); return `${sid}단계 ${STAGES.RECHALLENGE[tier].label} ×${n} (성공 ${Math.round((reRows[`${sid}r${tier}`]?.success || 0) * 100)}%)`; });
    const lvIn = Progress.levelFromExp(state.exp).level;
    // 1) 이 단계 권장 장비·마을로 맞춘다 (모자라도 계속 진행하고 부족분을 기록)
    const [g, e] = st.REC_GEAR, buys = [...reDone];
    const needVillage = EQUIPMENT.GRADES[g].REQ_VILLAGE;
    while (state.village < needVillage) {
      const L = VILLAGE_UPGRADES.LEVELS[state.village + 1];
      pay(L.cost, `마을 Lv${state.village + 1}`, id); useMats(L.mats, `마을 Lv${state.village + 1}`, id);
      state.village++; buys.push(`마을 Lv${state.village} (${L.cost}G)`);
    }
    if (g > state.grade) {
      const r = EQUIPMENT.RECIPES[g], cost = r.weapon.gold + r.armor.gold * B.ARMOR_SLOTS.length;
      pay(cost, `${g}등급 세트`, id);
      useMats(r.weapon.mats, `${g}등급 무기`, id);
      for (let i = 0; i < B.ARMOR_SLOTS.length; i++) useMats(r.armor.mats, `${g}등급 방어구`, id);
      state.grade = g; state.enh = 0; buys.push(`${g}등급 세트 (${cost}G)`);
    }
    if (e > state.enh) {
      const disc = VILLAGE_UPGRADES.FACILITIES.SMITHY.enhDiscount[state.village - 1] || 0;
      let cost = 0;
      for (let n = state.enh + 1; n <= e; n++) cost += Math.round(EQUIPMENT.ENH.COST[state.grade - 1] * n * (1 + EQUIPMENT.ENH.ARMOR_K * B.ARMOR_SLOTS.length) * (1 - disc));
      pay(cost, `${state.grade}등급 +${e}`, id); state.enh = e; buys.push(`강화 +${e} (${cost}G)`);
    }
    const goldAfterBuys = state.gold;
    // 2) 첫 클리어까지 시도 + 반복
    const tries = Math.min(B.MAX_TRIES, rec.success > 0 ? 1 / rec.success : B.MAX_TRIES);
    // 첫 클리어: 실패한 시도 (tries − 1)회 → 성공 1회. 그 뒤 반복은 성공률만큼 성공
    const plan = [];
    if (tries > 1 + 1e-6) plan.push({ first: true, win: false, w: tries - 1 });
    plan.push({ first: true, win: true, w: 1 });
    for (let i = 0; i < B.PLAN_REPEATS[id - 1]; i++) plan.push({ first: false, w: 1 });
    let gIn = 0, gOut = 0, expIn = 0, hunts = 0;
    const matsIn = {};
    plan.forEach((h) => {
      const isFirstWin = h.first && h.win;
      const pWin = h.first ? (h.win ? 1 : 0) : rec.success;
      const w = h.w;
      hunts += w; hunt += w;
      const goldWin = st.GOLD * (isFirstWin ? R0.FIRST_CLEAR_GOLD_K : 1) * (1 + R0.STAR_GOLD_K * rec.starExp / Math.max(rec.success, 1e-9))
        + BUN.goldPerVillageLv * state.village * B.BUNDLES_PER_CLEAR;
      const gold = w * pWin * goldWin, up = w * st.UPKEEP;
      const expWin = st.EXP * (E.KILL_K + E.CLEAR_K + E.VILLAGE_K * (rec.star[1] / Math.max(rec.success, 1e-9)) + E.SHELTER_K * 0.5 + (isFirstWin ? E.FIRST_K : 0));
      const partsExp = st.EXP * E.PART_K * Object.values(rec.breakRate).reduce((a, b) => a + b, 0);
      const expFail = st.EXP * (E.CLEAR_K * E.FAIL_CLEAR_K);
      const exp = w * (pWin * expWin + (1 - pWin) * expFail + partsExp);
      const win = expectedDrops(id, rec, true, isFirstWin), lose = expectedDrops(id, rec, false, false);
      const sup = VILLAGE_UPGRADES.LEVELS[state.village].supply;
      for (const [m, n] of Object.entries(win)) matsIn[m] = (matsIn[m] || 0) + w * pWin * n;
      for (const [m, n] of Object.entries(lose)) matsIn[m] = (matsIn[m] || 0) + w * (1 - pWin) * n;
      for (const [m, n] of Object.entries(sup)) matsIn[m] = (matsIn[m] || 0) + w * pWin * n;
      state.gold += gold - up; income += gold; spend += up; gIn += gold; gOut += up; state.exp += exp; expIn += exp;
      curve.push({ hunt, income, spend, gold: state.gold, stage: id });
    });
    addMats(state.mats, matsIn);
    rows.push({ stageId: id, lvIn, recLv: st.REC_LV, lvOut: Progress.levelFromExp(state.exp).level, hunts, tries, gIn, gOut, buys, gold: state.gold, goldAfterBuys, expIn, matsIn });
  }
  return { rows, curve, shortages, final: state };
}

// ---------- 경고 ----------
function warnings(table, eco) {
  const B = BALANCE_CONFIG, W = [];
  let prev = null;
  for (const id of STAGES.LIST.map((s) => s.id)) {
    const r = table[id].rec, tgt = B.TARGET_MIN[id - 1] * 60, t = r.tMed;
    if (r.success >= B.EASY.SUCCESS && t < tgt * B.EASY.TIME_K) W.push({ lv: 'easy', stageId: id, text: `${id}단계 너무 쉬움 — 성공 ${(r.success * 100).toFixed(0)}%, ${fmtT(t)} (목표 ${fmtT(tgt)})` });
    if (r.success < B.HARD.SUCCESS) W.push({ lv: 'hard', stageId: id, text: `${id}단계 너무 어려움 — 권장 조합 성공률 ${(r.success * 100).toFixed(0)}% (사망 ${(r.outcomes.death * 100).toFixed(0)}% · 시간 초과 ${(r.outcomes.time * 100).toFixed(0)}% · 마을 붕괴 ${((r.outcomes.village + r.outcomes.extra) * 100).toFixed(0)}%)` });
    else if (t > tgt * B.HARD.TIME_K) W.push({ lv: 'hard', stageId: id, text: `${id}단계 너무 김 — ${fmtT(t)} (목표 ${fmtT(tgt)}의 ${(t / tgt).toFixed(1)}배)` });
    if (prev && prev.success - r.success > B.STEP_JUMP) W.push({ lv: 'hard', stageId: id, text: `${id}단계 난이도 급등 — 성공률 ${(prev.success * 100).toFixed(0)}% → ${(r.success * 100).toFixed(0)}%` });
    const gm = table[id].gm;
    if (gm && gm.success >= r.success - 0.02 && id > 2 && Progress.stageById(id).REC_GEAR[0] > 1) W.push({ lv: 'info', stageId: id, text: `${id}단계 장비 등급 영향이 작음 — 한 등급 낮아도 성공 ${(gm.success * 100).toFixed(0)}%` });
    prev = r;
  }
  let incomeSum = STAGES.RULES.START_GOLD;
  eco.rows.forEach((row, i) => {   // 재화 과잉: 다음 단계 장비·마을을 사고도 돈이 많이 남음 (마지막 단계는 엔딩 후 자금이라 제외)
    incomeSum += row.gIn;
    const next = eco.rows[i + 1];
    if (next && next.goldAfterBuys > Math.max(incomeSum * B.GOLD_SURPLUS_K, B.GOLD_SURPLUS_MIN)) W.push({ lv: 'easy', stageId: next.stageId, text: `재화 과잉 — ${next.stageId}단계 준비를 마치고도 ${Math.round(next.goldAfterBuys)} G 남음 (누적 수입의 ${Math.round(next.goldAfterBuys / incomeSum * 100)}%)` });
  });
  for (const row of eco.rows) if (row.lvIn < row.recLv) W.push({ lv: 'hard', stageId: row.stageId, text: `${row.stageId}단계 진입 레벨 부족 — 계획 경로에서 Lv ${row.lvIn} (권장 ${row.recLv})` });
  const seen = new Set();
  for (const s of eco.shortages) {
    const key = `${s.stageId}|${s.kind}|${s.mat || ''}`;
    if (seen.has(key)) continue; seen.add(key);
    if (s.kind === 'gold') W.push({ lv: 'mat', stageId: s.stageId, text: `자금 병목 — ${s.stageId}단계 전 ${s.what}에서 ${Math.round(s.short)} G 부족` });
    else W.push({ lv: 'mat', stageId: s.stageId, text: `재료 병목 — ${s.stageId}단계 전 ${s.what}: ${MATERIALS[s.mat].name} ${s.have.toFixed(1)} / ${s.need} (${MATERIALS[s.mat].source})` });
  }
  return W;
}
const fmtT = (s) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : '—');

// ---------- 전체 실행 ----------
export async function runBalance(cfg, opts = {}, onProgress = () => {}) {
  const B = BALANCE_CONFIG, job = opts.job || B.JOB, runs = opts.runs || B.RUNS;
  const rng = rngFrom(B.SEED);
  const table = {}, t0 = performance.now();
  for (const st of STAGES.LIST) {
    table[st.id] = {};
    for (const b of B.BUILDS) table[st.id][b.key] = runCase(st.id, buildFor(st.id, b, job), cfg, runs, rng);
    onProgress(st.id / (STAGES.LIST.length + 1));
    await new Promise((r) => setTimeout(r, 0));   // 화면이 멈추지 않게
  }
  // 재도전: 계획 경로에 들어가는 것 + 모든 단계의 재도전 Ⅰ·Ⅱ (조합 = RE_BUILD_FROM 단계 권장 + 레벨 RE_LV_PLUS, Ⅱ는 최종 단계 권장 조합)
  const reRows = {}, last = STAGES.LIST.length;
  const reBuild = (tier) => {
    const b = buildFor(tier === 2 ? last : B.RE_BUILD_FROM, B.BUILDS[0], job);
    return tier === 2 ? { ...b, lv: clamp(b.lv + B.RE2_LV_PLUS, 1, HUNTERS.LEVEL.MAX), enh: B.RE2_ENH } : { ...b, lv: clamp(b.lv + B.RE_LV_PLUS, 1, HUNTERS.LEVEL.MAX) };
  };
  for (const st of STAGES.LIST) for (const tier of Object.keys(STAGES.RECHALLENGE).map(Number)) {
    if (STAGES.RECHALLENGE[tier].SKIP.includes(st.id)) continue;
    reRows[`${st.id}r${tier}`] = runCase(st.id, reBuild(tier), cfg, Math.max(50, Math.round(runs / 2)), rng, tier);
  }
  onProgress(1);
  const eco = economy(STAGES.LIST.map((s) => table[s.id].rec), reRows);
  return { job, runs, table, reRows, eco, warnings: warnings(table, eco), ms: performance.now() - t0 };
}

// ---------- 화면 (?balance=1) ----------
const CSS = `
#bal { position: fixed; inset: 0; z-index: 40; overflow: auto; background: var(--bg, #1c2129); color: var(--ink, #f3e6cf);
  padding: calc(env(safe-area-inset-top, 0px) + 14px) 16px calc(env(safe-area-inset-bottom, 0px) + 24px); font-size: 13px; line-height: 1.5; }
#bal h1 { font-size: 20px; margin: 0 0 4px; } #bal h2 { font-size: 16px; margin: 20px 0 6px; }
#bal .muted { color: var(--ink-dim, #f3e6cf99); font-size: 12px; }
#bal .ctl { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin: 10px 0; }
#bal select, #bal button { min-height: 44px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--line, #f3e6cf40); background: #141a22; color: inherit; font: inherit; }
#bal button.go { border-color: #ffd75e; color: #ffd75e; }
#bal .scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; border: 1px solid #f3e6cf22; border-radius: 10px; }
#bal table { border-collapse: collapse; width: 100%; min-width: 560px; font-size: 12px; }
#bal th, #bal td { padding: 6px 6px; border-bottom: 1px solid #f3e6cf1a; text-align: right; white-space: nowrap; }
#bal th:first-child, #bal td:first-child { text-align: left; position: sticky; left: 0; background: #181d25; }
#bal th { color: var(--ink-dim, #f3e6cf99); font-weight: 600; background: #181d25; }
#bal .easy { color: #8fd0ff; } #bal .hard { color: #ff9a7a; } #bal .ok { color: #a8e08a; } #bal .mat { color: #ffcf70; }
#bal .tag { display: inline-block; padding: 1px 6px; border-radius: 6px; font-size: 11px; background: #232b38; }
#bal .warn { padding: 8px 10px; border-radius: 10px; background: #141a22; border-left: 3px solid; margin-bottom: 6px; }
#bal .warn.easy { border-color: #8fd0ff; } #bal .warn.hard { border-color: #ff9a7a; } #bal .warn.mat { border-color: #ffcf70; } #bal .warn.info { border-color: #888; color: var(--ink-dim, #aaa); }
#bal .legend span { margin-right: 12px; } #bal .legend i { display: inline-block; width: 12px; height: 3px; vertical-align: middle; margin-right: 4px; }
#bal svg text { fill: var(--ink-dim, #f3e6cf99); font-size: 10px; }
#bal pre { white-space: pre-wrap; font-size: 11px; background: #141a22; padding: 10px; border-radius: 10px; }
`;
const pctS = (x) => `${Math.round(x * 100)}%`;
const cls = (r, id) => {
  const B = BALANCE_CONFIG, tgt = B.TARGET_MIN[id - 1] * 60;
  if (r.success < B.HARD.SUCCESS || r.tMed > tgt * B.HARD.TIME_K) return 'hard';
  if (r.success >= B.EASY.SUCCESS && r.tMed < tgt * B.EASY.TIME_K) return 'easy';
  return 'ok';
};

function chartSVG(curve) {
  const W = 400, H = 240, L = 40, R = 8, T = 10, Bm = 26;   // 세로 화면에서 읽히게 좁고 높게
  const maxX = Math.max(1, curve[curve.length - 1].hunt), vals = curve.flatMap((p) => [p.income, p.spend, p.gold]);
  const maxY = Math.max(1, ...vals), minY = Math.min(0, ...vals);
  const x = (v) => L + (v / maxX) * (W - L - R), y = (v) => T + (1 - (v - minY) / (maxY - minY)) * (H - T - Bm);
  const line = (k, c) => `<polyline fill="none" stroke="${c}" stroke-width="2" points="${curve.map((p) => `${x(p.hunt).toFixed(1)},${y(p[k]).toFixed(1)}`).join(' ')}"/>`;
  let marks = '', last = 0;
  for (const p of curve) if (p.stage && p.stage !== last) { last = p.stage; marks += `<line x1="${x(p.hunt)}" x2="${x(p.hunt)}" y1="${T}" y2="${H - Bm}" stroke="#f3e6cf22"/><text x="${x(p.hunt) + 2}" y="${H - Bm + 12}">${p.stage}</text>`; }
  const ticks = [minY, 0, maxY / 2, maxY].filter((v, i, a) => a.indexOf(v) === i).map((v) => `<text x="${L - 4}" y="${y(v) + 3}" text-anchor="end">${Math.round(v / 100) / 10}k</text><line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#f3e6cf14"/>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:760px;display:block" role="img" aria-label="누적 골드 수입·지출·잔액 곡선">${ticks}${marks}` +
    `${line('income', '#a8e08a')}${line('spend', '#ff9a7a')}${line('gold', '#ffd75e')}<text x="${W - R}" y="${H - 4}" text-anchor="end">사냥 횟수 (세로선 = 단계)</text></svg>`;
}

function render(el, res, cfgText) {
  const B = BALANCE_CONFIG, ids = STAGES.LIST.map((s) => s.id);
  const W = res.warnings;
  // 경고를 종류별로: 어려움 → 쉬움 → 성장·자금·재료 → 참고(접어 둠)
  const groups = [['hard', '너무 어려운 구간'], ['easy', '너무 쉬운 구간'], ['mat', '자금·재료 병목']];
  const wHTML = (W.length ? '' : '<div class="warn info">경고 없음</div>') +
    groups.map(([lv, name]) => { const g = W.filter((w) => w.lv === lv); return g.length ? `<div class="muted" style="margin:8px 0 4px">${name} ${g.length}</div>${g.map((w) => `<div class="warn ${lv}">${w.text}</div>`).join('')}` : ''; }).join('') +
    (W.some((w) => w.lv === 'info') ? `<details><summary class="muted" style="min-height:44px;display:flex;align-items:center">참고 ${W.filter((w) => w.lv === 'info').length}</summary>${W.filter((w) => w.lv === 'info').map((w) => `<div class="warn info">${w.text}</div>`).join('')}</details>` : '');
  const main = ids.map((id) => {
    const r = res.table[id].rec, st = Progress.stageById(id), sp = MONSTERS.SPECIES[st.monsterId], c = cls(r, id);
    return `<tr><td>${id} ${sp.short} <span class="tag">${sp.GIMMICK.name}</span></td>` +
      `<td class="${c}"><b>${fmtT(r.tMed)}</b> <span class="muted">/ ${fmtT(B.TARGET_MIN[id - 1] * 60)}</span></td><td class="${c}"><b>${pctS(r.success)}</b></td>` +
      `<td><span class="tag ${c}">${{ easy: '쉬움', ok: '적정', hard: '어려움' }[c]}</span></td><td class="muted">${fmtT(r.tP25)}–${fmtT(r.tP75)}</td>` +
      `<td>${pctS(r.outcomes.death)}</td><td>${pctS(r.outcomes.time)}</td><td>${pctS(r.outcomes.village + r.outcomes.extra)}</td>` +
      `<td>${pctS(r.star[2])}</td><td>${Math.round(r.village)}%</td><td>${r.potions.toFixed(1)}</td>` +
      `<td>Lv${r.build.lv} · ${r.build.grade}등급+${r.build.enh}</td><td>${r.monsterHp}</td><td>${r.hp} / ×${r.atk.toFixed(2)} / ${r.def}</td></tr>`;
  }).join('');
  const matrix = ids.map((id) => `<tr><td>${id} ${MONSTERS.SPECIES[Progress.stageById(id).monsterId].short}</td>` + B.BUILDS.map((b) => {
    const r = res.table[id][b.key], c = cls(r, id);
    return `<td class="${c}">${pctS(r.success)} · ${fmtT(r.tMed)}</td>`;
  }).join('') + '</tr>').join('');
  const eco = res.eco.rows.map((r) => `<tr><td>${r.stageId}</td><td>${r.hunts.toFixed(1)} <span class="muted">(첫 클리어 ${r.tries.toFixed(1)})</span></td>` +
    `<td class="ok">+${Math.round(r.gIn)}</td><td class="hard">−${Math.round(r.gOut)}</td><td>${r.buys.join(', ') || '—'}</td>` +
    `<td class="${r.gold < 0 ? 'hard' : ''}"><b>${Math.round(r.gold)}</b></td><td class="${r.lvIn < r.recLv ? 'hard' : ''}">${r.lvIn} → ${r.lvOut} <span class="muted">(권장 ${r.recLv})</span></td></tr>`).join('');
  const matKeys = Object.keys(MATERIALS);
  const matRows = res.eco.rows.map((r) => `<tr><td>${r.stageId}</td><td style="text-align:left;white-space:normal">${matKeys.filter((m) => (r.matsIn[m] || 0) >= 0.05)
    .map((m) => `${MATERIALS[m].name} ${(r.matsIn[m]).toFixed(1)}`).join(' · ')}</td></tr>`).join('');
  el.innerHTML = `
    <h1>⚖ 밸런스 시뮬레이터</h1>
    <div class="muted">직업 ${HUNTERS.JOBS[res.job].name} · 조합당 ${res.runs}회 · ${(res.ms / 1000).toFixed(1)}초 · 시드 ${B.SEED}. 수치는 data/progression.js와 게임 설정표(MONSTER_CONFIG 등)에서, 플레이 가정은 src/balance.js의 BALANCE_CONFIG에서 읽는다.</div>
    <div class="ctl">
      <select id="bal-job" aria-label="직업">${Object.entries(HUNTERS.JOBS).map(([k, j]) => `<option value="${k}"${k === res.job ? ' selected' : ''}>${j.icon} ${j.name} (${j.weapon})</option>`).join('')}</select>
      <select id="bal-runs" aria-label="시뮬레이션 횟수">${[100, 300, 1000].map((n) => `<option${n === res.runs ? ' selected' : ''}>${n}</option>`).join('')}</select>
      <button class="go" id="bal-go">다시 계산</button><button id="bal-exit">게임으로</button>
    </div>
    <h2>경고 (${W.filter((w) => w.lv !== 'info').length})</h2>${wHTML}
    <h2>단계별 권장 조합</h2>
    <div class="muted">시간은 클리어한 사냥만 (중앙값, 25–75%). 실패 = 사망 · 시간 초과 · 마을 붕괴(추가 조건 포함). ★3 = 목표 시간 안 처치.</div>
    <div class="scroll"><table><tr><th>단계</th><th>예상 / 목표</th><th>성공</th><th>판정</th><th>범위</th><th>사망</th><th>시간 초과</th><th>마을</th><th>★3</th><th>마을 남음</th><th>회복약</th><th>조합</th><th>몬스터 HP</th><th>HP / 공격 / 방어</th></tr>${main}</table></div>
    <h2>조합 비교 (성공률 · 예상 시간)</h2>
    <div class="muted">권장 기준에서 레벨·장비를 바꿨을 때. '장비 −1등급'은 한 등급 낮은 장비를 +${EQUIPMENT.ENH.MAX - 1}까지 강화한 상태.</div>
    <div class="scroll"><table><tr><th>단계</th>${B.BUILDS.map((b) => `<th>${b.label}</th>`).join('')}</tr>${matrix}</table></div>
    <h2>재도전 (강화 · 고대)</h2>
    <div class="muted">Ⅰ = ${B.RE_BUILD_FROM}단계 권장 조합 + Lv ${B.RE_LV_PLUS}, Ⅱ(엔딩 후) = 최종 단계 권장 조합 + Lv ${B.RE2_LV_PLUS} · 강화 +${B.RE2_ENH}. 고대 핵편 = 클리어 1회 기대값.</div>
    <div class="scroll"><table style="min-width:420px"><tr><th>단계</th><th>재도전</th><th>성공</th><th>예상 시간</th><th>고대 핵편</th></tr>${Object.values(res.reRows).map((r) => {
      const R = STAGES.RECHALLENGE[r.tier], shards = expectedDrops(r.stageId, r, true, false, r.tier)[ITEMS.BREAK_DROP.ANCIENT_MAT] || 0;
      return `<tr><td>${r.stageId} ${MONSTERS.SPECIES[Progress.stageById(r.stageId).monsterId].short}</td><td>${R.label}</td><td class="${r.success < B.HARD.SUCCESS ? 'hard' : 'ok'}">${pctS(r.success)}</td><td>${fmtT(r.tMed)}</td><td>${shards.toFixed(1)}</td></tr>`;
    }).join('')}</table></div>
    <h2>재화 곡선 (계획 경로)</h2>
    <div class="muted">첫 클리어까지 1/성공률 회 시도 + 반복 ${B.PLAN_REPEATS.join('·')}회. 각 단계 전에 권장 장비 세트(무기 + 방어구 3)·강화·마을 레벨을 맞춘다.</div>
    <div class="legend muted"><span><i style="background:#a8e08a"></i>누적 수입</span><span><i style="background:#ff9a7a"></i>누적 지출</span><span><i style="background:#ffd75e"></i>잔액</span></div>
    ${chartSVG(res.eco.curve)}
    <div class="scroll"><table><tr><th>단계</th><th>사냥</th><th>수입</th><th>유지비</th><th>단계 전 구매</th><th>잔액</th><th>레벨</th></tr>${eco}</table></div>
    <h2>단계별 기대 재료 획득</h2>
    <div class="scroll"><table style="min-width:0"><tr><th>단계</th><th style="text-align:left">재료 (그 단계 사냥 전체 기대값)</th></tr>${matRows}</table></div>
    <h2>가정 (BALANCE_CONFIG)</h2><pre>${cfgText}</pre>`;
}

export async function mount(cfg) {
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const el = document.createElement('div'); el.id = 'bal'; document.body.appendChild(el);
  const params = new URLSearchParams(location.search);
  const run = async (job, runs) => {
    el.innerHTML = '<h1>⚖ 밸런스 시뮬레이터</h1><div class="muted" id="bal-prog">계산 중…</div>';
    const res = await runBalance(cfg, { job, runs }, (p) => { const e = document.getElementById('bal-prog'); if (e) e.textContent = `계산 중… ${Math.round(p * 100)}%`; });
    const cfgText = JSON.stringify(BALANCE_CONFIG, null, 2);
    render(el, res, cfgText);
    console.info(`[BALANCE] ${HUNTERS.JOBS[job].name} ${runs}회 × ${STAGES.LIST.length}단계 × ${BALANCE_CONFIG.BUILDS.length}조합 — ${res.ms.toFixed(0)}ms, 경고 ${res.warnings.length}`, res);
    window.__balance = res;
    document.getElementById('bal-go').onclick = () => run(document.getElementById('bal-job').value, +document.getElementById('bal-runs').value);
    document.getElementById('bal-exit').onclick = () => { const u = new URL(location.href); u.searchParams.delete('balance'); location.href = u.toString(); };
  };
  const job = HUNTERS.JOBS[params.get('job')] ? params.get('job') : BALANCE_CONFIG.JOB;
  await run(job, parseInt(params.get('runs'), 10) || BALANCE_CONFIG.RUNS);
}
