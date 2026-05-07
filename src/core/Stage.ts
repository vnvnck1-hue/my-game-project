/**
 * Stage 좌표계
 * 논리 해상도 480x854.
 * 전장 영역 y=120 ~ y=540 (높이 420), 3층으로 균등 분할.
 * 각 층 중앙 y 좌표는 floorY[i].
 * x 범위 0~480.
 */
export const STAGE_W = 480;
export const STAGE_H = 854;

/**
 * 필드 영역은 상단 Stage 바(아래쪽 경계 120) ~ 스킬바 위 까지.
 * UI CSS 기준 스킬바 top = 854 - 392 - 60 = 402이므로 약간의 여백을 두고 398에서 끝낸다.
 * 3층으로 균등 분할 → FLOOR_HEIGHT ≈ 92.6
 */
export const FIELD_TOP = 124;
export const FIELD_BOTTOM = 398;
export const FIELD_HEIGHT = FIELD_BOTTOM - FIELD_TOP; // 274
export const FLOOR_COUNT = 3;
export const FLOOR_HEIGHT = FIELD_HEIGHT / FLOOR_COUNT; // ~91.3

/** 각 층의 "지면" y 좌표 (캐릭터 발 위치) */
export const floorGroundY = (floor: number) => FIELD_TOP + (floor + 1) * FLOOR_HEIGHT - 8;

/** 각 층의 상단 경계 y */
export const floorTopY = (floor: number) => FIELD_TOP + floor * FLOOR_HEIGHT;

export const FIELD_LEFT = 0;
export const FIELD_RIGHT = STAGE_W;

export const SPAWN_LEFT = -20;
export const SPAWN_RIGHT = STAGE_W + 20;

/**
 * 전장 배경(3층 + 벽돌 라인) 그리기
 */
export function drawStageBackground(ctx: CanvasRenderingContext2D): void {
  // 어두운 던전 배경
  const grad = ctx.createLinearGradient(0, FIELD_TOP, 0, FIELD_BOTTOM);
  grad.addColorStop(0, "#241a3e");
  grad.addColorStop(1, "#1a1230");
  ctx.fillStyle = grad;
  ctx.fillRect(0, FIELD_TOP, STAGE_W, FIELD_HEIGHT);

  // 층 라인 (지면)
  for (let i = 0; i < FLOOR_COUNT; i++) {
    const y = floorGroundY(i);

    // 지면 그림자
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(0, y, STAGE_W, 8);

    // 지면 라인
    ctx.fillStyle = "#3a2a5e";
    ctx.fillRect(0, y - 1, STAGE_W, 2);

    // 벽돌 패턴 (지면 위 좁은 띠)
    ctx.fillStyle = "rgba(60, 42, 100, 0.4)";
    for (let x = (i % 2) * 16; x < STAGE_W; x += 32) {
      ctx.fillRect(x, y - 4, 14, 2);
    }
  }

  // 상단 데코: 횃불 점 (분위기용)
  for (let i = 0; i < FLOOR_COUNT; i++) {
    const y = floorTopY(i) + 14;
    ctx.fillStyle = "rgba(255, 180, 80, 0.7)";
    ctx.beginPath();
    ctx.arc(120, y, 2, 0, Math.PI * 2);
    ctx.arc(360, y, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}
