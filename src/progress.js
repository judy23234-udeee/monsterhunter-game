// ============================================================
// 성장 계산 — 저장 데이터 + 설정표 → 능력치·스테이지 상태·보상
//   화면·렌더링과 무관한 순수 함수만 둔다 (테스트하기 쉽게)
// ============================================================
import { STAGES, MONSTERS, MONSTER_SCALE, HUNTERS, EQUIPMENT, ITEMS, MATERIALS, SKILLS, VILLAGE_UPGRADES, BESTIARY } from '../data/progression.js';

// ---------- 효과(fx): 스킬 트리 + 직업 패시브가 더하는 값. 키가 없으면 0 ----------
export const FX_DEFAULTS = {
  atkMul: 0, weakMul: 0, breakMul: 0, finisherMul: 0, staggerDmg: 0,       // 공격
  hpMul: 0, defAdd: 0, rollCdMul: 0, knockMul: 0, hurtIframe: 0, lastStand: 0, attackGuard: 0, guardHeal: 0,   // 생존
  extraDrop: 0, villageDmgMul: 0, skillCdMul: 0, expMul: 0, breakHeal: 0,  // 보조
  everyN: 0, everyMul: 0, farMul: 0, farDist: 0, stunMul: 0, trapMul: 0, boundMul: 0, ultMul: 0,   // 직업 패시브
};
const SET_KEYS = ['everyN', 'farDist'];   // 더하지 않고 값 그대로 쓰는 키

export function effects(save) {
  const fx = { ...FX_DEFAULTS, partBonus: {} };
  const addFx = (src, times = 1) => {
    for (const [k, v] of Object.entries(src)) {
      if (k === 'partBonus') for (const [p, b] of Object.entries(v)) fx.partBonus[p] = (fx.partBonus[p] || 0) + b * times;
      else if (SET_KEYS.includes(k)) fx[k] = v;
      else fx[k] = (fx[k] || 0) + v * times;
    }
  };
  for (const br of Object.values(SKILLS.TREE.BRANCHES)) for (const n of br.nodes) {
    const r = save.skills.tree[n.key] || 0;
    if (r) addFx(n.fx, r);
  }
  const J = SKILLS.JOB[save.hunter.job], U = SKILLS.JOB_UNLOCK_LV;
  for (const slot of ['P1', 'P2', 'AWAKE']) if (save.hunter.level >= U[slot] && J[slot]?.fx) addFx(J[slot].fx);
  const charm = equippedItem(save, 'charm');
  if (charm) addFx(charmFx(charm));
  return fx;
}

// 직업 스킬 슬롯 (레벨 해금 여부 포함)
export function jobSkills(save, job = save.hunter.job) {
  const J = SKILLS.JOB[job], U = SKILLS.JOB_UNLOCK_LV;
  return ['S1', 'S2', 'ULT'].map((slot) => ({ slot, def: J[slot], reqLv: U[slot], unlocked: save.hunter.level >= U[slot] }));
}
export const weaponName = (job, grade) => `${EQUIPMENT.GRADES[grade]?.name || ''} ${HUNTERS.WEAPONS[job].name}`.trim();

// 경험치 더하기 → 레벨 다시 계산 (레벨 30에서 멈춤)
export function addExp(save, amount) {
  const from = save.hunter.level;
  save.hunter.exp = Math.min(save.hunter.exp + amount, HUNTERS.LEVEL.TOTAL_AT_MAX);
  save.hunter.level = levelFromExp(save.hunter.exp).level;
  return { from, to: save.hunter.level, gained: amount };
}

// ---------- 스킬 트리 ----------
const T = SKILLS.TREE;
export function treePoints(save) {
  const total = (save.hunter.level - 1) * T.POINTS_PER_LEVEL;
  const spent = Object.values(save.skills.tree).reduce((a, b) => a + b, 0);
  return { total, spent, free: total - spent };
}
export function nodeStatus(save, branchKey, i) {
  const br = T.BRANCHES[branchKey], n = br.nodes[i], rank = save.skills.tree[n.key] || 0;
  let reason = '';
  if (rank >= n.max) reason = '최대';
  else if (save.hunter.level < n.lv) reason = `Lv ${n.lv} 필요`;
  else if (i > 0 && !(save.skills.tree[br.nodes[i - 1].key] > 0)) reason = `'${br.nodes[i - 1].name}' 먼저`;
  else if (treePoints(save).free <= 0) reason = '포인트 부족';
  return { node: n, rank, ok: !reason, reason };
}
export function addRank(save, branchKey, i) {
  const s = nodeStatus(save, branchKey, i);
  if (!s.ok) return false;
  save.skills.tree[s.node.key] = s.rank + 1;
  return true;
}
export const respecCost = (save) => save.hunter.level * T.RESPEC_GOLD_PER_LV;
export function resetTree(save) {
  const c = respecCost(save);
  if (save.currency.gold < c || !Object.keys(save.skills.tree).length) return false;
  save.currency.gold -= c; save.skills.tree = {};
  return true;
}

export const stageById = (id) => STAGES.LIST.find((s) => s.id === id) || null;

// 0xRRGGBB 두 색을 섞는다 (색조 변형용)
export function mixHex(a, b, t) {
  const ch = (c, s) => (c >> s) & 255;
  return [16, 8, 0].reduce((out, s) => out | (Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * t) << s), 0);
}

// 위험도 표시 문자열과 마을 공격 방식 이름
export const dangerText = (d) => `${'●'.repeat(d)}${'○'.repeat(5 - d)} ${STAGES.RULES.DANGER_LABELS[d]}`;
export const raidKinds = (st, short = false) => Object.entries(st.RAID.TARGETS)
  .sort((a, b) => b[1] - a[1]).map(([k]) => (short ? STAGES.RULES.RAID.SHORT : STAGES.RULES.RAID.LABEL)[k]);

// ---------- 장비 (13-3) ----------
const EQ = EQUIPMENT;
export const itemById = (save, id) => save.equipment.items.find((x) => x.id === id) || null;
export function equippedItem(save, slot, job = save.hunter.job) {
  const e = save.equipment.equipped;
  return itemById(save, slot === 'weapon' ? e.weapon[job] : e[slot]);
}
export const isEquipped = (save, it) => equippedItem(save, it.slot, it.job) === it;
export function baseName(slot, grade, job) {
  if (slot === 'weapon') return weaponName(job, grade);
  if (slot === 'charm') return EQ.CHARMS[grade].name;
  return `${EQ.GRADES[grade].name} ${EQ.ARMOR_NAMES[slot]}`;
}
export const itemName = (it) => `${baseName(it.slot, it.grade, it.job)}${it.enh ? ` +${it.enh}` : ''}`;
// 장신구 효과: 등급 효과 × (1 + 강화 × CHARM_K)
export function charmFx(it) {
  const k = 1 + EQ.ENH.CHARM_K * it.enh;
  return Object.fromEntries(Object.entries(EQ.CHARMS[it.grade].fx).map(([f, v]) => [f, v * k]));
}
export const FX_LABEL = { hpMul: '최대 체력', weakMul: '약점 피해', breakMul: '부위 파괴', rollCdMul: '구르기 쿨', skillCdMul: '스킬 쿨', atkMul: '공격', ultMul: '궁극기' };
// 장비 하나의 수치 (표시용 문장 포함)
export function itemStats(it) {
  if (it.slot === 'weapon') {
    const atk = EQ.GRADES[it.grade].ATK_MUL * (1 + EQ.ENH.ATK * it.enh);
    return { atk, text: `공격 ×${atk.toFixed(2)}` };
  }
  if (it.slot === 'charm') {
    const parts = Object.entries(charmFx(it)).map(([f, v]) => `${FX_LABEL[f] || f} ${v > 0 ? '+' : '−'}${Math.round(Math.abs(v) * 1000) / 10}%`);
    return { text: parts.join(', ') };
  }
  const def = EQ.GRADES[it.grade].DEF + EQ.ENH.DEF * it.enh;
  return { def, text: `방어 +${def}` };
}

// 레벨별 능력치 (13-2-1) + 장착 장비 (13-3-1)
export function hunterStats(save) {
  const L = HUNTERS.LEVEL, lv = save.hunter.level, job = HUNTERS.JOBS[save.hunter.job];
  const w = equippedItem(save, 'weapon') || { slot: 'weapon', job: save.hunter.job, grade: 1, enh: 0 };
  let armorDef = 0;
  for (const s of ['head', 'body', 'legs']) { const a = equippedItem(save, s); if (a) armorDef += itemStats(a).def; }
  const lvAtk = 1 + L.ATK_PER * (lv - 1);
  const fx = effects(save);
  return {
    level: lv, job: save.hunter.job, jobName: job.name,
    hp: Math.round((L.HP_BASE + L.HP_PER * (lv - 1)) * job.HP_K * (1 + fx.hpMul)),
    atkMul: lvAtk * itemStats(w).atk * (1 + fx.atkMul),
    def: L.DEF_PER * (lv - 1) + armorDef + fx.defAdd,
    moveK: job.MOVE_K,
    weapon: w, weaponName: itemName(w), fx,
  };
}

// 외형에 쓰는 등급 (장착 안 했으면 1등급, 장신구는 0 = 없음)
export function lookGrades(save) {
  const g = (s) => equippedItem(save, s);
  const w = g('weapon');
  return { weapon: w ? w.grade : 1, weaponEnh: w ? w.enh : 0, head: g('head')?.grade || 1, body: g('body')?.grade || 1,
    legs: g('legs')?.grade || 1, charm: g('charm')?.grade || 0,
    armorEnh: Math.min(...['head', 'body', 'legs'].map((s) => g(s)?.enh || 0)) };
}

// ---------- 대장간: 제작·강화·장착 ----------
export const smithyLevel = (save) => save.village.level;   // 대장간 레벨 = 마을 레벨 (13-4)
export function recipeOf(slot, grade) {
  const r = EQ.RECIPES[grade];
  return slot === 'weapon' ? r.weapon : slot === 'charm' ? r.charm : r.armor;
}
// 재료 부족 목록 [{ key, have, need }]
export function missingMats(save, mats) {
  return Object.entries(mats).map(([key, need]) => ({ key, need, have: save.inventory.materials[key] || 0 })).filter((m) => m.have < m.need);
}
export function craftCheck(save, slot, grade, job = save.hunter.job) {
  const G = EQ.GRADES[grade], rec = recipeOf(slot, grade), reasons = [];
  if (save.hunter.level < G.REQ_LV) reasons.push(`사냥꾼 Lv ${G.REQ_LV} 필요`);
  if (smithyLevel(save) < G.REQ_VILLAGE) reasons.push(`대장간 Lv ${G.REQ_VILLAGE} 필요`);
  const missing = missingMats(save, rec.mats);
  if (missing.length) reasons.push('재료 부족');
  if (save.currency.gold < rec.gold) reasons.push(`골드 ${rec.gold - save.currency.gold} 부족`);
  return { ok: !reasons.length, recipe: rec, missing, reasons, locked: save.hunter.level < G.REQ_LV || smithyLevel(save) < G.REQ_VILLAGE };
}
const spend = (save, mats, gold) => {
  save.currency.gold -= gold;
  for (const [k, n] of Object.entries(mats)) { save.inventory.materials[k] -= n; if (save.inventory.materials[k] <= 0) delete save.inventory.materials[k]; }
};
// 제작 → 새 장비. 그 슬롯이 비었거나 지금 것보다 등급이 높으면 바로 장착
export function craft(save, slot, grade, job = save.hunter.job) {
  const c = craftCheck(save, slot, grade, job);
  if (!c.ok) return null;
  spend(save, c.recipe.mats, c.recipe.gold);
  const it = { id: save.equipment.nextId++, slot, grade, enh: 0 };
  if (slot === 'weapon') it.job = job;
  save.equipment.items.push(it);
  const cur = equippedItem(save, slot, job);
  const autoEquip = !cur || cur.grade < grade;
  if (autoEquip) equip(save, it.id);
  return { item: it, equipped: autoEquip };
}
export function enhanceCost(save, it) {
  const disc = VILLAGE_UPGRADES.FACILITIES.SMITHY.enhDiscount[smithyLevel(save) - 1] || 0;
  return Math.round(EQ.ENH.COST[it.grade - 1] * (it.enh + 1) * (it.slot === 'weapon' ? 1 : EQ.ENH.ARMOR_K) * (1 - disc));
}
export function enhanceCheck(save, it) {
  const cost = enhanceCost(save, it), reasons = [];
  if (it.enh >= EQ.ENH.MAX) reasons.push('최대 강화');
  else if (save.currency.gold < cost) reasons.push(`골드 ${cost - save.currency.gold} 부족`);
  return { ok: !reasons.length, cost, reasons };
}
export function enhance(save, it) {
  const c = enhanceCheck(save, it);
  if (!c.ok) return false;
  save.currency.gold -= c.cost; it.enh++;
  return true;
}
export function equip(save, id) {
  const it = itemById(save, id);
  if (!it) return false;
  if (it.slot === 'weapon') save.equipment.equipped.weapon[it.job] = id;
  else save.equipment.equipped[it.slot] = id;
  return true;
}
export function unequip(save, slot) {   // 장신구만 뺄 수 있다 (무기·방어구는 바꿔 끼기만)
  if (slot !== 'charm') return false;
  save.equipment.equipped.charm = null;
  return true;
}
// 대장간(마을) 레벨업
export function villageUpgradeCheck(save) {
  const next = save.village.level + 1, L = VILLAGE_UPGRADES.LEVELS[next];
  if (!L) return { ok: false, max: true, reasons: ['최대 레벨'] };
  const missing = missingMats(save, L.mats), reasons = [];
  if (missing.length) reasons.push('재료 부족');
  if (save.currency.gold < L.cost) reasons.push(`골드 ${L.cost - save.currency.gold} 부족`);
  return { ok: !reasons.length, next, cost: L.cost, mats: L.mats, missing, reasons };
}
export function upgradeVillage(save) {
  const c = villageUpgradeCheck(save);
  if (!c.ok) return false;
  spend(save, c.mats, c.cost); save.village.level = c.next;
  return true;
}

// 재료를 어디서 얻는지 (재료 부족 안내). [{ text, stages: [{ id, unlocked }] }]
export function materialSources(save, key) {
  const out = [];
  const stagesOf = (pred) => STAGES.LIST.filter(pred).map((s) => ({ id: s.id, unlocked: stageStatus(save, s.id).unlocked }));
  for (const [sk, sp] of Object.entries(MONSTERS.SPECIES)) {
    const parts = Object.values(sp.PARTS).filter((p) => p.drop === key).map((p) => p.name);
    if (parts.length) out.push({ text: `${sp.short} — ${parts.join('·')} 파괴`, stages: stagesOf((s) => s.monsterId === sk) });
    if (sp.KILL_DROP.material === key) out.push({ text: `${sp.short} — 처치 보상 · 약점 부위 파괴(희귀)`, stages: stagesOf((s) => s.monsterId === sk) });
  }
  // 재도전 보상 (강화·고대 변형의 추가 드롭). 단계 번호 옆 잠금은 그 재도전이 열렸는지
  for (const [tier, R] of Object.entries(STAGES.RECHALLENGE)) {
    const va = MONSTERS.VARIANTS[R.variant];
    if (va.EXTRA_DROP?.material === key) out.push({ text: `${R.label} (${va.label}) 처치 보상`,
      stages: STAGES.LIST.filter((s) => !R.SKIP.includes(s.id)).map((s) => ({ id: s.id, unlocked: stageStatus(save, s.id, +tier).unlocked })) });
  }
  if (ITEMS.BREAK_DROP.ANCIENT_MAT === key) out.push({ text: '재도전 몬스터 부위 파괴(희귀)',
    stages: STAGES.LIST.map((s) => ({ id: s.id, unlocked: [1, 2].some((tier) => stageStatus(save, s.id, tier).unlocked) })) });
  if (ITEMS.GATHER.TABLE.some((g) => g.mat === key)) out.push({ text: '사냥터 채집 (클리어 시)', stages: [] });
  const sup = VILLAGE_UPGRADES.LEVELS[save.village.level].supply[key];
  if (sup) out.push({ text: `마을 보급 (클리어마다 ${sup}개)`, stages: [] });
  if (ITEMS.BUNDLES.THANKS_BUNDLE.mats[key]) out.push({ text: '대피소 감사 꾸러미', stages: [] });
  return out;
}

// ---------- 아이템 · 상점 · 퀵슬롯 ----------
export const itemDef = (k) => ITEMS.CONSUMABLES[k] || ITEMS.PLACEABLES[k] || null;
export function itemUnlock(save, k) {
  const it = itemDef(k);
  if (!it) return { ok: false, reason: '없는 아이템' };
  if (it.village && save.village.level < it.village) return { ok: false, reason: `마을 Lv ${it.village} 필요` };
  const u = it.unlock;
  if (u?.lv && save.hunter.level < u.lv) return { ok: false, reason: `사냥꾼 Lv ${u.lv} 필요` };
  if (u?.stage && !save.stages[String(u.stage)]?.cleared) return { ok: false, reason: `${u.stage}단계 클리어 필요` };
  if (u?.diner && save.village.level < u.diner) return { ok: false, reason: `마을 Lv ${u.diner} 필요` };
  return { ok: true, reason: '' };
}
export function buyCheck(save, k, n = 1) {
  const it = itemDef(k), have = save.inventory.items[k] || 0, reasons = [];
  const u = itemUnlock(save, k);
  if (!u.ok) reasons.push(u.reason);
  else if (have + n > it.max) reasons.push(`최대 ${it.max}개`);
  else if (save.currency.gold < it.price * n) reasons.push(`골드 ${it.price * n - save.currency.gold} 부족`);
  return { ok: !reasons.length, price: it.price * n, have, max: it.max, reasons, locked: !u.ok };
}
export function buy(save, k, n = 1) {
  const c = buyCheck(save, k, n);
  if (!c.ok) return false;
  save.currency.gold -= c.price;
  save.inventory.items[k] = c.have + n;
  return true;
}
// 퀵슬롯 i에 아이템을 넣는다 (다른 칸에 같은 아이템이 있으면 자리를 바꾼다). k = null이면 비움
export function setQuick(save, i, k) {
  if (k !== null && !ITEMS.QUICK.USABLE.includes(k)) return false;
  const j = save.quickslots.indexOf(k);
  if (k !== null && j >= 0 && j !== i) save.quickslots[j] = save.quickslots[i];
  save.quickslots[i] = k;
  return true;
}

// ---------- 마을 레벨 효과 (13-4) ----------
export function villageStats(save, lv = save.village.level) {
  const F = VILLAGE_UPGRADES.FACILITIES, i = lv - 1;
  return {
    level: lv, wall: F.WALL.hp[i], towers: F.TOWER.count[i], towerDmg: F.TOWER.dmg, towerInterval: F.TOWER.interval, towerRange: F.TOWER.range,
    shelterCap: F.SHELTER.capacity[i], shelterHp: F.SHELTER.hp[i], houseHp: F.HOUSE.hp[i],
    helpers: F.HELPER.count[i], helperHeal: F.HELPER.heal, helperRepair: F.HELPER.repair, helperInterval: F.HELPER.interval,
    enhDiscount: F.SMITHY.enhDiscount[i], supply: VILLAGE_UPGRADES.LEVELS[lv].supply,
    villagers: VILLAGE_UPGRADES.LEVELS[lv].villagers, livestock: VILLAGE_UPGRADES.LEVELS[lv].livestock,   // 주민·가축 수 (NPC_BUDGET 안)
  };
}

// ---------- 도감: 사냥한 몬스터만 공개 ----------
// 그 종에서 얻을 수 있는 재료 (부위 파괴 · 처치 · 변형 · 고대 파편)
export function speciesDrops(key) {
  const sp = MONSTERS.SPECIES[key], set = new Set(Object.values(sp.PARTS).map((p) => p.drop));
  set.add(sp.KILL_DROP.material);
  for (const va of Object.values(MONSTERS.VARIANTS)) if (va.EXTRA_DROP) set.add(va.EXTRA_DROP.material);
  set.add(ITEMS.BREAK_DROP.ANCIENT_MAT);
  return [...set];
}
// 도감 완성도: 종마다 (만남 1 + 약점 부위 수 + 드롭 재료 수) 중 기록된 것의 비율
export function bestiaryProgress(save) {
  let found = 0, total = 0;
  for (const [k, sp] of Object.entries(MONSTERS.SPECIES)) {
    const rec = save.bestiary[k], parts = Object.keys(sp.PARTS), drops = speciesDrops(k);
    total += 1 + parts.length + drops.length;
    if (rec) found += 1 + parts.filter((p) => rec.parts[p]).length + drops.filter((m) => rec.drops[m]).length;
  }
  return { found, total, pct: total ? Math.floor((found / total) * 100) : 0 };
}
// 도감 보상: 각 단계 { AT, GOLD, MATS, reached, claimed }
export function bookRewards(save) {
  const { pct } = bestiaryProgress(save), got = save.bookRewards || [];
  return BESTIARY.REWARDS.map((r) => ({ ...r, reached: pct >= r.AT, claimed: got.includes(r.AT) }));
}
export function claimBookReward(save, at) {
  const r = bookRewards(save).find((x) => x.AT === at);
  if (!r || !r.reached || r.claimed) return false;
  save.currency.gold += r.GOLD || 0;
  for (const [k, n] of Object.entries(r.MATS || {})) save.inventory.materials[k] = (save.inventory.materials[k] || 0) + n;
  (save.bookRewards = save.bookRewards || []).push(at);
  return true;
}
function recordBestiary(save, r, materials) {
  const b = r.bestiary;
  if (!b || !MONSTERS.SPECIES[b.species]) return false;
  const rec = save.bestiary[b.species] || { hunts: 0, kills: 0, bestTime: null, variants: [], parts: {}, drops: {} };
  const firstKill = !!r.killed && rec.kills === 0;
  rec.hunts++;
  if (r.killed) {
    rec.kills++;
    if (Number.isFinite(r.huntTime) && (rec.bestTime === null || r.huntTime < rec.bestTime)) rec.bestTime = Math.round(r.huntTime);
  }
  if (!rec.variants.includes(b.variant)) rec.variants.push(b.variant);
  for (const p of b.parts || []) rec.parts[p] = true;
  const own = speciesDrops(b.species);
  for (const [k, n] of Object.entries(materials)) if (own.includes(k)) rec.drops[k] = (rec.drops[k] || 0) + n;
  save.bestiary[b.species] = rec;
  return firstKill;
}

// 단계 기록 키: 메인 "3", 재도전 "3r1" · "3r2"
export const stageKey = (id, tier = 0) => (tier ? `${id}r${tier}` : String(id));
// 별 관문은 메인 단계 별만 센다
export const totalStars = (save) => Object.entries(save.stages).filter(([k]) => !k.includes('r')).reduce((n, [, r]) => n + r.stars.filter(Boolean).length, 0);
export const reStars = (save) => Object.entries(save.stages).filter(([k]) => k.includes('r')).reduce((n, [, r]) => n + r.stars.filter(Boolean).length, 0);

export function stageStatus(save, id, tier = 0) {
  const rec = save.stages[stageKey(id, tier)] || { cleared: false, stars: [false, false, false] };
  if (tier) {   // 재도전: Ⅰ은 그 단계 첫 클리어 뒤, Ⅱ는 최종 단계 클리어 뒤
    const R = STAGES.RECHALLENGE[tier], last = STAGES.LIST[STAGES.LIST.length - 1].id;
    if (!R || R.SKIP.includes(id)) return { unlocked: false, reason: '이 단계에는 없음', rec, none: true };
    if (!save.stages[String(id)]?.cleared) return { unlocked: false, reason: `${id}단계 클리어 필요`, rec };
    if (R.UNLOCK === 'final' && !save.stages[String(last)]?.cleared) return { unlocked: false, reason: `${last}단계(최종) 클리어 필요`, rec };
    return { unlocked: true, reason: '', rec };
  }
  if (id === 1) return { unlocked: true, reason: '', rec };
  const prev = save.stages[String(id - 1)];
  if (!prev || !prev.cleared) return { unlocked: false, reason: `${id - 1}단계 클리어 필요`, rec };
  const gate = STAGES.RULES.STAR_GATE[id];
  if (gate && totalStars(save) < gate) return { unlocked: false, reason: `별 ${gate}개 필요 (지금 ${totalStars(save)})`, rec };
  return { unlocked: true, reason: '', rec };
}

// 스테이지 → 실제로 불러올 몬스터 사양 (종 기본값 × 스테이지 배율 × 재도전 배율·변형)
export function resolveStage(id, tier = 0) {
  const st = stageById(id);
  if (!st) throw new Error(`스테이지 ${id} 없음`);
  const R = tier ? STAGES.RECHALLENGE[tier] : null;
  const sp = MONSTERS.SPECIES[st.monsterId], variantKey = R ? R.variant : 'normal', va = MONSTERS.VARIANTS[variantKey];
  const rk = (k) => (R ? R[k] : 1);
  const allowed = st.PATTERNS === 'all' ? sp.PATTERNS : sp.PATTERNS.filter((p) => st.PATTERNS.includes(p.key));
  const protos = new Set(allowed.map((p) => p.proto).filter(Boolean));
  const skipped = allowed.filter((p) => !p.proto && !p.gimmick).map((p) => p.name);   // 기믹 패턴은 GIMMICK이 구현
  if (st.EXTRA) skipped.push(st.EXTRA);
  const rageBase = st.RAGE_AT === null ? 0 : st.RAGE_AT;
  return {
    id, tier, key: stageKey(id, tier), stage: st, speciesKey: st.monsterId, monsterId: st.monsterId, variantKey, species: sp, variant: va, re: R,
    name: `${sp.short}${R ? ` (${va.label})` : ''}`,
    hp: Math.round(sp.BASE_HP * st.HP_K * rk('HP_K')),
    speedK: sp.SPEED_K * st.SPEED_K,
    windK: Math.max(STAGES.RULES.WIND_MIN, st.WIND_K * rk('WIND_K')),
    dmgK: st.DMG_K * rk('DMG_K'),
    rageAt: rageBase > 0 ? Math.min(0.9, rageBase + va.RAGE_ADD) : 0,
    sizeK: MONSTER_SCALE.BY_STAGE[id] * va.SCALE, body: sp.BODY,   // 크기 = 집 × 단계 배율 × 변형 배율 intro: sp.INTRO, glow: sp.GLOW,
    gimmick: sp.GIMMICK, gimmickK: R ? R.GIMMICK_K : 1, doubleP: R ? R.DOUBLE_P : 0,
    timeStar: Math.round(st.TIME_STAR * rk('TIME_K')),
    color: va.TINT ? mixHex(sp.COLOR, va.TINT.color, va.TINT.amount) : sp.COLOR,
    rim: va.RIM, eye: va.EYE || sp.EYE,
    danger: st.DANGER, dangerText: dangerText(st.DANGER),
    raid: st.RAID, raidText: raidKinds(st).join(' · '),
    allowSlam: protos.has('slam'), allowCharge: protos.has('charge'),
    patternNames: allowed.map((p) => p.name), skipped,
    parts: sp.PARTS, model: sp.MODEL,
  };
}

// 직업 해금: 시작 무기 + 시작 소모품 지급 (이미 있으면 무기는 그대로)
export function grantJobStart(save, job) {
  const S = HUNTERS.JOBS[job].START;
  if (!save.jobsUnlocked.includes(job)) save.jobsUnlocked.push(job);
  if (!save.equipment.equipped.weapon[job]) {
    const it = { id: save.equipment.nextId++, slot: 'weapon', job, grade: S.weapon.grade, enh: S.weapon.enh };
    save.equipment.items.push(it); save.equipment.equipped.weapon[job] = it.id;
  }
  for (const [k, n] of Object.entries(S.items)) save.inventory.items[k] = Math.min(ITEMS.CONSUMABLES[k].max, (save.inventory.items[k] || 0) + n);
}

export function levelFromExp(exp) {
  const N = HUNTERS.LEVEL.NEXT;
  let lv = 1, acc = 0;
  while (lv < HUNTERS.LEVEL.MAX && exp >= acc + N[lv - 1]) { acc += N[lv - 1]; lv++; }
  return { level: lv, into: exp - acc, next: lv < HUNTERS.LEVEL.MAX ? N[lv - 1] : 0 };
}

const add = (bag, k, n) => { if (n > 0) bag[k] = (bag[k] || 0) + n; };
function rollDrop(d, first, rng) {
  if (!d) return 0;
  const chance = d.chance ?? 1;
  if (!(first && d.firstGuaranteed) && rng() >= chance) return 0;
  return d.base + (rng() < (d.extraChance || 0) ? 1 : 0);
}

// 사냥 결과 정산 → save를 고치고 요약을 돌려준다
//   r = { stageId, win, killed, villageRatio, shelterAlive, huntTime, pickups: {재료키: n}, bundles }
export function settleHunt(save, r, rng = Math.random) {
  const st = stageById(r.stageId), R0 = STAGES.RULES, tier = r.tier || 0, key = stageKey(r.stageId, tier);
  const RE = tier ? STAGES.RECHALLENGE[tier] : null, reK = (k) => (RE ? RE[k] : 1);
  const timeStar = Math.round(st.TIME_STAR * reK('TIME_K'));
  const prev = save.stages[key] || { cleared: false, stars: [false, false, false], bestTime: null, clears: 0, plays: 0 };
  const extra = st.CLEAR_EXTRA || {};
  let cleared = r.win;
  const failNote = [];
  if (cleared && extra.villageMin && r.villageRatio < extra.villageMin) { cleared = false; failNote.push(`마을 ${Math.round(extra.villageMin * 100)}% 이상 필요`); }
  if (cleared && extra.shelterAlive && !r.shelterAlive) { cleared = false; failNote.push('대피소 생존 필요'); }
  if (cleared && extra.killOnly && !r.killed) { cleared = false; failNote.push('처치 필요'); }
  const first = cleared && !prev.cleared;
  const stars = cleared ? [true, r.villageRatio >= R0.STARS.VILLAGE_MIN, r.killed && r.huntTime <= timeStar] : [false, false, false];
  const starN = stars.filter(Boolean).length;

  const sum = { cleared, first, stars, starN, exp: 0, gold: 0, materials: {}, items: {}, levelFrom: r.levelAtStart ?? save.hunter.level, levelTo: 0, jobUnlocked: null, failNote };
  // 끝날 때 주는 경험치 (처치·부위 파괴 경험치는 사냥 중 이미 받음 → r.liveExp)
  const E = HUNTERS.EXP, mul = (1 + (r.expMul || 0)) * reK('EXP_K'), comps = [];
  if (cleared) {
    comps.push(['클리어', E.CLEAR_K]);
    if (r.villageRatio >= R0.STARS.VILLAGE_MIN) comps.push(['마을 보호', E.VILLAGE_K]);
    if (r.shelterSaved) comps.push(['대피소 보호', E.SHELTER_K]);
    if (first) comps.push(['첫 클리어', E.FIRST_K]);
  } else comps.push(['도전', E.CLEAR_K * E.FAIL_CLEAR_K]);
  sum.expParts = [...(r.liveParts || []), ...comps.map(([label, k]) => [label, Math.round(st.EXP * k * mul)])];
  sum.exp = comps.reduce((a, [, k]) => a + Math.round(st.EXP * k * mul), 0);
  sum.expTotal = sum.exp + (r.liveExp || 0);
  sum.gold = cleared ? Math.round(st.GOLD * reK('GOLD_K') * (first ? R0.FIRST_CLEAR_GOLD_K : 1) * (1 + R0.STAR_GOLD_K * starN) * (r.killed ? 1 : R0.RETREAT_GOLD_K)) : 0;

  // 주운 재료: 실패면 절반만
  for (const [k, n] of Object.entries(r.pickups || {})) if (MATERIALS[k]) add(sum.materials, k, cleared ? n : Math.floor(n * R0.FAIL_KEEP));
  // 처치 보상 (★3이면 한 번 더 굴림)
  if (cleared && r.killed) {
    const sp = MONSTERS.SPECIES[st.monsterId], va = MONSTERS.VARIANTS[RE ? RE.variant : 'normal'];
    const rolls = 1 + (stars[2] ? R0.STAR3_REROLL : 0);
    for (let i = 0; i < rolls; i++) {
      add(sum.materials, sp.KILL_DROP.material, rollDrop(sp.KILL_DROP, first && i === 0, rng));
      if (va.EXTRA_DROP) add(sum.materials, va.EXTRA_DROP.material, rollDrop(va.EXTRA_DROP, false, rng));
    }
  }
  // 채집 (지점마다 표의 재료를 각각 굴림, 실패면 절반) + 마을 보급 (클리어마다)
  sum.gathered = {}; sum.supply = {};
  for (let i = 0; i < ITEMS.GATHER.POINTS; i++) for (const g of ITEMS.GATHER.TABLE) {
    if (rng() < g.chance) add(sum.gathered, g.mat, g.min + Math.floor(rng() * (g.max - g.min + 1)));
  }
  if (!cleared) for (const k of Object.keys(sum.gathered)) sum.gathered[k] = Math.floor(sum.gathered[k] * R0.FAIL_KEEP);
  if (cleared) Object.assign(sum.supply, VILLAGE_UPGRADES.LEVELS[save.village.level].supply);
  for (const [k, n] of [...Object.entries(sum.gathered), ...Object.entries(sum.supply)]) add(sum.materials, k, n);
  // 대피소 감사 꾸러미 풀기
  const B = ITEMS.BUNDLES.THANKS_BUNDLE;
  for (let i = 0; i < (r.bundles || 0); i++) {
    sum.gold += B.goldPerVillageLv * save.village.level;
    for (const [k, n] of Object.entries(B.items)) add(sum.items, k, n);
    for (const [k, n] of Object.entries(B.mats)) add(sum.materials, k, n);
  }

  // 반영
  addExp(save, sum.exp);
  sum.levelTo = save.hunter.level;
  save.currency.gold += sum.gold;
  for (const [k, n] of Object.entries(sum.materials)) add(save.inventory.materials, k, n);
  for (const [k, n] of Object.entries(sum.items)) {
    const cap = (ITEMS.CONSUMABLES[k] || ITEMS.PLACEABLES[k]).max;
    save.inventory.items[k] = Math.min(cap, (save.inventory.items[k] || 0) + n);
  }
  const rec = { ...prev, stars: prev.stars.map((s, i) => s || stars[i]), plays: prev.plays + 1 };
  if (cleared) {
    rec.cleared = true; rec.clears = prev.clears + 1;
    if (r.killed && (rec.bestTime === null || r.huntTime < rec.bestTime)) rec.bestTime = Math.round(r.huntTime);
  }
  save.stages[key] = rec;
  // 전투 중 쓴 아이템은 가방에서 뺀다
  sum.itemsUsed = {};
  for (const [k, n] of Object.entries(r.itemsUsed || {})) {
    const have = save.inventory.items[k] || 0, use = Math.min(have, n);
    if (!use) continue;
    sum.itemsUsed[k] = use;
    if (have - use > 0) save.inventory.items[k] = have - use; else delete save.inventory.items[k];
  }
  // 도감 기록 (사냥 기록 · 부순 부위 = 약점 공개 · 얻은 재료 = 드롭 공개)
  sum.bestiaryNew = recordBestiary(save, r, sum.materials);
  if (first && !tier && st.JOB_UNLOCK && !save.jobsUnlocked.includes(st.JOB_UNLOCK)) {
    grantJobStart(save, st.JOB_UNLOCK);
    sum.jobUnlocked = HUNTERS.JOBS[st.JOB_UNLOCK].name;
  }
  return sum;
}
