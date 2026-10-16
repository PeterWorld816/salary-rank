// Tiny canvas confetti burst for ResultCelebration.tsx — loaded with a
// dynamic import only when a Top 10%+ band is reached, so it costs nothing
// on the initial bundle. Pieces fly up and out from (x, y) inside `host`,
// fall back with gravity, and fade out; the canvas is removed as soon as the
// burst ends, the tab is hidden, or the returned cancel function is called.
// The canvas covers only `host` (the result card) and ignores the pointer.

type Piece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vr: number;
  color: string;
  round: boolean;
  wobble: number;
};

const GRAVITY = 780; // px/s²
const DRAG = 2.2; // per second, exponential

export function launchConfetti(
  host: HTMLElement,
  { x, y, count, durationMs, colors }: { x: number; y: number; count: number; durationMs: number; colors: string[] }
): () => void {
  const w = host.clientWidth;
  const h = host.clientHeight;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx || w === 0 || h === 0) return () => {};

  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "absolute",
    inset: "0",
    width: `${w}px`,
    height: `${h}px`,
    pointerEvents: "none",
  });
  host.appendChild(canvas);
  ctx.scale(dpr, dpr);

  const pieces: Piece[] = Array.from({ length: count }, () => {
    // Mostly upward, spread ±50°.
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.75;
    const speed = 260 + Math.random() * 360;
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 3.5 + Math.random() * 3.5,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 12,
      color: colors[Math.floor(Math.random() * colors.length)],
      round: Math.random() < 0.35,
      wobble: Math.random() * Math.PI * 2,
    };
  });

  let raf = 0;
  let done = false;
  const start = performance.now();
  let last = start;

  function cleanup() {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    document.removeEventListener("visibilitychange", onVisibility);
    canvas.remove();
  }
  function onVisibility() {
    if (document.hidden) cleanup();
  }

  function frame(now: number) {
    const elapsed = now - start;
    if (elapsed >= durationMs) return cleanup();
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    const drag = Math.exp(-DRAG * dt);
    // Everything fades over the last 40% of the burst.
    const fade = Math.min(1, (1 - elapsed / durationMs) / 0.4);

    ctx!.clearRect(0, 0, w, h);
    ctx!.globalAlpha = fade;
    for (const p of pieces) {
      p.vx *= drag;
      p.vy = p.vy * drag + GRAVITY * dt;
      p.wobble += dt * 6;
      p.x += (p.vx + Math.sin(p.wobble) * 18) * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.y > h + 10) continue;
      ctx!.fillStyle = p.color;
      if (p.round) {
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        ctx!.fill();
      } else {
        ctx!.save();
        ctx!.translate(p.x, p.y);
        ctx!.rotate(p.rot);
        ctx!.fillRect(-p.size / 2, -p.size / 3, p.size, (p.size * 2) / 3);
        ctx!.restore();
      }
    }
    raf = requestAnimationFrame(frame);
  }

  document.addEventListener("visibilitychange", onVisibility);
  raf = requestAnimationFrame(frame);
  return cleanup;
}
