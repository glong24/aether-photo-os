import React, { useEffect, useRef } from 'react';
import { EnvironmentLighting, InteractionMode } from '../types';

interface AmbientCanvasProps {
  lighting: EnvironmentLighting;
  mode: InteractionMode;
  pointerRef: React.MutableRefObject<{ x: number; y: number; normX: number; normY: number }>;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  depth: number;
  hueIndex: 0 | 1;
}

const THEME_COLORS: Record<
  EnvironmentLighting['themeAccent'],
  { primary: string; secondary: string; p1: string; p2: string }
> = {
  'cyan-purple': {
    primary: '56, 189, 248',
    secondary: '168, 85, 247',
    p1: '34, 211, 238',
    p2: '192, 132, 252',
  },
  'electric-blue': {
    primary: '59, 130, 246',
    secondary: '14, 165, 233',
    p1: '96, 165, 250',
    p2: '56, 189, 248',
  },
  'crimson-violet': {
    primary: '244, 63, 94',
    secondary: '139, 92, 246',
    p1: '251, 113, 133',
    p2: '167, 139, 250',
  },
  'emerald-cyan': {
    primary: '16, 185, 129',
    secondary: '6, 182, 212',
    p1: '52, 211, 153',
    p2: '34, 211, 238',
  },
};

export const AmbientCanvas: React.FC<AmbientCanvasProps> = ({
  lighting,
  mode,
  pointerRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lightingRef = useRef(lighting);
  const modeRef = useRef(mode);

  lightingRef.current = lighting;
  modeRef.current = mode;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let animId = 0;

    const particles: Particle[] = [];

    const initParticles = (count: number) => {
      particles.length = 0;
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.36,
          vy: (Math.random() - 0.5) * 0.36,
          radius: Math.random() * 2 + 0.65,
          alpha: Math.random() * 0.55 + 0.18,
          depth: Math.random() * 0.8 + 0.3,
          hueIndex: i % 2 === 0 ? 0 : 1,
        });
      }
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initParticles(95);
    };

    resize();
    window.addEventListener('resize', resize);

    let time = 0;

    const render = () => {
      time += 0.008;
      const cfg = lightingRef.current;
      const currentMode = modeRef.current;
      const palette = THEME_COLORS[cfg.themeAccent];
      const pointer = pointerRef.current;

      // 1. Deep dark obsidian radial base
      const baseGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.45,
        40,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.8
      );
      baseGrad.addColorStop(0, '#0d1324');
      baseGrad.addColorStop(0.55, '#060812');
      baseGrad.addColorStop(1, '#020308');
      ctx.fillStyle = baseGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Ambient animated aurora orbs
      const auroraAlpha = (cfg.auroraIntensity / 100) * (currentMode === 'cinematic' ? 0.38 : 0.25);
      if (auroraAlpha > 0.005) {
        const orb1X = width * (0.26 + Math.sin(time * 0.7) * 0.08) + pointer.normX * 32;
        const orb1Y = height * (0.3 + Math.cos(time * 0.55) * 0.07) + pointer.normY * 26;
        const g1 = ctx.createRadialGradient(orb1X, orb1Y, 10, orb1X, orb1Y, Math.max(width, height) * 0.44);
        g1.addColorStop(0, `rgba(${palette.primary}, ${auroraAlpha})`);
        g1.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g1;
        ctx.fillRect(0, 0, width, height);

        const orb2X = width * (0.74 + Math.cos(time * 0.6) * 0.09) - pointer.normX * 32;
        const orb2Y = height * (0.68 + Math.sin(time * 0.5) * 0.08) - pointer.normY * 24;
        const g2 = ctx.createRadialGradient(orb2X, orb2Y, 10, orb2X, orb2Y, Math.max(width, height) * 0.46);
        g2.addColorStop(0, `rgba(${palette.secondary}, ${auroraAlpha})`);
        g2.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g2;
        ctx.fillRect(0, 0, width, height);
      }

      // 3. Cinematic sweeping volumetric light beams
      if (currentMode === 'cinematic') {
        ctx.save();
        const beamX = width * (0.5 + Math.sin(time * 0.55) * 0.32);
        const beamGrad = ctx.createLinearGradient(beamX - 240, 0, beamX + 240, height);
        beamGrad.addColorStop(0, `rgba(${palette.primary}, 0.14)`);
        beamGrad.addColorStop(0.5, `rgba(${palette.secondary}, 0.06)`);
        beamGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(beamX - 120, 0);
        ctx.lineTo(beamX + 120, 0);
        ctx.lineTo(beamX + 420, height);
        ctx.lineTo(beamX - 420, height);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // 4. Subtle background grid
      if (cfg.gridEnabled && currentMode !== 'space3d') {
        ctx.save();
        ctx.strokeStyle = `rgba(${palette.primary}, 0.045)`;
        ctx.lineWidth = 1;
        const gap = 56;
        const offsetX = (pointer.normX * -14) % gap;
        const offsetY = (pointer.normY * -14) % gap;

        ctx.beginPath();
        for (let x = offsetX; x < width; x += gap) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
        }
        for (let y = offsetY; y < height; y += gap) {
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
        }
        ctx.stroke();
        ctx.restore();
      }

      // 5. Mouse-following volumetric spotlight
      if (cfg.mouseSpotlight && pointer.x > 0 && pointer.y > 0) {
        const spot = ctx.createRadialGradient(
          pointer.x,
          pointer.y,
          6,
          pointer.x,
          pointer.y,
          320
        );
        spot.addColorStop(0, `rgba(${palette.primary}, 0.14)`);
        spot.addColorStop(0.45, `rgba(${palette.secondary}, 0.055)`);
        spot.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = spot;
        ctx.fillRect(0, 0, width, height);
      }

      // 6. Floating luminous spatial particles
      if (cfg.particlesEnabled) {
        const activeCount = Math.max(
          10,
          Math.floor((cfg.particleDensity / 100) * particles.length)
        );
        const speedMul = currentMode === 'cinematic' ? 1.45 : 1;

        for (let i = 0; i < activeCount; i++) {
          const p = particles[i];
          p.x += p.vx * p.depth * speedMul;
          p.y += p.vy * p.depth * speedMul;

          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;
          if (p.y < -10) p.y = height + 10;
          if (p.y > height + 10) p.y = -10;

          const px = p.x + pointer.normX * 18 * p.depth;
          const py = p.y + pointer.normY * 18 * p.depth;
          const col = p.hueIndex === 0 ? palette.p1 : palette.p2;

          ctx.beginPath();
          ctx.arc(px, py, p.radius * (currentMode === 'cinematic' ? 1.5 : 1), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${col}, ${p.alpha})`;
          ctx.fill();

          // Subtle tether line near pointer
          const dx = px - pointer.x;
          const dy = py - pointer.y;
          const dist = Math.hypot(dx, dy);
          if (cfg.mouseSpotlight && dist < 135) {
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(pointer.x, pointer.y);
            ctx.strokeStyle = `rgba(${col}, ${(1 - dist / 135) * 0.14})`;
            ctx.lineWidth = 0.75;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [pointerRef]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      aria-hidden="true"
    />
  );
};
