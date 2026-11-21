import {
  EnvironmentLighting,
  InteractionMode,
  PhotoItem,
  buildCssFilter,
} from '../types';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

const ACCENT_PALETTES = {
  'cyan-purple': ['rgba(34,211,238,0.28)', 'rgba(168,85,247,0.26)'],
  'electric-blue': ['rgba(59,130,246,0.32)', 'rgba(14,165,233,0.24)'],
  'crimson-violet': ['rgba(244,63,94,0.26)', 'rgba(139,92,246,0.28)'],
  'emerald-cyan': ['rgba(16,185,129,0.26)', 'rgba(6,182,212,0.26)'],
};

export async function exportCompositionToPng(
  photos: PhotoItem[],
  lighting: EnvironmentLighting,
  mode: InteractionMode
): Promise<void> {
  const width = 1920;
  const height = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 1. Deep Obsidian/Graphite Backdrop
  const bg = ctx.createRadialGradient(
    width * 0.5,
    height * 0.45,
    120,
    width * 0.5,
    height * 0.5,
    width * 0.72
  );
  bg.addColorStop(0, '#0d1324');
  bg.addColorStop(0.55, '#060812');
  bg.addColorStop(1, '#020308');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // 2. Ambient Aurora Orbs
  const [c1, c2] = ACCENT_PALETTES[lighting.themeAccent];
  const alphaScale = lighting.auroraIntensity / 100;
  if (alphaScale > 0.02) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, alphaScale);

    const orb1 = ctx.createRadialGradient(
      width * 0.28,
      height * 0.32,
      10,
      width * 0.28,
      height * 0.32,
      540
    );
    orb1.addColorStop(0, c1);
    orb1.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = orb1;
    ctx.fillRect(0, 0, width, height);

    const orb2 = ctx.createRadialGradient(
      width * 0.74,
      height * 0.68,
      10,
      width * 0.74,
      height * 0.68,
      580
    );
    orb2.addColorStop(0, c2);
    orb2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = orb2;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // 3. Subtle Spatial Grid
  if (lighting.gridEnabled) {
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.07)';
    ctx.lineWidth = 1;
    const step = 64;
    for (let x = 0; x <= width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 4. Render Photos sorted by zIndex
  const sorted = [...photos].filter((p) => p.visible).sort((a, b) => a.zIndex - b.zIndex);
  const loadedImages = await Promise.all(sorted.map((p) => loadImage(p.src)));

  const vw = Math.max(360, window.innerWidth);
  const vh = Math.max(360, window.innerHeight);
  const scaleFactorX = width / vw;
  const scaleFactorY = height / vh;
  const uniformScale = Math.min(scaleFactorX, scaleFactorY);

  const baseCardWidth = vw < 768 ? 225 : 295;

  sorted.forEach((photo, idx) => {
    const img = loadedImages[idx];
    const cardW = baseCardWidth * photo.scale * uniformScale;
    const cardH = (baseCardWidth / photo.aspectRatio) * photo.scale * uniformScale;

    let cx = width / 2 + photo.x * uniformScale;
    let cy = height / 2 + photo.y * uniformScale;
    let rot = photo.rotation;

    if (mode === 'compare') {
      cx = idx === 0 ? width * 0.34 : width * 0.66;
      cy = height * 0.5;
      rot = 0;
    }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.scale(photo.flipX ? -1 : 1, photo.flipY ? -1 : 1);
    ctx.globalAlpha = photo.effects.opacity / 100;

    if (photo.effects.blendMode && photo.effects.blendMode !== 'normal') {
      ctx.globalCompositeOperation = photo.effects.blendMode as GlobalCompositeOperation;
    }

    // Shadow & Neon Glow
    if (photo.effects.shadowIntensity > 0 || photo.effects.neonGlow > 0) {
      ctx.save();
      drawRoundedRectPath(ctx, -cardW / 2, -cardH / 2, cardW, cardH, 22);
      ctx.shadowColor =
        photo.effects.neonGlow > 10
          ? photo.effects.neonColor
          : `rgba(0,0,0,${(photo.effects.shadowIntensity / 100) * 0.85})`;
      ctx.shadowBlur = Math.max(
        photo.effects.neonGlow * 0.9,
        photo.effects.shadowIntensity * 0.6
      );
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fill();
      ctx.restore();
    }

    // Clip to rounded card & draw image with CSS filter
    ctx.save();
    drawRoundedRectPath(ctx, -cardW / 2, -cardH / 2, cardW, cardH, 22);
    ctx.clip();

    ctx.filter = buildCssFilter(photo.effects);
    ctx.drawImage(img, -cardW / 2, -cardH / 2, cardW, cardH);

    // Optional RGB split pass
    if (photo.effects.rgbSplit > 0) {
      const shift = photo.effects.rgbSplit * uniformScale * 1.1;
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.28 * (photo.effects.opacity / 100);
      ctx.drawImage(img, -cardW / 2 - shift, -cardH / 2, cardW, cardH);
      ctx.drawImage(img, -cardW / 2 + shift, -cardH / 2, cardW, cardH);
    }

    ctx.restore();

    // Crisp luminous border
    ctx.filter = 'none';
    drawRoundedRectPath(ctx, -cardW / 2, -cardH / 2, cardW, cardH, 22);
    ctx.strokeStyle =
      photo.effects.neonGlow > 12
        ? photo.effects.neonColor
        : 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.restore();
  });

  // 5. Cinematic letterbox if in cinematic mode
  if (mode === 'cinematic') {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, 86);
    ctx.fillRect(0, height - 86, width, 86);
  }

  // 6. Subtle futuristic signature stamp
  ctx.save();
  ctx.font = '600 18px "Space Grotesk", sans-serif';
  ctx.fillStyle = 'rgba(226, 232, 240, 0.55)';
  ctx.fillText(`AETHER // OS  •  MODE: ${mode.toUpperCase()}`, 44, height - 38);
  ctx.restore();

  // Trigger download
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  link.download = `aether-os-${stamp}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
