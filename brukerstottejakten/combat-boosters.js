// Active-play clocks: pause, quiz and intermission never consume a booster.
export const COFFEE_DURATION_MS = 5_000;
export const COFFEE_SCALE = 1.65;
export const WEAPON_DURATION_MS = 12_000;
export const PICKUPS = Object.freeze({
  coffee: Object.freeze({ name: 'Kaffe', label: 'KAFFE · 5 s', color: '#e7bb77' }),
  phone: Object.freeze({ name: 'Telefon', label: 'SPREDNING · 12 s', color: '#90c9eb' }),
  email: Object.freeze({ name: 'E-post', label: 'OMRÅDE · 12 s', color: '#a9d7aa' }),
});

// Keep the existing objective categories; variants add identities and durability.
export const CASE_VARIANTS = Object.freeze({
  vip: Object.freeze({ kind: 'priority', name: 'VIP-henvendelse', label: 'VIP', health: 2, level: 3, scoreScale: 1.15, color: '#f1bc81' }),
  hardware: Object.freeze({ kind: 'shield', name: 'Maskinvarefeil', label: 'MASKINVARE', health: 3, level: 4, scoreScale: 1.35, color: '#b8caff' }),
  network: Object.freeze({ kind: 'legacy', name: 'Nettverksbrudd', label: 'NETTVERK', health: 3, level: 6, scoreScale: 1.6, color: '#87d7c6' }),
  server: Object.freeze({ kind: 'shield', name: 'Serverhavari', label: 'SERVERHAVARI', health: 5, level: 7, scoreScale: 2, color: '#cbb1e9' }),
  security: Object.freeze({ kind: 'critical', name: 'Sikkerhetshendelse', label: 'SIKKERHET', health: 4, level: 8, scoreScale: 1.6, color: '#efb4ba' }),
});

export function createBoostState() {
  return { coffeeUntil: 0, weaponUntil: 0, weapon: 'single' };
}

export function collectBoost(state, kind, now) {
  if (!Number.isFinite(now) || now < 0 || !Object.hasOwn(PICKUPS, kind)) return state;
  if (kind === 'coffee') return { ...state, coffeeUntil: now + COFFEE_DURATION_MS };
  return { ...state, weapon: kind === 'phone' ? 'scatter' : 'area', weaponUntil: now + WEAPON_DURATION_MS };
}

export function boostStatus(state, now) {
  const coffeeMs = Math.max(0, state.coffeeUntil - now);
  const weaponMs = Math.max(0, state.weaponUntil - now);
  return { coffeeMs, weaponMs, scale: coffeeMs > 0 ? COFFEE_SCALE : 1, weapon: weaponMs > 0 ? state.weapon : 'single' };
}

export function chooseVariant(kind, level, roll = Math.random()) {
  const eligible = Object.keys(CASE_VARIANTS).filter(key => CASE_VARIANTS[key].kind === kind && CASE_VARIANTS[key].level <= level);
  if (!eligible.length || !Number.isFinite(roll) || roll < 0 || roll >= .65) return null;
  return eligible[Math.min(eligible.length - 1, Math.floor(roll / .65 * eligible.length))];
}

export function variantHealth(variant, shieldBonus = 0) {
  const spec = CASE_VARIANTS[variant];
  if (!spec) return null;
  return Math.max(1, spec.health - (['shield', 'critical'].includes(spec.kind) ? shieldBonus : 0));
}

export function pickupScreen(pickup, width, height) {
  return { x: pickup.x * width, y: height * .652, radius: Math.max(20, Math.min(31, height * .04)) };
}

export function hitPickup(pickups, x, y, width, height) {
  return [...pickups].reverse().find(pickup => {
    if (pickup.dead) return false;
    const p = pickupScreen(pickup, width, height);
    return Math.hypot(x - p.x, y - p.y) <= p.radius + 5;
  }) || null;
}

export function weaponGeometry(mode, x, y, width) {
  const spread = Math.max(44, Math.min(86, width * .065));
  return {
    radius: Math.max(48, Math.min(120, width * .09)),
    points: mode === 'scatter' ? [{ x, y }, { x: x - spread, y: y - 12 }, { x: x + spread, y: y - 12 }] : [{ x, y }],
  };
}

function circleTouchesPolygon(x, y, radius, polygon) {
  if (!polygon?.length) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[j], b = polygon[i];
    if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
    const dx = b.x - a.x, dy = b.y - a.y;
    const fraction = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    if (Math.hypot(x - a.x - fraction * dx, y - a.y - fraction * dy) <= radius) return true;
  }
  return inside;
}

export function weaponTargets(renderer, targets, x, y, mode, hitboxScale = 1) {
  const primary = renderer.hitTest(targets, x, y, hitboxScale);
  // Deliberate duplicate shots still cost points. Collateral hits never punish the player.
  if (primary?.kind === 'duplicate' || mode === 'single') return primary ? [primary] : [];
  const live = targets.filter(t => !t.dead && !t.resolving && t.kind !== 'duplicate' && t.screen);
  const chosen = new Set(primary ? [primary] : []);
  const geometry = weaponGeometry(mode, x, y, renderer.width);
  if (mode === 'scatter') {
    for (const point of geometry.points.slice(primary ? 1 : 0)) {
      const hit = renderer.hitTest(live.filter(target => !chosen.has(target)), point.x, point.y, hitboxScale);
      if (hit) chosen.add(hit);
    }
  } else if (mode === 'area') {
    for (const target of live) {
      if (circleTouchesPolygon(x, y, geometry.radius, target.screen.polygon)) chosen.add(target);
    }
  }
  return [...chosen];
}

// Scale the same geometry used for drawing and hit tests, never target dimensions.
// This prevents repeated renders/coffee pickups from exponentially growing cases.
export function coffeeScreen(screen, factor, width, top, bottom) {
  if (!(factor > 1)) return screen;
  const fullHeight = screen.bounds.bottom - screen.bounds.top;
  const scale = Math.max(1, Math.min(factor, width * .88 / screen.width, (bottom - top - 8) / fullHeight));
  const c = screen.center;
  const minY = c.y + (screen.bounds.top - c.y) * scale;
  const maxY = c.y + (screen.bounds.bottom - c.y) * scale;
  const shiftY = minY < top ? top - minY : maxY > bottom ? bottom - maxY : 0;
  const point = p => ({ x: c.x + (p.x - c.x) * scale, y: c.y + (p.y - c.y) * scale + shiftY });
  return {
    ...screen,
    center: { x: c.x, y: c.y + shiftY },
    width: screen.width * scale, height: screen.height * scale, depth: screen.depth * scale,
    front: screen.front.map(point), polygon: screen.polygon.map(point),
    offset: { x: screen.offset.x * scale, y: screen.offset.y * scale },
    bounds: {
      left: c.x + (screen.bounds.left - c.x) * scale,
      right: c.x + (screen.bounds.right - c.x) * scale,
      top: minY + shiftY, bottom: maxY + shiftY,
    },
  };
}

export function drawPickup(context, pickup, width, height) {
  if (pickup.dead || !PICKUPS[pickup.kind]) return;
  const spec = PICKUPS[pickup.kind], p = pickupScreen(pickup, width, height);
  context.save();
  context.translate(p.x, p.y);
  context.fillStyle = '#102b32';
  context.strokeStyle = spec.color;
  context.lineWidth = 2;
  context.beginPath(); context.arc(0, 0, p.radius, 0, Math.PI * 2); context.fill(); context.stroke();
  // Vector icons remain legible without emoji fonts, rotation or flashing.
  const s = p.radius / 26;
  context.save(); context.scale(s, s);
  context.fillStyle = spec.color;
  if (pickup.kind === 'coffee') {
    context.fillRect(-12, -7, 21, 18);
    context.strokeRect(9, -4, 8, 10);
    context.beginPath(); context.moveTo(-15, 15); context.lineTo(15, 15); context.stroke();
    context.beginPath(); context.moveTo(-5, -10); context.lineTo(-5, -16); context.moveTo(2, -10); context.lineTo(2, -16); context.stroke();
  } else if (pickup.kind === 'phone') {
    context.strokeRect(-9, -16, 18, 32);
    context.fillRect(-5, -11, 10, 18);
    context.beginPath(); context.arc(0, 11, 1.4, 0, Math.PI * 2); context.fill();
  } else {
    context.strokeRect(-16, -10, 32, 22);
    context.beginPath(); context.moveTo(-16, -10); context.lineTo(0, 3); context.lineTo(16, -10); context.stroke();
  }
  context.restore();
  context.font = '800 10px ui-monospace, monospace';
  context.textAlign = 'center';
  const labelWidth = context.measureText(spec.label).width + 12;
  context.fillStyle = '#102b32';
  context.fillRect(-labelWidth / 2, p.radius + 5, labelWidth, 18);
  context.fillStyle = spec.color;
  context.fillText(spec.label, 0, p.radius + 18);
  context.restore();
}

export function drawVariantBadge(context, target) {
  const spec = CASE_VARIANTS[target.variant], s = target.screen;
  if (!spec || !s || target.resolving) return;
  context.save();
  const text = `${spec.label} · ${target.health}/${target.maxHealth}`;
  context.font = `800 ${Math.max(8, Math.min(11, s.width * .07))}px ui-monospace, monospace`;
  context.textAlign = 'center';
  const w = context.measureText(text).width + 12;
  const y = s.bounds.bottom + 5;
  context.fillStyle = '#10252f'; context.fillRect(s.center.x - w / 2, y, w, 19);
  context.strokeStyle = spec.color; context.lineWidth = 1; context.strokeRect(s.center.x - w / 2, y, w, 19);
  context.fillStyle = spec.color; context.fillText(text, s.center.x, y + 13);
  context.restore();
}

export function drawWeaponGuide(context, mode, aim, width) {
  if (!aim?.visible || mode === 'single') return;
  const geometry = weaponGeometry(mode, aim.x, aim.y, width);
  context.save();
  context.strokeStyle = 'rgba(180,218,225,.55)'; context.lineWidth = 1;
  // A steady outline shows the actual reach. No shot-triggered light effects.
  for (const point of geometry.points) {
    context.beginPath();
    context.arc(point.x, point.y, mode === 'area' ? geometry.radius : 5, 0, Math.PI * 2);
    context.stroke();
  }
  context.restore();
}

export function mountBoostHud(board) {
  const panel = document.createElement('div');
  panel.id = 'boostHud';
  panel.className = 'boost-hud';
  panel.setAttribute('aria-label', 'Kaffe og våpenbonus');
  const coffee = document.createElement('span'); coffee.id = 'coffeeStatus';
  const weapon = document.createElement('span'); weapon.id = 'pickupWeaponStatus';
  panel.append(coffee, weapon); board.append(panel);
  const style = document.createElement('style');
  style.textContent = `
    .boost-hud { position:absolute; z-index:22; top:9px; left:12px; display:grid; gap:3px; pointer-events:none; color:#e4dac2; font:800 10px/1.5 ui-monospace,monospace; }
    .boost-hud span { padding:3px 7px; border:1px solid #52676b; border-radius:5px; background:#102b32; }
    .weapon-rig[data-pickup-weapon="scatter"] .gun-barrel { box-shadow: -7px 0 0 #537f9b, 7px 0 0 #537f9b; }
    .weapon-rig[data-pickup-weapon="area"] .gun-core { outline:3px solid #a9d7aa; outline-offset:4px; }
    @media(max-width:1100px) { .boost-hud { top:130px; left:8px; right:8px; display:flex; justify-content:space-between; font-size:9px; } }
    @media(max-height:600px) { .boost-hud { top:102px; left:8px; right:8px; display:flex; justify-content:space-between; font-size:8px; } }
  `;
  document.head.append(style);
  const guide = document.createElement('p');
  guide.className = 'boost-brief';
  guide.textContent = 'Skyt kaffekoppen: større saker i 5 s. Telefon: treskudds-spredning i 12 s. E-post: områdetreff i 12 s. Pulsskudd er fortsatt presise enkelttreff. Nye sakstyper tåler 2–5 treff; se navn og treffmåler.';
  guide.style.cssText = 'font-size:11px;line-height:1.5;color:#d8e5df;margin:10px 0';
  document.querySelector('.start-card .controls-row')?.before(guide);
  return status => {
    const coffeeText = status.coffeeMs > 0 ? `Kaffe · ${(status.coffeeMs / 1000).toFixed(1)} s` : 'Skyt kaffe · større saker';
    const weaponText = status.weaponMs > 0 ? `${status.weapon === 'scatter' ? 'Spredning' : 'Område'} · ${(status.weaponMs / 1000).toFixed(1)} s` : 'Skyt telefon / e-post';
    if (coffee.textContent !== coffeeText) coffee.textContent = coffeeText;
    if (weapon.textContent !== weaponText) weapon.textContent = weaponText;
  };
}
