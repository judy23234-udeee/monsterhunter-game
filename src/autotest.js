// ============================================================
// 자동 플레이 테스트 봇 — index.html?autotest=1 에서만 동작 (배포 빌드 tools/build-dist.ps1 에서 제외)
//   새로 시작 → 출동 → 몬스터에게 이동 → 예고에 구르기 → 경직 때 약점 공격 → 클리어 → 결과
//   → 제작·강화 → 다음 단계 … → 마지막 단계(엔딩)까지. 매 사냥을 기록하고 이상이 보이면 즉시 실패 판정.
//
//   주소 옵션
//     &speed=1~10        가상 시간 배속 (기본 5). 게임 시계를 고정 걸음으로 빠르게 돌린다
//     &skill=weak|normal|strong   봇 실력: 예고마다 회피에 실패할 확률 40% · 20% · 5%
//     &reset=1           처음부터 (봇 전용 저장을 지우고 시작). 없으면 이전 실행을 이어감
//     &appswitch=n       n단계 사냥 중 앱 전환(화면 숨김 → 복귀)을 흉내
//     &midreload=n       n단계 사냥 도중 새로고침 → 저장이 사냥 전 그대로이고 다시 시작되는지
//     &reload=n          n단계 클리어 직후 새로고침 → 이어하기(진행·레벨·골드 유지) 확인
//     &quick=1           흐름 점검: 사냥 몇 초 뒤 몬스터 HP를 1로 (밸런스가 아니라 클리어→정비→다음→엔딩 흐름만 확인)
//   저장: 사용자 저장(mh_save)과 분리된 mh_autotest_save 만 쓴다. 결과는 localStorage mh_autotest_report
// ============================================================
export const AUTOTEST_CONFIG = {
  DT: 1 / 60,                // 초, 가상 시간 한 걸음
  MAX_STEPS: 90,             // 한 번 깨어날 때 최대 걸음 수 (느린 기기에서 밀림 방지)
  RENDER_MS: 50,             // ms, 화면은 이 간격으로만 그림 (시뮬레이션은 계속)
  SPEED: { DEFAULT: 5, MIN: 1, MAX: 10 },
  SKILL: {                   // FAIL: 예고 1번마다 회피에 실패할 확률
    weak: { label: '약함', FAIL: 0.40 },
    normal: { label: '보통', FAIL: 0.20 },
    strong: { label: '강함', FAIL: 0.05 },
  },
  DEFAULT_SKILL: 'normal',
  DEFAULTS: { appswitch: 2, midreload: 4, reload: 3 },   // 이어하기 시험을 할 단계 (0이면 안 함)

  // --- 전투 ---
  DODGE_AT: 0.6,             // 예고 진행률이 이만큼 지나면 구르기 (일찍 구르면 무적이 끝나 맞음)
  DANGER_PAD: 1.0,           // 유닛, 위험 범위 판정 여유
  CIRCLE_STATES: ['slamWind', 'eruptWind', 'diveAim', 'dive'],   // 원형 예고가 진짜 위험한 몬스터 상태
  LANE_STATES: ['chargeWind', 'charge'],                         // 돌진 예고
  REACH_K: 0.85,             // 무기 사거리의 이 비율 안으로 들어가 때림
  RANGED_K: 0.7,             // 원거리 무기는 사거리의 이 비율에서 쏨
  POTION_AT: 0.45,           // 체력 비율, 이 아래면 회복약
  UNSTICK: { MOVED: 0.3, AFTER_S: 0.6, SIDE_S: 0.7 },   // 유닛 · 게임 초: 이만큼 못 움직이면 → 이 시간 동안 옆걸음
  GUARD: { PAD: 2, DIST: 4 },   // 유닛: 몬스터가 건물에서 (건물 반지름 + 내려찍기 반경 + PAD) 안이면 · 몬스터 너머 이 거리로 돌아 섬
  INTERCEPT_K: 2.5,        // 마을 습격 중 목표 부위가 사거리 × 이 값보다 멀면 앞질러 막으러 감
  INTERCEPT_D: 4.0,          // 유닛, 습격 목표에서 몬스터 쪽으로 이만큼 나가 선다

  // --- 사냥 사이 ---
  POTIONS: 3,                // 사냥 전 회복약 개수
  QUICK_ITEMS: ['POTION', 'LURE_CRACKER', 'SNARE'],   // 퀵슬롯 3칸 (열린 것만, 산 만큼). 회복약 다음은 최대치까지 삼
  SNARE_NEAR: 6,             // 유닛, 나를 쫓는 몬스터가 이보다 가까우면 발밑에 함정
  GOLD_RESERVE: 150,         // G, 강화 뒤 남겨 둘 돈 (회복약용)
  FARM_LV_GAP: 2,            // 실패했을 때 권장 레벨보다 이만큼 낮으면 앞 단계를 한 번 더 (경험치 벌기)
  FARM_MATS_MAX: 3,          // 회, 무기가 다음 단계 권장 등급보다 낮을 때 다음 등급 재료를 모으려고 앞 단계를 다시 하는 최대 횟수 (등급마다)
  FARM_GOLD_MAX: 4,          // 회, 재료는 다 있고 골드만 모자랄 때 앞 단계를 다시 하는 최대 횟수 (목표마다, 13-9 계획 경로의 반복 2~3회)
  MAX_HUNTS: 120,            // 이만큼 사냥해도 엔딩에 못 가면 막힘

  // --- 이상 감지 (자동 실패) ---
  LOAD_TIMEOUT_S: 10,        // 초(실제), 페이지 시작 → 몬스터 준비
  STUCK_FAILS: 5,            // 같은 단계 연속 실패 횟수
  HUNT_TIMEOUT_S: 1500,      // 초(게임), 한 사냥이 이보다 길면 막힘
  OUT_OF_MAP_PAD: 1.0,       // 유닛, 몬스터가 판(PLATE_LIMIT) 밖으로 이만큼 나가면 이탈
  HOUSE_STUCK_K: 0.6,        // 사냥꾼이 집 반지름 × 이 값 안에
  HOUSE_STUCK_S: 1.5,        //   이 시간(게임 초) 넘게 있으면 끼임
  APP_SWITCH: { AFTER_S: 20, PAUSE_MS: 2500, CHECK_S: 2 },   // 사냥 시작 뒤 게임 초 · 숨김 시간(실제 ms) · 복귀 뒤 확인 게임 초
  MID_RELOAD_AFTER_S: 25,    // 게임 초, 사냥 시작 뒤 이만큼 지나면 새로고침
  QUICK: { KILL_S: 4, RELOAD_S: 2 },   // &quick=1 흐름 점검: 게임 초 — 이때 몬스터 HP를 1로 · 사냥 도중 새로고침 시점

  STATE_KEY: 'mh_autotest_state',     // sessionStorage: 새로고침을 넘어 이어지는 봇 상태
  REPORT_KEY: 'mh_autotest_report',   // localStorage: 마지막 결과 (JSON)
};
const C = AUTOTEST_CONFIG;
const SLOTS = ['weapon', 'head', 'body', 'legs', 'charm'];   // 장비 칸 (무기를 먼저 제작·강화)

const loadState = () => { try { return JSON.parse(sessionStorage.getItem(C.STATE_KEY)); } catch (e) { return null; } };
const saveState = (s) => sessionStorage.setItem(C.STATE_KEY, JSON.stringify(s));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fin = (...v) => v.every((x) => Number.isFinite(x));
const hex = (c) => (Number.isFinite(c) ? '#' + c.toString(16).padStart(6, '0') : String(c));

export function startAutotest(api) {
  const { AT, PARAMS } = api;
  const param = (k, d) => (PARAMS.has(k) ? PARAMS.get(k) : d);

  // ---------- 상태 (새로고침을 넘어 유지) ----------
  let S = loadState();
  if (param('reset', '0') === '1') {
    // 처음부터: 봇 전용 저장을 지우고 주소에서 reset을 뺀 뒤 다시 불러온다 (사용자 저장은 그대로)
    localStorage.removeItem(api.SAVE_CONFIG.AUTOTEST_KEY);
    const skill = C.SKILL[param('skill')] ? param('skill') : C.DEFAULT_SKILL;
    const speed = Math.min(C.SPEED.MAX, Math.max(C.SPEED.MIN, +param('speed', C.SPEED.DEFAULT) || C.SPEED.DEFAULT));
    const num = (k) => +param(k, C.DEFAULTS[k]) || 0;
    S = { runId: Date.now(), startedAt: new Date().toISOString(), realStart: Date.now(), speed, skill,
      tests: { appswitch: num('appswitch'), midreload: num('midreload'), reload: num('reload') }, quick: param('quick', '0') === '1',
      next: { id: 1, tier: 0 }, fails: {}, records: [], anomalies: [], resume: [], seen: [], pending: null, done: false, verdict: null };
    saveState(S);
    const u = new URL(location.href); u.searchParams.delete('reset'); u.searchParams.delete('stage'); u.searchParams.delete('re');
    location.replace(u.toString());
    return;
  }
  if (!S) { console.warn('[AUTOTEST] 상태 없음 → &reset=1 로 시작하세요'); return; }
  if (S.done) { showReport(S); return; }

  // ---------- 가상 시간 루프 ----------
  Object.assign(AT, { DT: C.DT, MAX_STEPS: C.MAX_STEPS, RENDER_MS: C.RENDER_MS, speed: S.speed, paused: false });
  const ch = new MessageChannel();
  let loopFn = null;
  ch.port1.onmessage = () => { const f = loopFn; loopFn = null; if (f) f(performance.now()); };
  AT.next = (f) => { loopFn = f; ch.port2.postMessage(0); };   // 화면이 숨겨져도 멈추지 않는 스케줄러

  const rec = {   // 이번 사냥 기록
    stage: null, tier: 0, monsterId: null, model: null, kind: null, loadSec: null, dmg: 0, prevHp: null,
    huntStart: null, huntClock0: null, houseStuck: 0, dodges: { tried: 0, failedOnPurpose: 0 },
  };
  let finished = false, lastErrors = 0;
  const fail = (what, detail) => {
    if (finished) return;
    S.anomalies.push({ stage: rec.stage, tier: rec.tier, what, detail, at: new Date().toISOString() });
    console.error(`[AUTOTEST] 이상 감지 — ${what}: ${detail}`);
    finish('FAIL');
  };
  function finish(verdict) {
    if (finished) return;
    finished = true; AT.tick = null;
    S.done = true; S.verdict = verdict; S.realSec = Math.round((Date.now() - S.realStart) / 1000);
    saveState(S);
    try { localStorage.setItem(C.REPORT_KEY, JSON.stringify(S)); } catch (e) { /* 저장소 없음 */ }
    showReport(S);
  }

  // ---------- 전투 입력 (가상 시간 걸음마다) ----------
  const rand = Math.random;
  const failRate = C.SKILL[S.skill].FAIL;
  let dangerId = null, dodgeOk = true, freezeOk = true, lastState = '';
  const v = { x: 0, z: 0 };
  // 퀵슬롯 아이템 쓰기 (남은 개수·쿨다운을 먼저 봐서 '없어요' 안내가 연달아 뜨지 않게)
  function quick(k) {
    const Q = api.QS, i = Q.slots.indexOf(k);
    if (i < 0 || Q.global > 0 || (Q.cd[k] || 0) > 0) return;
    if ((api.save.inventory.items[k] || 0) - (Q.used[k] || 0) <= 0) return;
    api.useQuick(i);
  }
  // 걸음이 막히면(발·건물에 걸려 제자리) 잠깐 옆으로 비켜 돈다
  const unstick = { x: 0, z: 0, t: 0, side: 0, sideT: 0 };
  function move(dx, dz) {
    const len = Math.hypot(dx, dz), P = api.PS.pos;
    if (len < 1e-3) { api.input.jx = api.input.jz = 0; unstick.t = 0; return; }
    dx /= len; dz /= len;
    if (Math.hypot(P.x - unstick.x, P.z - unstick.z) > C.UNSTICK.MOVED) { unstick.x = P.x; unstick.z = P.z; unstick.t = 0; }
    else if ((unstick.t += C.DT) > C.UNSTICK.AFTER_S) { unstick.t = 0; unstick.sideT = C.UNSTICK.SIDE_S; unstick.side = rand() < 0.5 ? 1 : -1; }
    if (unstick.sideT > 0) { unstick.sideT -= C.DT; [dx, dz] = [-dz * unstick.side, dx * unstick.side]; }
    api.input.jx = dx * api.SCREEN_RIGHT.x + dz * api.SCREEN_RIGHT.z;   // 월드 방향 → 화면 조이스틱 (카메라 축이 직교)
    api.input.jz = dx * api.SCREEN_DOWN.x + dz * api.SCREEN_DOWN.z;
  }
  function danger() {
    const { dangerCircle: DCi, dangerLane: DL, MS, PS, pose, MONSTER_CONFIG: MC, game } = api;
    // 예고판은 사라지면서도 잠깐 남으므로, 몬스터가 실제로 기를 모으는(·덮치는) 상태일 때만 위험으로 본다
    if (DCi.show > 0 && C.CIRCLE_STATES.includes(MS.state)) {
      const G = game.stage.gimmick, r = Math.max(MC.SLAM.R, (G.R || 0) * MS.sizeK) + C.DANGER_PAD;
      const dx = PS.pos.x - pose.slamPoint.x, dz = PS.pos.z - pose.slamPoint.z;
      return { inside: Math.hypot(dx, dz) < r, progress: DCi.mat.uniforms.uProgress.value, away: [dx || 1, dz] };
    }
    if (DL.show > 0 && C.LANE_STATES.includes(MS.state)) {
      const fx = MS.fwd.x, fz = MS.fwd.z, dx = PS.pos.x - MS.root.x, dz = PS.pos.z - MS.root.z;
      const along = dx * fx + dz * fz, side = -dx * fz + dz * fx;
      const inside = along > -1 && along < MS.laneLen + 1 && Math.abs(side) < MC.CHARGE.W / 2 + C.DANGER_PAD;
      const sgn = side >= 0 ? 1 : -1;
      return { inside, progress: DL.mat.uniforms.uProgress.value, away: [-fz * sgn, fx * sgn] };
    }
    return null;
  }
  function tick() {
    const { MS, PS, input: I, game, monster, MONSTER_CONFIG: MC, PLAYER_CONFIG: PC } = api;
    const clock = api.clock;
    if (!monster || game.over || PS.dead) { move(0, 0); return; }
    // 이상 감지 (매 걸음)
    if (!fin(PS.pos.x, PS.pos.z, PS.hp, MS.root.x, MS.root.z, MS.hp, game.village)) return fail('NaN 수치', `PS(${PS.pos.x},${PS.pos.z},hp ${PS.hp}) MS(${MS.root.x},${MS.root.z},hp ${MS.hp}) 마을 ${game.village}`);
    if (Math.hypot(MS.root.x, MS.root.z) > MC.AI.PLATE_LIMIT + C.OUT_OF_MAP_PAD) return fail('몬스터 맵 이탈', `중심에서 ${Math.hypot(MS.root.x, MS.root.z).toFixed(1)} > ${MC.AI.PLATE_LIMIT}`);
    const inHouse = api.houses.some((h) => h.alive && Math.hypot(PS.pos.x - h.x, PS.pos.z - h.z) < h.r * C.HOUSE_STUCK_K);
    rec.houseStuck = inHouse ? rec.houseStuck + C.DT : 0;
    if (rec.houseStuck > C.HOUSE_STUCK_S) return fail('사냥꾼 건물 끼임', `(${PS.pos.x.toFixed(1)}, ${PS.pos.z.toFixed(1)})`);
    if (rec.huntClock0 !== null && clock - rec.huntClock0 > C.HUNT_TIMEOUT_S) return fail('사냥 막힘', `게임 시간 ${C.HUNT_TIMEOUT_S}초 넘게 안 끝남`);
    if (rec.prevHp !== null && PS.hp < rec.prevHp) rec.dmg += rec.prevHp - PS.hp;
    rec.prevHp = PS.hp;
    if (!game.started) { move(0, 0); return; }
    if (rec.huntClock0 === null) rec.huntClock0 = clock;

    if (PS.grabbed > 0) { I.attackAt = clock; move(0, 0); return; }   // 잡힘: 연타
    // 퀵슬롯: 체력이 낮으면 회복약 · 마을을 노리면 유인 폭죽 · 나를 쫓아 가까이 오면 함정
    if (PS.hp < PC.HP * C.POTION_AT) quick('POTION');
    const toM = Math.hypot(MS.root.x - PS.pos.x, MS.root.z - PS.pos.z);
    if (MS.raid && !(MS.lure && clock < MS.lure.until)) quick('LURE_CRACKER');
    else if (!MS.raid && MS.state === 'chase' && toM < C.SNARE_NEAR) quick('SNARE');

    // 예고 → 회피 (예고 1번마다 실력에 따라 성공/실패를 정함)
    const d = danger();
    const id = d ? `${MS.state}@${Math.round((clock - MS.t) * 10)}` : null;
    if (id && id !== dangerId) { dangerId = id; dodgeOk = rand() >= failRate; rec.dodges.tried++; if (!dodgeOk) rec.dodges.failedOnPurpose++; }
    if (d && d.inside && dodgeOk) {
      move(d.away[0], d.away[1]);
      if (d.progress >= C.DODGE_AT && PS.rollCD <= 0) I.rollAt = clock;
      return;
    }
    // 엘크로 정지: 성공이면 가만히
    if (MS.state !== lastState) { lastState = MS.state; if (MS.state === 'freeze') freezeOk = rand() >= failRate; }
    if (MS.state === 'freeze' && freezeOk) { move(0, 0); return; }
    if (!monster.group.visible) { move(0, 0); return; }   // 땅속·안개 속: 대기 (솟구침은 위 예고로 피함)

    // 약점으로 가서 때림 (경직 땐 가까운 약점, 평소엔 닿는 약점 또는 몸)
    //   닿는 높이의 약점 → 닿는 높이의 몸 → (없으면) 가장 가까운 것 순서
    const rng = game.weapon && game.weapon.RANGED;
    const live = monster.hurt.filter((h) => h.active && !h.climb);   // 등·머리(올라타기 전용)는 땅에서 못 때림
    const low = (h) => h.pos.y - h.r <= (rng ? rng.REACH_Y : PC.ATTACK.REACH_Y);
    const weak = (h) => MC.PARTS[h.id] && !MS.parts[h.id]?.broken;
    const reach = rng ? rng.RANGE * C.RANGED_K : PC.ATTACK.REACH * C.REACH_K;
    const dOf = (h) => Math.hypot(h.pos.x - PS.pos.x, h.pos.z - PS.pos.z) - h.r;
    const near = (list) => list.reduce((b, h) => (!b || dOf(h) < dOf(b) ? h : b), null);
    const inReach = live.filter((h) => low(h) && dOf(h) <= reach);
    const pool = [inReach.filter(weak), inReach, live.filter((h) => weak(h) && low(h)), live.filter(low), live].find((p) => p.length) || [];
    const best = near(pool);
    if (!best) { move(0, 0); return; }
    const dist = dOf(best);
    // 건물 지키기: 내가 몬스터와 가까운 건물 사이에 서 있으면 내려찍기가 건물에 떨어진다 → 몬스터 너머로 돌아 선다
    const hs = api.houses.filter((h) => h.alive);
    const hn = hs.reduce((b, h) => (!b || Math.hypot(h.x - MS.root.x, h.z - MS.root.z) < Math.hypot(b.x - MS.root.x, b.z - MS.root.z) ? h : b), null);
    if (hn && !MS.raid) {
      const dM = Math.hypot(hn.x - MS.root.x, hn.z - MS.root.z), dP = Math.hypot(hn.x - PS.pos.x, hn.z - PS.pos.z);
      if (dM < hn.r + MC.SLAM.R + C.GUARD.PAD && dP < dM) {
        const gx = MS.root.x + ((MS.root.x - hn.x) / (dM || 1)) * C.GUARD.DIST, gz = MS.root.z + ((MS.root.z - hn.z) / (dM || 1)) * C.GUARD.DIST;
        const lim = MC.AI.PLATE_LIMIT, gl = Math.hypot(gx, gz), s = gl > lim ? lim / gl : 1;
        move(gx * s - PS.pos.x, gz * s - PS.pos.z);
        return;
      }
    }
    const R = MS.raid;
    rec.aim = { id: best.id, dist: +dist.toFixed(1), reach: +reach.toFixed(1), y: +best.pos.y.toFixed(1), pool: pool.length };   // 콘솔 확인용
    const mx = R ? MS.root.x - R.x : 0, mz = R ? MS.root.z - R.z : 0, ml = Math.hypot(mx, mz) || 1;
    if (R && dist > reach * C.INTERCEPT_K && ml > C.INTERCEPT_D * 2) {
      // 마을을 노리면 뒤쫓지 말고 몬스터와 목표 사이로 앞질러 가 막는다 (몬스터가 더 빠름). 이미 목표에 붙었으면 그냥 때려 넘어뜨림
      const k = Math.min(ml, C.INTERCEPT_D);
      move(R.x + (mx / ml) * k - PS.pos.x, R.z + (mz / ml) * k - PS.pos.z);
    } else if (dist > reach) move(best.pos.x - PS.pos.x, best.pos.z - PS.pos.z);
    else {
      move(0, 0);
      I.attackAt = clock;
      for (const slot of ['S1', 'S2']) if (api.SK.slots[slot]?.unlocked && api.SK.cd[slot] <= 0) I[slot + 'At'] = clock;
      if (api.SK.slots.ULT?.unlocked && api.SK.gauge >= api.SKILLS.ULT_GAUGE.MAX) I.ULTAt = clock;
    }
  }

  // ---------- 페이지 단계 처리 (실제 시간으로 감시) ----------
  async function run() {
    const t0 = performance.now();
    // 단계 선택 화면이면 다음 단계를 골라 출동
    while (!api.game.stage && !finished) {
      const list = document.getElementById('stage-list');
      if (document.getElementById('stages')?.classList.contains('show') && list?.children.length) {
        await verifyResume();
        if (finished) return;
        if (!pick(S.next)) return fail('단계 선택 실패', `${S.next.id}단계${S.next.tier ? ` 재도전 ${S.next.tier}` : ''} 버튼이 없거나 잠김`);
      }
      if ((performance.now() - t0) / 1000 > C.LOAD_TIMEOUT_S * 2) return fail('로딩 10초 초과', '단계 선택 화면이 안 뜸');
      await sleep(100);
    }
    // 몬스터 로드 대기 (페이지 시작 또는 단계 버튼을 누른 때부터 실제 시간)
    const since = () => (performance.now() - loadFrom) / 1000;
    while (!api.monster && !finished) {
      if (since() > C.LOAD_TIMEOUT_S) return fail('로딩 10초 초과', `${api.game.stage?.id ?? S.next.id}단계 몬스터 준비 ${since().toFixed(1)}초`);
      await sleep(100);
    }
    if (finished) return;
    const s = api.game.stage;
    Object.assign(rec, { stage: s.id, tier: s.tier, monsterId: s.monsterId, model: api.game.monsterLoad, kind: api.monster.kind, loadSec: +since().toFixed(2) });
    checkDuplicate(s);
    AT.tick = tick;
    await afterPendingMidReload();
    // 사냥 감시: 이어하기 시험 + 콘솔 오류 + 결과
    while (!finished) {
      if (api.AT.errors.length > lastErrors) return fail('콘솔 error', api.AT.errors[api.AT.errors.length - 1].slice(0, 300));
      const gameSec = rec.huntClock0 === null ? 0 : api.clock - rec.huntClock0;
      const appPending = !s.tier && S.tests.appswitch === s.id && !S.appswitchDone;
      const midPending = !s.tier && S.tests.midreload === s.id && !S.midreloadDone;
      if (appPending && gameSec > (S.quick ? C.QUICK.RELOAD_S : C.APP_SWITCH.AFTER_S)) await appSwitch();
      if (midPending && gameSec > (S.quick ? C.QUICK.RELOAD_S : C.MID_RELOAD_AFTER_S)) return midReload();
      if (S.quick && !appPending && !midPending && gameSec > C.QUICK.KILL_S) api.MS.hp = Math.min(api.MS.hp, 1);   // 흐름 점검: 다음 한 대로 쓰러짐
      if (api.game.lastResult) break;
      await sleep(100);
    }
    if (finished) return;
    await onResult(api.game.lastResult);
  }
  let loadFrom = AT.bootAt || 0;
  function pick(next) {
    loadFrom = performance.now();   // 선택 화면에 머문 시간은 로딩 시간에서 뺌
    if (next.tier) {
      const R = api.STAGES.RECHALLENGE[next.tier];
      const b = [...document.querySelectorAll('.pill.re')].find((x) => x.getAttribute('aria-label').startsWith(`${next.id}단계 ${R.label}`));
      if (!b) return false;
      b.click(); return true;
    }
    const b = document.querySelector(`#stage-list .stage[data-stage="${next.id}"] .act`);   // 단계 카드의 '출발' 버튼
    if (!b || b.disabled) return false;
    b.click(); return true;
  }
  // 같은 모델·같은 외형이 다른 단계에서 쓰이면 이상
  function checkDuplicate(s) {
    const L = api.game.monsterLoad || {}, look = `${s.body}|${hex(s.color)}|${[].concat(s.eye).map(hex).join(',')}`;
    const me = { stage: s.id, monsterId: s.monsterId, model: s.model || null, look };
    for (const o of S.seen) {
      if (o.stage === s.id) continue;
      if (o.monsterId === me.monsterId) return fail('몬스터 중복', `${o.stage}·${s.id}단계가 같은 monsterId ${me.monsterId}`);
      if (me.model && o.model === me.model) return fail('모델 중복', `${o.stage}·${s.id}단계가 같은 모델 ${me.model}`);
      if (o.look === me.look) return fail('외형 중복', `${o.stage}·${s.id}단계 임시 도형이 같음 (${look})`);
    }
    if (!S.seen.some((o) => o.stage === s.id)) S.seen.push(me);
    saveState(S);
    console.info(`[AUTOTEST] ${s.id}단계${s.tier ? ` 재도전 ${s.tier}` : ''} ${s.monsterId} — ${L.source === 'glb' ? `GLB ${L.url}` : `폴백 (${L.reason})`}, ${api.monster.kind}, 로드 ${rec.loadSec}초`);
  }

  // ---------- 이어하기 시험 ----------
  // 앱 전환: 시뮬레이션을 멈추고 화면이 숨겨진 것처럼 알린 뒤 복귀 → 값이 멀쩡하고 사냥이 계속되는지
  async function appSwitch() {
    S.appswitchDone = true; saveState(S);
    const before = { clock: api.clock, mhp: api.MS.hp, state: api.MS.state };
    AT.paused = true;
    const setHidden = (h) => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => h }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') }); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event(h ? 'blur' : 'focus')); };
    setHidden(true); window.dispatchEvent(new Event('pagehide'));
    await sleep(C.APP_SWITCH.PAUSE_MS);
    setHidden(false); window.dispatchEvent(new Event('pageshow'));
    AT.paused = false; AT.acc = 0;
    const c0 = api.clock;
    while (api.clock - c0 < C.APP_SWITCH.CHECK_S && !api.game.lastResult && !finished) await sleep(50);
    const ok = api.clock > before.clock && fin(api.MS.hp, api.PS.hp, api.MS.root.x) && !api.AT.errors.length;
    S.resume.push({ test: '앱 전환', stage: rec.stage, ok, detail: `숨김 ${C.APP_SWITCH.PAUSE_MS}ms → 복귀 후 게임 시간 ${(api.clock - c0).toFixed(1)}초 진행, 몬스터 ${before.state}→${api.MS.state}` });
    saveState(S);
    if (!ok) fail('앱 전환 뒤 이어하기 실패', S.resume[S.resume.length - 1].detail);
  }
  // 사냥 도중 새로고침: 사냥 중 진행은 저장되지 않아야 하고, 같은 단계로 다시 시작돼야 함
  function midReload() {
    S.midreloadDone = true;
    // 기준은 저장소에 쓰인 값 (메모리의 save에는 사냥 중 부위 파괴 EXP가 이미 더해져 있고, 그건 저장되지 않는 게 맞다)
    const sv = JSON.parse(localStorage.getItem(api.SAVE_CONFIG.KEY));
    S.pending = { kind: 'midreload', stage: rec.stage, snap: { gold: sv.currency.gold, exp: sv.hunter.exp, plays: sv.stages[String(rec.stage)]?.plays || 0 } };
    saveState(S);
    location.reload();
  }
  async function afterPendingMidReload() {
    const P = S.pending;
    if (!P || P.kind !== 'midreload') return;
    const sv = api.save, now = { gold: sv.currency.gold, exp: sv.hunter.exp, plays: sv.stages[String(P.stage)]?.plays || 0 };
    const ok = api.game.stage.id === P.stage && now.gold === P.snap.gold && now.exp === P.snap.exp && now.plays === P.snap.plays;
    S.resume.push({ test: '사냥 도중 새로고침', stage: P.stage, ok, detail: `다시 ${api.game.stage.id}단계 시작, 저장 골드 ${P.snap.gold}→${now.gold} · EXP ${P.snap.exp}→${now.exp} · 도전 ${P.snap.plays}→${now.plays} (그대로여야 함)` });
    S.pending = null; saveState(S);
    if (!ok) fail('새로고침 뒤 이어하기 실패', S.resume[S.resume.length - 1].detail);
  }
  // 클리어 직후 새로고침 → 선택 화면에서 진행·레벨·골드가 그대로인지
  async function verifyResume() {
    const P = S.pending;
    if (!P || P.kind !== 'reload') return;
    const sv = api.save, lv = api.Progress.levelFromExp(sv.hunter.exp).level;
    const ok = !!sv.stages[String(P.stage)]?.cleared && sv.currency.gold === P.snap.gold && sv.hunter.exp === P.snap.exp && lv === P.snap.level
      && api.Progress.stageStatus(sv, P.stage + 1).unlocked;
    S.resume.push({ test: '클리어 뒤 새로고침', stage: P.stage, ok, detail: `${P.stage}단계 클리어 기록 ${!!sv.stages[String(P.stage)]?.cleared}, Lv ${P.snap.level}→${lv}, 골드 ${P.snap.gold}→${sv.currency.gold}, 다음 단계 열림 ${api.Progress.stageStatus(sv, P.stage + 1).unlocked}` });
    S.pending = null; saveState(S);
    if (!ok) fail('새로고침 뒤 이어하기 실패', S.resume[S.resume.length - 1].detail);
  }

  // ---------- 결과 → 기록 → 정비 → 다음 ----------
  async function onResult(R) {
    AT.tick = null;
    const { sum, saved, win, reason } = R, sv = api.save, s = api.game.stage;
    const key = s.tier ? `${s.id}r${s.tier}` : String(s.id);
    if (sum.cleared) S.fails[key] = 0; else S.fails[key] = (S.fails[key] || 0) + 1;
    const gear = manage();   // 제작·강화·마을·회복약
    S.records.push({
      stage: s.id, tier: s.tier, monsterId: s.monsterId, kind: rec.kind,
      model: rec.model?.source === 'glb' ? `GLB ${rec.model.url}` : `폴백 (${rec.model?.reason})`,
      result: sum.cleared ? '클리어' : `실패 — ${reason}${sum.failNote.length ? ` (${sum.failNote.join(', ')})` : ''}`,
      time: win && Number.isFinite(api.game.killTime) ? +api.game.killTime.toFixed(1) : null,
      dmg: Math.round(rec.dmg), fails: S.fails[key], village: Math.round(api.game.village), mhpLeft: Math.max(0, Math.round((api.MS.hp / api.MONSTER_CONFIG.HP) * 100)), stars: sum.stars.filter(Boolean).length,
      exp: sum.expTotal, gold: sum.gold, mats: Object.entries(sum.materials).map(([k, n]) => `${k}×${n}`).join(' '),
      level: sv.hunter.level, saveOk: saved.ok, saveReason: saved.reason, loadSec: rec.loadSec,
      dodges: `${rec.dodges.tried - rec.dodges.failedOnPurpose}/${rec.dodges.tried}`, gear,
    });
    saveState(S);
    if (!saved.ok) return fail('저장 실패', saved.reason);
    if ((S.fails[key] || 0) >= C.STUCK_FAILS) return fail('같은 단계 연속 실패 (막힘)', `${key} ${S.fails[key]}회`);
    const last = api.STAGES.LIST[api.STAGES.LIST.length - 1].id;
    if (sum.cleared && !s.tier && s.id === last) return finish('PASS');   // 엔딩
    if (S.records.length >= C.MAX_HUNTS) return fail('진행 막힘', `사냥 ${S.records.length}번 넘게 엔딩에 못 감`);
    S.next = decideNext(s, sum.cleared);
    // 클리어 뒤 새로고침 시험
    if (sum.cleared && !s.tier && S.tests.reload === s.id && !S.reloadDone) {
      S.reloadDone = true;
      S.pending = { kind: 'reload', stage: s.id, snap: { gold: sv.currency.gold, exp: sv.hunter.exp, level: sv.hunter.level } };
      saveState(S);
      const u = new URL(location.href); u.searchParams.delete('stage'); u.searchParams.delete('re');
      location.replace(u.toString());   // 선택 화면으로 새로 불러옴 → verifyResume
      return;
    }
    saveState(S);
    // 결과 화면의 버튼을 눌러 이동 (다음 단계 / 다시 하기), 그 밖에는 주소로
    await sleep(200);
    const btns = [...document.querySelectorAll('#end-actions button')];
    const want = S.next.tier || s.tier ? null
      : btns.find((b) => b.textContent === `다음 단계 (${S.next.id})` || (S.next.id === s.id && b.textContent === '다시 하기'));
    if (want) { want.click(); return; }
    const u = new URL(location.href);
    u.searchParams.set('stage', S.next.id);
    if (S.next.tier) u.searchParams.set('re', S.next.tier); else u.searchParams.delete('re');
    location.href = u.toString();
  }
  // 다음 사냥: 아직 못 깬 첫 단계. 별이 모자라 잠겼으면 별이 덜 찬 앞 단계를, 실패했는데 레벨이 많이 낮으면 앞 단계를 한 번 더
  function decideNext(s, cleared) {
    const sv = api.save, P = api.Progress, L = api.STAGES.LIST;
    const target = (L.find((st) => !sv.stages[String(st.id)]?.cleared) || L[L.length - 1]).id;
    if (!P.stageStatus(sv, target).unlocked) {
      const cand = L.filter((st) => st.id < target && sv.stages[String(st.id)]?.stars.some((x) => !x)).map((st) => st.id);
      return { id: cand.length ? cand[cand.length - 1] : target - 1, tier: 0, why: '별 모으기' };
    }
    const st = P.stageById(target);
    // 무기가 권장 등급보다 낮고 다음 등급 재료만 모자라면, 그 재료를 주는 깬 단계를 다시 (13-6-3 계획 경로의 반복 사냥)
    // 대장간 레벨에 막혔으면 마을 증축 재료를 모은다
    const goal = weaponGoal(target), vc = P.villageUpgradeCheck(sv);
    const need = !goal ? null : !goal.locked ? { key: `w${goal.g}`, missing: goal.missing, why: `${goal.g}등급 무기 재료` }
      : !vc.max ? { key: `v${vc.next}`, missing: vc.missing, why: `마을 Lv${vc.next} 재료` } : null;
    if (!S.quick && need && need.missing.length && (S.farm?.[need.key] || 0) < C.FARM_MATS_MAX) {
      const src = need.missing.map((m) => L.find((x) => x.id < target && sv.stages[String(x.id)]?.cleared && JSON.stringify(api.MONSTERS.SPECIES[x.monsterId]).includes(`"${m.key}"`))).find(Boolean);
      if (src) {
        S.farm = S.farm || {};
        S.farm[need.key] = (S.farm[need.key] || 0) + 1;
        return { id: src.id, tier: 0, why: need.why };
      }
    }
    // 재료는 다 있고 골드만 모자라면 깬 가장 높은 단계를 다시 (실패한 사냥은 골드를 주지 않는다)
    const cost = !need ? 0 : need.key.startsWith('w') ? P.craftCheck(sv, 'weapon', goal.g).recipe.gold : vc.cost;
    if (!S.quick && need && !need.missing.length && sv.currency.gold < cost && target > 1 && (S.farm?.[`g${need.key}`] || 0) < C.FARM_GOLD_MAX) {
      S.farm = S.farm || {};
      S.farm[`g${need.key}`] = (S.farm[`g${need.key}`] || 0) + 1;
      return { id: target - 1, tier: 0, why: `${need.why.replace(' 재료', '')} 골드` };
    }
    if (!cleared && s.id === target && target > 1 && sv.hunter.level <= st.REC_LV - C.FARM_LV_GAP) return { id: target - 1, tier: 0, why: '경험치 벌기' };
    return { id: target, tier: 0 };
  }
  // 다음 무기 등급 목표: 지금 무기가 목표 단계 권장 등급(REC_GEAR[0])보다 낮을 때 다음 등급 (locked = 레벨·대장간에 막힘)
  function weaponGoal(targetId = (api.STAGES.LIST.find((st) => !api.save.stages[String(st.id)]?.cleared) || {}).id) {
    const sv = api.save, P = api.Progress, st = targetId && P.stageById(targetId), w = P.equippedItem(sv, 'weapon');
    if (!st || !w || w.grade >= st.REC_GEAR[0]) return null;
    const g = w.grade + 1;
    if (!api.EQUIPMENT.GRADES[g]) return null;
    const c = P.craftCheck(sv, 'weapon', g);
    return { g, locked: c.locked, missing: c.missing, mats: c.recipe.mats };
  }
  // 다른 제작·구매가 무기 목표 재료를 깎아 먹지 않는지
  function keepsWeaponMats(mats) {
    const goal = weaponGoal(), inv = api.save.inventory.materials;
    if (!goal || goal.locked) return true;
    return Object.entries(mats || {}).every(([k, n]) => !goal.mats[k] || (inv[k] || 0) - n >= goal.mats[k]);
  }
  const itemMats = (k) => { for (const grp of Object.values(api.ITEMS)) if (grp && grp[k]?.mats) return grp[k].mats; return null; };
  // 사냥 사이 정비: 스킬 포인트 → 제작(더 높은 등급) → 마을 증축 → 회복약 → 강화
  function manage() {
    const P = api.Progress, sv = api.save, did = [];
    // 스킬 포인트는 공격·생존·보조를 번갈아 앞 노드부터
    const BR = api.SKILLS.TREE.BRANCHES;
    for (let more = true; more;) {
      more = false;
      for (const br in BR) for (let i = 0; i < BR[br].nodes.length; i++) if (P.addRank(sv, br, i)) { more = true; did.push(`트리 ${br}${i}`); break; }
    }
    const grades = Object.keys(api.EQUIPMENT.GRADES).map(Number).sort((a, b) => b - a);
    for (const slot of SLOTS) {
      const cur = P.equippedItem(sv, slot);
      for (const g of grades) {
        if (cur && cur.grade >= g) break;
        const c = P.craftCheck(sv, slot, g);
        if (c.ok && (slot === 'weapon' || keepsWeaponMats(c.recipe.mats))) { P.craft(sv, slot, g); did.push(`제작 ${slot} ${g}등급`); break; }
      }
    }
    while (P.villageUpgradeCheck(sv).ok) { P.upgradeVillage(sv); did.push(`마을 Lv${sv.village.level}`); }
    // 마을 증축 재료나 더 높은 등급 제작 재료가 다 모였으면 그 골드는 남겨 둔다 (폭죽·함정·강화에 다 쓰지 않게)
    const vc = P.villageUpgradeCheck(sv);
    let reserve = Math.max(C.GOLD_RESERVE, !vc.max && !vc.missing.length ? vc.cost : 0);
    for (const slot of SLOTS) {
      const cur = P.equippedItem(sv, slot);
      for (const g of grades) {
        if (cur && cur.grade >= g) break;
        const c = P.craftCheck(sv, slot, g);
        if (!c.locked && !c.missing.length) { reserve = Math.max(reserve, c.recipe.gold); break; }
      }
    }
    // 퀵슬롯 아이템: 회복약은 POTIONS개, 유인 폭죽·함정은 열렸으면 최대치까지 (남겨 둘 돈 reserve는 빼고)
    C.QUICK_ITEMS.forEach((k, i) => {
      const want = k === 'POTION' ? C.POTIONS : Infinity;
      while ((sv.inventory.items[k] || 0) < want && P.buyCheck(sv, k).ok && (k === 'POTION' || (sv.currency.gold - P.buyCheck(sv, k).price >= reserve && keepsWeaponMats(itemMats(k))))) { P.buy(sv, k); did.push(`구매 ${k}`); }
      if (P.itemUnlock(sv, k).ok && sv.quickslots[i] !== k) P.setQuick(sv, i, k);
    });
    for (let guard = 0, more = true; more && guard < 60; guard++) {
      more = false;
      for (const slot of SLOTS) {
        const it = P.equippedItem(sv, slot);
        if (!it) continue;
        const c = P.enhanceCheck(sv, it);
        if (c.ok && sv.currency.gold - c.cost >= reserve) { P.enhance(sv, it); more = true; did.push(`강화 ${slot}+${it.enh}`); }
      }
    }
    const r = api.persist();
    if (!r.ok) fail('저장 실패', r.reason);
    const w = P.equippedItem(sv, 'weapon'), a = P.equippedItem(sv, 'body');
    return `무기 ${w.grade}등급+${w.enh} · 갑옷 ${a ? `${a.grade}등급+${a.enh}` : '-'} · 마을 Lv${sv.village.level} · ${did.filter((x) => !x.startsWith('구매 POTION') && !x.startsWith('트리')).join(', ') || '변경 없음'}`;
  }

  window.__autotest = { api, S, rec };   // 콘솔 확인용
  run().catch((e) => fail('봇 오류', e.stack || String(e)));
  console.info(`[AUTOTEST] ${C.SKILL[S.skill].label} 봇 · 배속 ×${S.speed} · 다음 ${S.next.id}단계${S.next.tier ? ` 재도전 ${S.next.tier}` : ''} · 기록 ${S.records.length}개`);
}

// ---------- 결과 화면 ----------
function showReport(S) {
  const esc = (v) => String(v ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const clears = S.records.filter((r) => r.result === '클리어').length;
  const cols = [['stage', '단계'], ['monsterId', '몬스터'], ['model', '모델/폴백'], ['result', '결과'], ['time', '소요(게임 초)'], ['dmg', '받은 피해'], ['mhpLeft', '몬스터 남은 HP%'], ['village', '마을 남은 %'], ['fails', '연속 실패'],
    ['dodges', '회피 성공/예고'], ['exp', 'EXP'], ['gold', 'G'], ['mats', '재료'], ['level', 'Lv'], ['saveOk', '저장'], ['loadSec', '로드(초)'], ['gear', '정비 뒤 장비']];
  const el = document.createElement('div');
  el.id = 'autotest-report';
  el.innerHTML = `<h1>자동 플레이 테스트 — <span class="${S.verdict === 'PASS' ? 'ok' : 'bad'}">${S.verdict}</span></h1>` +
    `<p class="m">${C.SKILL[S.skill].label} 봇 · 배속 ×${S.speed} · 사냥 ${S.records.length}번 (클리어 ${clears}) · 실제 ${S.realSec}초 · 시작 ${esc(S.startedAt)}</p>` +
    (S.quick ? '<p class="w">흐름 점검(&amp;quick=1): 몬스터 HP를 일부러 1로 낮춰 클리어 — 밸런스·전투 결과가 아님</p>' : '') +
    (S.notes || []).map((n) => `<p class="w">${esc(n)}</p>`).join('') +
    `<h2>이상 감지 ${S.anomalies.length}</h2>${S.anomalies.length ? S.anomalies.map((a) => `<div class="w">⚠ ${esc(a.stage ? `${a.stage}단계 ` : '')}${esc(a.what)} — ${esc(a.detail)}</div>`).join('') : '<div class="okb">없음</div>'}` +
    `<h2>이어하기 시험 ${S.resume.length}</h2>${S.resume.map((r) => `<div class="${r.ok ? 'okb' : 'w'}">${r.ok ? '✓' : '✗'} ${esc(r.test)} (${r.stage}단계) — ${esc(r.detail)}</div>`).join('') || '<div class="m">없음</div>'}` +
    `<h2>사냥 기록</h2><div class="sc"><table><tr>${cols.map(([, h]) => `<th>${h}</th>`).join('')}</tr>` +
    S.records.map((r) => `<tr>${cols.map(([k]) => `<td>${esc(k === 'stage' && r.tier ? `${r.stage} (재도전 ${r.tier})` : k === 'saveOk' ? (r.saveOk ? '✓' : `✗ ${r.saveReason}`) : r[k])}</td>`).join('')}</tr>`).join('') + '</table></div>' +
    `<p><button id="at-again">다시 (처음부터)</button> <button id="at-exit">게임으로</button></p>`;
  const css = document.createElement('style');
  css.textContent = `#autotest-report{position:fixed;inset:0;z-index:50;overflow:auto;background:var(--bg);color:var(--ink);padding:calc(var(--safe-t) + 14px) 16px calc(var(--safe-b) + 24px);font-size:12px;line-height:1.5}
    #autotest-report h1{font-size:18px;margin:0 0 4px}#autotest-report h2{font-size:15px;margin:14px 0 6px}#autotest-report .m{color:var(--ink-dim);margin:0}
    #autotest-report .ok{color:#a8e08a}#autotest-report .bad{color:#ff9a7a}
    #autotest-report .w{padding:6px 10px;border-left:3px solid #ff9a7a;background:#141a22;margin-bottom:4px}#autotest-report .okb{padding:6px 10px;border-left:3px solid #a8e08a;background:#141a22;margin-bottom:4px}
    #autotest-report .sc{overflow-x:auto;border:1px solid var(--line);border-radius:8px}#autotest-report table{border-collapse:collapse;min-width:1300px}
    #autotest-report th,#autotest-report td{padding:6px 8px;border-bottom:1px solid #f3e6cf1a;text-align:left;vertical-align:top}#autotest-report th{background:#181d25;color:var(--ink-dim)}
    #autotest-report button{min-height:44px;padding:0 16px;border-radius:10px;border:1px solid var(--line);background:#141a22;color:inherit;font:inherit}`;
  document.head.appendChild(css); document.body.appendChild(el);
  document.getElementById('at-again').onclick = () => { const u = new URL(location.href); u.searchParams.set('reset', '1'); u.searchParams.delete('stage'); u.searchParams.delete('re'); location.href = u.toString(); };
  document.getElementById('at-exit').onclick = () => { sessionStorage.removeItem(C.STATE_KEY); location.href = location.pathname; };
  console.info(`[AUTOTEST] ${S.verdict} — 사냥 ${S.records.length}번, 이상 ${S.anomalies.length}, 이어하기 ${S.resume.filter((r) => r.ok).length}/${S.resume.length}`);
  console.table(S.records);
  window.__autotestReport = S;
}
