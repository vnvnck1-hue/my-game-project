/**
 * 가벼운 이펙트 시스템 — FloatingText, Particle.
 * 큰 시스템 클래스 대신 단일 모듈에 일괄 정의해 사용성 우선.
 */

export interface FloatingText {
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
  text: string;
  color: string;
  scale: number;
  alive: boolean;
}

export function spawnFloatingText(
  list: FloatingText[],
  x: number,
  y: number,
  text: string,
  color: string,
  scale = 1,
): void {
  list.push({
    x,
    y,
    vy: -60,
    life: 0.7,
    maxLife: 0.7,
    text,
    color,
    scale,
    alive: true,
  });
}

export function updateFloatingTexts(list: FloatingText[], dt: number): void {
  for (const t of list) {
    if (!t.alive) continue;
    t.life -= dt;
    t.y += t.vy * dt;
    t.vy += 60 * dt; // 살짝 감속(중력 반대)
    if (t.life <= 0) t.alive = false;
  }
  // 깔끔히 제거
  for (let i = list.length - 1; i >= 0; i--) if (!list[i].alive) list.splice(i, 1);
}

export function drawFloatingTexts(list: FloatingText[], ctx: CanvasRenderingContext2D): void {
  for (const t of list) {
    if (!t.alive) continue;
    const a = Math.max(0, Math.min(1, t.life / t.maxLife));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = `bold ${Math.round(13 * t.scale)}px "Segoe UI", system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.strokeText(t.text, t.x, t.y);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
    ctx.restore();
  }
}

/* ----------------------- Particles ----------------------- */

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alive: boolean;
  /** "circle" | "square" | "spark" */
  shape: "circle" | "square" | "spark";
  /** 중력 적용 여부 */
  gravity: number;
}

export function spawnParticleBurst(
  list: Particle[],
  x: number,
  y: number,
  count: number,
  color: string,
  speed = 120,
  options: Partial<Pick<Particle, "shape" | "gravity" | "size" | "maxLife">> = {},
): void {
  const shape = options.shape ?? "circle";
  const gravity = options.gravity ?? 240;
  const size = options.size ?? 3;
  const maxLife = options.maxLife ?? 0.55;
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const sp = speed * (0.5 + Math.random() * 0.6);
    list.push({
      x,
      y,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp - sp * 0.4,
      life: maxLife,
      maxLife,
      size,
      color,
      alive: true,
      shape,
      gravity,
    });
  }
}

export function updateParticles(list: Particle[], dt: number): void {
  for (const p of list) {
    if (!p.alive) continue;
    p.life -= dt;
    p.vy += p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.life <= 0) p.alive = false;
  }
  for (let i = list.length - 1; i >= 0; i--) if (!list[i].alive) list.splice(i, 1);
}

export function drawParticles(list: Particle[], ctx: CanvasRenderingContext2D): void {
  for (const p of list) {
    if (!p.alive) continue;
    const a = Math.max(0, Math.min(1, p.life / p.maxLife));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    if (p.shape === "circle") {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.shape === "square") {
      ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
    } else {
      // spark — 가는 선
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1.5;
      const len = p.size * 2;
      const ang = Math.atan2(p.vy, p.vx);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - Math.cos(ang) * len, p.y - Math.sin(ang) * len);
      ctx.stroke();
    }
    ctx.restore();
  }
}
