// ============================================================
// 저장 데이터 — localStorage, 버전 번호 포함
//   불러오기 결과 status:
//     'loaded'      정상
//     'new'         저장이 없어서 새로 시작
//     'reset-old'   버전이 달라 새로 시작 (원본은 백업 키에 보관)
//     'reset-bad'   깨진 데이터라 새로 시작 (원본은 백업 키에 보관)
//     'unavailable' 저장소를 쓸 수 없음 → 메모리에서만 진행 (새로고침하면 사라짐)
// ============================================================
import { HUNTERS, STAGES, EQUIPMENT, MATERIALS, ITEMS, SKILLS, MONSTERS, BESTIARY } from '../data/progression.js';
// 스킬 트리 노드 키 → 정의 (검사용)
const TREE_NODES = Object.fromEntries(Object.values(SKILLS.TREE.BRANCHES).flatMap((b) => b.nodes.map((n) => [n.key, n])));

export const SAVE_CONFIG = {
  KEY: 'mh_save',
  VERSION: 1,
  BACKUP_PREFIX: 'mh_save_backup_',   // 초기화 전에 원본 문자열을 이 키로 남긴다 (원본 덮어쓰기 금지)
  BACKUP_MAX: 3,                      // 백업은 최근 3개까지
  GOLD_MAX: 9999999, STACK_MAX: 9999,
  HOUSES_MAX: 10,                     // 마을 집 수 (index.html CONFIG.VILLAGE.HOUSES와 같게) — village.repairs 번호 검사
  /* AUTOTEST:BEGIN */ AUTOTEST_KEY: 'mh_autotest_save', AUTOTEST_BACKUP_PREFIX: 'mh_autotest_backup_',   // 테스트 봇 전용 (사용자 저장과 분리)
  /* AUTOTEST:END */
  STAGES_V: 2,                        // 단계 기록 형식: 2 = 7단계 + 재도전 (없으면 예전 10단계 → 옮김)
  // 예전 10단계 → 새 키 (2·4단계는 같은 종의 앞 단계로 합침, 강화 개체 단계는 재도전 Ⅰ로)
  STAGE_MIGRATE: { 1: '1', 2: '1', 3: '3', 4: '3', 5: '2', 6: '1r1', 7: '5', 8: '3r1', 9: '5r1', 10: '6' },
};

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const int = (v, min, max, def) => (Number.isFinite(v) ? Math.min(max, Math.max(min, Math.floor(v))) : def);

export function defaultSave() {
  const S = EQUIPMENT.STARTER;
  return {
    version: SAVE_CONFIG.VERSION,
    savedAt: null,
    hunter: { level: 1, exp: 0, job: HUNTERS.START_JOB },
    jobsUnlocked: [HUNTERS.START_JOB],
    currency: { gold: STAGES.RULES.START_GOLD },
    inventory: { materials: {}, items: { ...HUNTERS.JOBS[HUNTERS.START_JOB].START.items } },   // 첫 직업의 시작 소모품
    skills: { tree: {} },   // 스킬 트리 { 노드키: 찍은 수 } — 계정 공유
    // 장비: 가진 장비 목록(items) + 슬롯별 장착 id. 무기는 직업마다 따로 장착한다
    //   item = { id, slot: weapon|head|body|legs|charm, job(무기만), grade 1~5, enh 0~5 }
    equipment: {
      items: [
        { id: 1, slot: 'weapon', job: HUNTERS.START_JOB, ...HUNTERS.JOBS[HUNTERS.START_JOB].START.weapon },
        { id: 2, slot: 'head', grade: S.armorGrade, enh: 0 }, { id: 3, slot: 'body', grade: S.armorGrade, enh: 0 }, { id: 4, slot: 'legs', grade: S.armorGrade, enh: 0 },
      ],
      equipped: { weapon: { [HUNTERS.START_JOB]: 1 }, head: 2, body: 3, legs: 4, charm: null },
      nextId: 5,
    },
    // repairs: 지난 사냥에 무너진 집 번호 → 다음 사냥 시작 때 '복구 중'으로 보임 · lastStage: 마지막으로 끝낸 단계 (단계 전환 연출)
    village: { level: 1, repairs: [], lastStage: 0 },
    stages: {},   // { "3": { cleared, stars: [b, b, b], bestTime, clears, plays }, "3r1": 재도전 Ⅰ … }
    stagesV: SAVE_CONFIG.STAGES_V,
    quickslots: [...ITEMS.QUICK.DEFAULT],   // 전투 퀵슬롯 3칸 (아이템 키 또는 null)
    bestiary: {},   // 도감 { 종키: { hunts, kills, bestTime, variants: [], parts: { 부위id: true }, drops: { 재료: 수 } } } — 사냥한 종만
    bookRewards: [],   // 받은 도감 완성 보상 (BESTIARY.REWARDS의 AT %)
  };
}

// 단계 기록 키: 메인 "n" 또는 재도전 "n" + "r" + 등급
function stageKeyOk(key) {
  const m = /^(\d+)(?:r(\d))?$/.exec(key);
  if (!m || !STAGES.LIST.some((s) => s.id === +m[1])) return false;
  return !m[2] || (STAGES.RECHALLENGE[m[2]] && !STAGES.RECHALLENGE[m[2]].SKIP.includes(+m[1]));
}
// v0.5까지의 10단계 기록 → 7단계 + 재도전 (GAME_DESIGN 13-1-4). 같은 곳으로 가는 기록은 합친다
function migrateStages(old) {
  const out = {};
  for (const [id, r] of Object.entries(old || {})) {
    const to = SAVE_CONFIG.STAGE_MIGRATE[id];
    if (!to || !isObj(r)) continue;
    const prev = out[to];
    const stars = [0, 1, 2].map((i) => (Array.isArray(r.stars) && r.stars[i] === true) || !!prev?.stars[i]);
    const times = [r.bestTime, prev?.bestTime].filter(Number.isFinite);
    out[to] = { cleared: r.cleared === true || !!prev?.cleared, stars, bestTime: times.length ? Math.min(...times) : null,
      clears: (r.clears || 0) + (prev?.clears || 0), plays: (r.plays || 0) + (prev?.plays || 0) };
  }
  if (Object.keys(old || {}).length) console.info('[SAVE] 10단계 기록을 7단계로 옮김', Object.keys(old), '→', Object.keys(out));
  return out;
}

// 모르는 키·잘못된 값은 버리거나 범위 안으로 고친다. 뼈대가 틀리면 throw → 초기화
function sanitize(raw) {
  if (!isObj(raw)) throw new Error('최상위가 객체가 아님');
  for (const k of ['hunter', 'currency', 'inventory', 'equipment', 'village', 'stages']) if (!isObj(raw[k])) throw new Error(`'${k}' 없음`);
  const d = defaultSave();
  const L = HUNTERS.LEVEL;
  // 레벨은 경험치에서 다시 계산한다 (둘이 어긋나면 경험치가 기준)
  d.hunter.exp = int(raw.hunter.exp, 0, L.TOTAL_AT_MAX, 0);
  let lv = 1, acc = 0;
  while (lv < L.MAX && d.hunter.exp >= acc + L.NEXT[lv - 1]) { acc += L.NEXT[lv - 1]; lv++; }
  d.hunter.level = lv;
  d.jobsUnlocked = Array.isArray(raw.jobsUnlocked) ? [...new Set(raw.jobsUnlocked.filter((j) => HUNTERS.JOBS[j]))] : d.jobsUnlocked;
  if (!d.jobsUnlocked.includes(HUNTERS.START_JOB)) d.jobsUnlocked.unshift(HUNTERS.START_JOB);
  d.hunter.job = d.jobsUnlocked.includes(raw.hunter.job) ? raw.hunter.job : HUNTERS.START_JOB;
  d.currency.gold = int(raw.currency.gold, 0, SAVE_CONFIG.GOLD_MAX, d.currency.gold);
  const mats = isObj(raw.inventory.materials) ? raw.inventory.materials : {};
  for (const [k, n] of Object.entries(mats)) if (MATERIALS[k]) { const v = int(n, 0, SAVE_CONFIG.STACK_MAX, 0); if (v) d.inventory.materials[k] = v; }
  const items = isObj(raw.inventory.items) ? raw.inventory.items : {};
  for (const [k, n] of Object.entries(items)) {
    const def = ITEMS.CONSUMABLES[k] || ITEMS.PLACEABLES[k];
    if (def) { const v = int(n, 0, def.max, 0); if (v) d.inventory.items[k] = v; }
  }
  d.equipment = sanitizeEquipment(raw.equipment, d.equipment, d.jobsUnlocked);
  d.village.level = int(raw.village.level, 1, 5, 1);
  // 단계별 마을 (추가된 필드라 버전은 그대로): 없으면 빈 목록 · 0
  if (Array.isArray(raw.village.repairs)) d.village.repairs = [...new Set(raw.village.repairs.filter((i) => Number.isInteger(i) && i >= 0 && i < SAVE_CONFIG.HOUSES_MAX))];
  d.village.lastStage = int(raw.village.lastStage, 0, STAGES.LIST.length, 0);
  // 스킬 트리: 이전 저장에 없으면 빈 트리 (추가된 필드라 버전은 그대로). 받은 포인트보다 많이 찍혀 있으면 트리만 초기화
  d.skills.tree = {};
  if (isObj(raw.skills) && isObj(raw.skills.tree)) for (const [k, v] of Object.entries(raw.skills.tree)) {
    const node = TREE_NODES[k];
    if (node) { const r = int(v, 0, node.max, 0); if (r) d.skills.tree[k] = r; }
  }
  const spent = Object.values(d.skills.tree).reduce((a, b) => a + b, 0);
  if (spent > (d.hunter.level - 1) * SKILLS.TREE.POINTS_PER_LEVEL) d.skills.tree = {};
  // 단계 기록: 키 "3" = 메인 3단계, "3r1" = 3단계 재도전 Ⅰ. 예전 10단계 기록(stagesV 없음)은 7단계로 옮긴다
  const src = raw.stagesV === SAVE_CONFIG.STAGES_V ? raw.stages : migrateStages(raw.stages);
  for (const [id, r] of Object.entries(src)) {
    if (!stageKeyOk(id) || !isObj(r)) continue;
    const stars = Array.isArray(r.stars) ? [0, 1, 2].map((i) => r.stars[i] === true) : [false, false, false];
    d.stages[id] = { cleared: r.cleared === true, stars, bestTime: Number.isFinite(r.bestTime) ? r.bestTime : null,
      clears: int(r.clears, 0, 1e6, 0), plays: int(r.plays, 0, 1e6, 0) };
  }
  // 퀵슬롯·도감: 이전 저장에 없으면 기본값 (추가된 필드라 버전은 그대로)
  if (Array.isArray(raw.quickslots)) {
    d.quickslots = Array.from({ length: ITEMS.QUICK.SLOTS }, (_, i) => (ITEMS.QUICK.USABLE.includes(raw.quickslots[i]) ? raw.quickslots[i] : null));
  }
  if (isObj(raw.bestiary)) for (const [k, b] of Object.entries(raw.bestiary)) {
    if (!MONSTERS.SPECIES[k] || !isObj(b)) continue;
    const parts = {}, drops = {};
    if (isObj(b.parts)) for (const p of Object.keys(b.parts)) if (b.parts[p] === true) parts[p] = true;
    if (isObj(b.drops)) for (const [m, n] of Object.entries(b.drops)) if (MATERIALS[m]) { const v = int(n, 0, 1e6, 0); if (v) drops[m] = v; }
    d.bestiary[k] = { hunts: int(b.hunts, 0, 1e6, 0), kills: int(b.kills, 0, 1e6, 0), bestTime: Number.isFinite(b.bestTime) ? b.bestTime : null,
      variants: Array.isArray(b.variants) ? b.variants.filter((v) => MONSTERS.VARIANTS[v]) : [], parts, drops };
  }
  // 도감 보상 받은 기록 (추가된 필드라 버전은 그대로): 정의된 AT만
  if (Array.isArray(raw.bookRewards)) d.bookRewards = [...new Set(raw.bookRewards.filter((a) => BESTIARY.REWARDS.some((r) => r.AT === a)))];
  d.savedAt = typeof raw.savedAt === 'string' ? raw.savedAt : null;
  return d;
}

// 장비 검사. 예전 형식 { weapons: {직업: {grade, enh}}, armor: {부위: {grade, enh}} }은 목록 형식으로 옮긴다
//   (필드만 바뀐 이전이라 저장 버전은 그대로. 'forest' 등 대체 세트는 5등급으로 본다)
function sanitizeEquipment(eq, def, jobs) {
  const grade = (g) => (g === 'forest' ? 5 : int(g, 1, 5, 1));
  const enh = (e) => int(e, 0, EQUIPMENT.ENH.MAX, 0);
  const out = { items: [], equipped: { weapon: {}, head: null, body: null, legs: null, charm: null }, nextId: 1 };
  const push = (it) => { const o = { id: out.nextId++, slot: it.slot, grade: grade(it.grade), enh: enh(it.enh) }; if (it.slot === 'weapon') o.job = it.job; out.items.push(o); return o.id; };
  if (Array.isArray(eq.items)) {
    const idMap = {};
    for (const it of eq.items.slice(0, 200)) {
      if (!isObj(it) || !EQUIPMENT.SLOTS.includes(it.slot)) continue;
      if (it.slot === 'weapon' && !HUNTERS.JOBS[it.job]) continue;
      idMap[it.id] = push(it);
    }
    const eqd = isObj(eq.equipped) ? eq.equipped : {};
    const fits = (id, slot, job) => { const it = out.items.find((x) => x.id === id); return it && it.slot === slot && (slot !== 'weapon' || it.job === job); };
    if (isObj(eqd.weapon)) for (const [j, id] of Object.entries(eqd.weapon)) if (fits(idMap[id], 'weapon', j)) out.equipped.weapon[j] = idMap[id];
    for (const s of ['head', 'body', 'legs', 'charm']) if (fits(idMap[eqd[s]], s)) out.equipped[s] = idMap[eqd[s]];
  } else {
    if (isObj(eq.weapons)) for (const [j, w] of Object.entries(eq.weapons)) if (HUNTERS.JOBS[j] && isObj(w)) out.equipped.weapon[j] = push({ slot: 'weapon', job: j, ...w });
    if (isObj(eq.armor)) for (const s of ['head', 'body', 'legs']) if (isObj(eq.armor[s])) out.equipped[s] = push({ slot: s, ...eq.armor[s] });
  }
  // 해금한 직업은 무기가 꼭 하나 있어야 한다. 방어구 슬롯이 비면 1등급을 채운다 (기본 저장과 같은 상태)
  for (const j of jobs) {
    if (out.equipped.weapon[j]) continue;
    const own = out.items.find((x) => x.slot === 'weapon' && x.job === j);
    out.equipped.weapon[j] = own ? own.id : push({ slot: 'weapon', job: j, ...HUNTERS.JOBS[j].START.weapon });
  }
  for (const s of ['head', 'body', 'legs']) if (!out.equipped[s] && !out.items.some((x) => x.slot === s)) out.equipped[s] = push({ slot: s, grade: def.items.find((x) => x.slot === s).grade, enh: 0 });
  return out;
}

let storageOk = null;
function storage() {
  if (storageOk === false) return null;
  try {
    const t = '__mh_probe__';
    window.localStorage.setItem(t, '1'); window.localStorage.removeItem(t);
    storageOk = true;
    return window.localStorage;
  } catch (e) { storageOk = false; return null; }
}

function backupRaw(ls, raw, why) {
  try {
    const key = SAVE_CONFIG.BACKUP_PREFIX + Date.now();
    ls.setItem(key, JSON.stringify({ why, at: new Date().toISOString(), raw }));
    const old = Object.keys(ls).filter((k) => k.startsWith(SAVE_CONFIG.BACKUP_PREFIX)).sort();
    while (old.length > SAVE_CONFIG.BACKUP_MAX) ls.removeItem(old.shift());
    return key;
  } catch (e) { return null; }   // 백업도 못 하면 원본은 그대로 둔다 (아래에서 덮어쓰지 않음)
}

export function loadSave() {
  const ls = storage();
  if (!ls) return { data: defaultSave(), status: 'unavailable', reason: 'localStorage를 쓸 수 없음 (사생활 보호 모드·차단)' };
  let text;
  try { text = ls.getItem(SAVE_CONFIG.KEY); } catch (e) { return { data: defaultSave(), status: 'unavailable', reason: e.message }; }
  if (text === null) return { data: defaultSave(), status: 'new', reason: '저장 없음' };
  let raw;
  try { raw = JSON.parse(text); } catch (e) {
    const b = backupRaw(ls, text, 'JSON 파싱 실패');
    return { data: defaultSave(), status: 'reset-bad', reason: `JSON 파싱 실패 → 새로 시작 (원본 ${b || '백업 실패, 원본 유지'})`, keepOriginal: !b };
  }
  if (!isObj(raw) || raw.version !== SAVE_CONFIG.VERSION) {
    const v = isObj(raw) ? raw.version : '?';
    const b = backupRaw(ls, text, `버전 ${v}`);
    return { data: defaultSave(), status: 'reset-old', reason: `저장 버전 ${v} ≠ ${SAVE_CONFIG.VERSION} → 새로 시작 (원본 ${b || '백업 실패, 원본 유지'})`, keepOriginal: !b };
  }
  try { return { data: sanitize(raw), status: 'loaded', reason: '정상' }; } catch (e) {
    const b = backupRaw(ls, text, e.message);
    return { data: defaultSave(), status: 'reset-bad', reason: `구조 오류(${e.message}) → 새로 시작 (원본 ${b || '백업 실패, 원본 유지'})`, keepOriginal: !b };
  }
}

// keepOriginal: 원본을 백업하지 못했으면 덮어쓰지 않는다 (이번 진행은 메모리에만)
export function writeSave(data, { keepOriginal = false } = {}) {
  if (keepOriginal) return { ok: false, reason: '이전 저장을 백업하지 못해 덮어쓰지 않음' };
  const ls = storage();
  if (!ls) return { ok: false, reason: 'localStorage를 쓸 수 없음' };
  try {
    data.version = SAVE_CONFIG.VERSION;
    data.savedAt = new Date().toISOString();
    const text = JSON.stringify(data);
    ls.setItem(SAVE_CONFIG.KEY, text);
    if (ls.getItem(SAVE_CONFIG.KEY) !== text) return { ok: false, reason: '쓴 값과 읽은 값이 다름' };
    return { ok: true, reason: '저장됨' };
  } catch (e) {
    return { ok: false, reason: e.name === 'QuotaExceededError' ? '저장 공간 부족' : e.message };
  }
}
