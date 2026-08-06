/**
 * Simple confetti animation utility
 * Creates burst of colorful paper pieces falling down the screen
 */

interface ConfettiPiece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  life: number;
}

export function triggerConfetti(duration: number = 2000): void {
  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.zIndex = '9999';
  canvas.style.pointerEvents = 'none';

  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    document.body.removeChild(canvas);
    return;
  }

  const pieces: ConfettiPiece[] = [];
  const colors = ['#6C63FF', '#FFB74D', '#4CAF50', '#E53935', '#FF6B9D'];

  // Create confetti pieces
  for (let i = 0; i < 80; i++) {
    pieces.push({
      x: Math.random() * canvas.width,
      y: -10,
      vx: (Math.random() - 0.5) * 8,
      vy: Math.random() * 6 + 4,
      r: Math.random() * 4 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 1,
    });
  }

  const startTime = Date.now();
  const animate = () => {
    const elapsed = Date.now() - startTime;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = pieces.length - 1; i >= 0; i--) {
      const p = pieces[i];

      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2; // gravity
      p.vx *= 0.98; // air resistance

      // Fade out
      p.life -= 1 / (duration / 16);

      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.fillRect(p.x, p.y, p.r * 2, p.r * 2);

      if (p.life <= 0) {
        pieces.splice(i, 1);
      }
    }

    if (pieces.length > 0 && elapsed < duration) {
      requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      document.body.removeChild(canvas);
    }
  };

  animate();
}

