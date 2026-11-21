import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowDown,
  ArrowUp,
  FlipHorizontal2,
  FlipVertical2,
  Lock,
  RotateCcw,
  RotateCw,
} from 'lucide-react';
import {
  AppSettings,
  InteractionMode,
  PhotoItem,
  SnapGuides,
  buildCssFilter,
} from '../types';
import { playSound } from '../utils/audio';

interface SpatialPhotoCardProps {
  photo: PhotoItem;
  otherPhoto: PhotoItem;
  isSelected: boolean;
  mode: InteractionMode;
  settings: AppSettings;
  parallaxOffset: { x: number; y: number };
  baseWidth: number;
  uiHidden: boolean;
  onSelect: (id: PhotoItem['id']) => void;
  onUpdate: (
    id: PhotoItem['id'],
    updater: (prev: PhotoItem) => PhotoItem
  ) => void;
  onBringFront: (id: PhotoItem['id']) => void;
  onSendBack: (id: PhotoItem['id']) => void;
  onResetOne: (id: PhotoItem['id']) => void;
  onSnapGuidesChange: (guides: SnapGuides) => void;
}

export const SpatialPhotoCard: React.FC<SpatialPhotoCardProps> = ({
  photo,
  otherPhoto,
  isSelected,
  mode,
  settings,
  parallaxOffset,
  baseWidth,
  uiHidden,
  onSelect,
  onUpdate,
  onBringFront,
  onSendBack,
  onResetOne,
  onSnapGuidesChange,
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const photoRef = useRef(photo);
  const otherRef = useRef(otherPhoto);
  const settingsRef = useRef(settings);

  photoRef.current = photo;
  otherRef.current = otherPhoto;
  settingsRef.current = settings;

  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, glareX: 50, glareY: 50 });

  const activePointers = useRef>(new Map());
  const dragOrigin = useRef({
    pointerX: 0,
    pointerY: 0,
    photoX: 0,
    photoY: 0,
    lastX: 0,
    lastY: 0,
    lastTime: 0,
    vx: 0,
    vy: 0,
  });
  const pinchOrigin = useRef<{
    distance: number;
    angle: number;
    scale: number;
    rotation: number;
  } | null>(null);
  const inertiaRaf = useRef<number | null>(null);
  const lastSnapState = useRef<{ v: number | null; h: number | null }>({
    v: null,
    h: null,
  });
  const lastTapTime = useRef<number>(0);

  const stopInertia = () => {
    if (inertiaRaf.current !== null) {
      cancelAnimationFrame(inertiaRaf.current);
      inertiaRaf.current = null;
    }
  };

  useEffect(() => {
    return () => stopInertia();
  }, []);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const cur = photoRef.current;
      if (cur.locked) return;

      onSelect(cur.id);
      const delta = -e.deltaY * 0.0012;
      onUpdate(cur.id, (prev) => ({
        ...prev,
        scale: Math.max(0.35, Math.min(2.8, Number((prev.scale + delta).toFixed(3)))),
      }));
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [onSelect, onUpdate]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-no-drag="true"]')) {
      return;
    }
    e.stopPropagation();
    stopInertia();

    onSelect(photo.id);
    if (mode !== 'overlap') {
      onBringFront(photo.id);
    }

    const now = performance.now();
    if (e.pointerType === 'touch' && now - lastTapTime.current < 300) {
      lastTapTime.current = 0;
      onResetOne(photo.id);
      return;
    }
    lastTapTime.current = now;

    if (photo.locked) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.current.size === 1) {
      isDraggingRef.current = true;
      setIsDragging(true);
      setTilt({ rx: 0, ry: 0, glareX: 50, glareY: 50 });
      dragOrigin.current = {
        pointerX: e.clientX,
        pointerY: e.clientY,
        photoX: photo.x,
        photoY: photo.y,
        lastX: e.clientX,
        lastY: e.clientY,
        lastTime: now,
        vx: 0,
        vy: 0,
      };
      pinchOrigin.current = null;
    } else if (activePointers.current.size === 2) {
      const pts = Array.from(activePointers.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const angle = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
      pinchOrigin.current = {
        distance: Math.max(10, dist),
        angle,
        scale: photo.scale,
        rotation: photo.rotation,
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current && settingsRef.current.tilt3D && cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width;
      const relY = (e.clientY - rect.top) / rect.height;
      const maxTilt = mode === 'space3d' ? 16 : 11;
      setTilt({
        rx: (0.5 - relY) * maxTilt * 2,
        ry: (relX - 0.5) * maxTilt * 2,
        glareX: relX * 100,
        glareY: relY * 100,
      });
    }

    if (!activePointers.current.has(e.pointerId) || photoRef.current.locked) {
      return;
    }

    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.current.size === 2 && pinchOrigin.current) {
      const pts = Array.from(activePointers.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const angle = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);

      const scaleRatio = dist / pinchOrigin.current.distance;
      const angleDeltaDeg = ((angle - pinchOrigin.current.angle) * 180) / Math.PI;

      const nextScale = Math.max(
        0.35,
        Math.min(2.8, pinchOrigin.current.scale * scaleRatio)
      );
      const nextRot = ((pinchOrigin.current.rotation + angleDeltaDeg + 180) % 360) - 180;

      onUpdate(photoRef.current.id, (prev) => ({
        ...prev,
        scale: Number(nextScale.toFixed(3)),
        rotation: Math.round(nextRot),
      }));
      return;
    }

    if (activePointers.current.size === 1) {
      const now = performance.now();
      const dt = Math.max(8, now - dragOrigin.current.lastTime);
      const instVx = ((e.clientX - dragOrigin.current.lastX) / dt) * 16;
      const instVy = ((e.clientY - dragOrigin.current.lastY) / dt) * 16;

      dragOrigin.current.vx = dragOrigin.current.vx * 0.6 + instVx * 0.4;
      dragOrigin.current.vy = dragOrigin.current.vy * 0.6 + instVy * 0.4;
      dragOrigin.current.lastX = e.clientX;
      dragOrigin.current.lastY = e.clientY;
      dragOrigin.current.lastTime = now;

      let nextX = dragOrigin.current.photoX + (e.clientX - dragOrigin.current.pointerX);
      let nextY = dragOrigin.current.photoY + (e.clientY - dragOrigin.current.pointerY);

      let guideV: number | null = null;
      let guideH: number | null = null;

      if (settingsRef.current.magneticSnap) {
        const threshold = 14;
        const other = otherRef.current;

        if (Math.abs(nextX) < threshold) {
          nextX = 0;
          guideV = 0;
        } else if (other.visible && Math.abs(nextX - other.x) < threshold) {
          nextX = other.x;
          guideV = other.x;
        }

        if (Math.abs(nextY) < threshold) {
          nextY = 0;
          guideH = 0;
        } else if (other.visible && Math.abs(nextY - other.y) < threshold) {
          nextY = other.y;
          guideH = other.y;
        }

        if (
          (guideV !== null && lastSnapState.current.v !== guideV) ||
          (guideH !== null && lastSnapState.current.h !== guideH)
        ) {
          playSound('snap', settingsRef.current.audioEnabled);
        }
        lastSnapState.current = { v: guideV, h: guideH };
      }

      onSnapGuidesChange({ vertical: guideV, horizontal: guideH });

      const boundX = Math.max(320, window.innerWidth * 0.46);
      const boundY = Math.max(240, window.innerHeight * 0.44);
      nextX = Math.max(-boundX, Math.min(boundX, nextX));
      nextY = Math.max(-boundY, Math.min(boundY, nextY));

      onUpdate(photoRef.current.id, (prev) => ({
        ...prev,
        x: Math.round(nextX),
        y: Math.round(nextY),
      }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    activePointers.current.delete(e.pointerId);

    if (activePointers.current.size === 0) {
      isDraggingRef.current = false;
      setIsDragging(false);
      onSnapGuidesChange({ vertical: null, horizontal: null });
      lastSnapState.current = { v: null, h: null };

      if (settingsRef.current.inertiaEnabled && !pinchOrigin.current) {
        let vx = dragOrigin.current.vx;
        let vy = dragOrigin.current.vy;
        const speed = Math.hypot(vx, vy);

        if (speed > 1.2) {
          const id = photoRef.current.id;
          const boundX = Math.max(320, window.innerWidth * 0.46);
          const boundY = Math.max(240, window.innerHeight * 0.44);

          const glide = () => {
            vx *= 0.91;
            vy *= 0.91;
            if (Math.hypot(vx, vy) < 0.28) {
              inertiaRaf.current = null;
              return;
            }
            onUpdate(id, (prev) => ({
              ...prev,
              x: Math.round(Math.max(-boundX, Math.min(boundX, prev.x + vx))),
              y: Math.round(Math.max(-boundY, Math.min(boundY, prev.y + vy))),
            }));
            inertiaRaf.current = requestAnimationFrame(glide);
          };

          inertiaRaf.current = requestAnimationFrame(glide);
        }
      }
      pinchOrigin.current = null;
    }
  };

  const handleRotateDialDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (photo.locked || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    const initialRotation = photo.rotation;

    const onMove = (moveEvent: PointerEvent) => {
      const currentAngle = Math.atan2(
        moveEvent.clientY - centerY,
        moveEvent.clientX - centerX
      );
      const deltaDeg = ((currentAngle - startAngle) * 180) / Math.PI;
      let nextRot = Math.round(initialRotation + deltaDeg);
      if (nextRot > 180) nextRot -= 360;
      if (nextRot < -180) nextRot += 360;
      onUpdate(photo.id, (prev) => ({ ...prev, rotation: nextRot }));
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  if (!photo.visible) return null;

  const cardHeight = Math.round(baseWidth / photo.aspectRatio);
  const depthFactor = 0.65 + (photo.z + 300) / 600;
  const pxOffset = settings.parallax && !isDragging ? parallaxOffset.x * depthFactor : 0;
  const pyOffset = settings.parallax && !isDragging ? parallaxOffset.y * depthFactor : 0;

  const filterString = buildCssFilter(photo.effects);
  const shadowAlpha = (photo.effects.shadowIntensity / 100) * 0.78;
  const glowSpread = photo.effects.neonGlow * 0.62;
  const hoverBoost = isHovered || isSelected ? 14 : 0;

  const boxShadow = [
    `0 ${18 + photo.effects.shadowIntensity * 0.25}px ${38 + photo.effects.shadowIntensity * 0.4}px rgba(0, 0, 0, ${shadowAlpha})`,
    photo.effects.neonGlow > 0 || isHovered || isSelected
      ? `0 0 ${glowSpread + hoverBoost}px ${photo.effects.neonColor}88`
      : '',
    isSelected ? `0 0 0 1.5px ${photo.effects.neonColor}` : '',
  ]
    .filter(Boolean)
    .join(', ');

  const transformString = [
    `translate3d(calc(-50% + ${photo.x + pxOffset}px), calc(-50% + ${photo.y + pyOffset}px), ${mode === 'space3d' ? photo.z : 0}px)`,
    `scale(${photo.scale})`,
    `rotateZ(${photo.rotation}deg)`,
    settings.tilt3D && !isDragging
      ? `rotateX(${tilt.rx.toFixed(2)}deg) rotateY(${tilt.ry.toFixed(2)}deg)`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  const innerFlipTransform = `scaleX(${photo.flipX ? -1 : 1}) scaleY(${photo.flipY ? -1 : 1})`;

  return (
    <div
      ref={cardRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (!photo.locked) onResetOne(photo.id);
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setTilt({ rx: 0, ry: 0, glareX: 50, glareY: 50 });
      }}
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: `${baseWidth}px`,
        height: `${cardHeight}px`,
        zIndex: photo.zIndex,
        transform: transformString,
        transformStyle: 'preserve-3d',
        touchAction: 'none',
        mixBlendMode: photo.effects.blendMode,
        opacity: photo.effects.opacity / 100,
        willChange: 'transform',
        transition: isDragging
          ? 'none'
          : 'transform 0.16s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease',
      }}
      className={`group rounded-[22px] ${
        photo.locked
          ? 'cursor-not-allowed'
          : isDragging
          ? 'cursor-grabbing'
          : 'cursor-grab'
      }`}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="relative h-full w-full"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div
          className={`relative h-full w-full rounded-[22px] overflow-hidden border transition-colors duration-200 ${
            isSelected
              ? 'border-cyan-300/80'
              : isHovered
              ? 'border-cyan-400/55'
              : 'border-white/15'
          } ${mode === 'cinematic' && !isDragging ? 'animate-float-slow' : ''}`}
          style={{ boxShadow }}
        >
          <img
            src={photo.src}
            alt={photo.name}
            draggable={false}
            className="h-full w-full object-cover pointer-events-none select-none"
            style={{
              filter: filterString,
              transform: innerFlipTransform,
            }}
          />

          {photo.effects.rgbSplit > 0 && (
            <>
              <img
                src={photo.src}
                alt=""
                aria-hidden="true"
                draggable={false}
                className="pointer-events-none absolute inset-0 h-full w-full object-cover mix-blend-screen opacity-50"
                style={{
                  filter: `${filterString} sepia(100%) saturate(420%) hue-rotate(310deg)`,
                  transform: `${innerFlipTransform} translateX(${-photo.effects.rgbSplit}px)`,
                }}
              />
              <img
                src={photo.src}
                alt=""
                aria-hidden="true"
                draggable={false}
                className="pointer-events-none absolute inset-0 h-full w-full object-cover mix-blend-screen opacity-50"
                style={{
                  filter: `${filterString} sepia(100%) saturate(420%) hue-rotate(155deg)`,
                  transform: `${innerFlipTransform} translateX(${photo.effects.rgbSplit}px)`,
                }}
              />
            </>
          )}

          {photo.effects.glitch > 0 && (
            <>
              <img
                src={photo.src}
                alt=""
                aria-hidden="true"
                draggable={false}
                className="glitch-layer-a pointer-events-none absolute inset-0 h-full w-full object-cover mix-blend-lighten"
                style={{
                  opacity: Math.min(0.85, photo.effects.glitch / 100),
                  filter: `${filterString} hue-rotate(90deg) contrast(140%)`,
                  transform: innerFlipTransform,
                }}
              />
              <img
                src={photo.src}
                alt=""
                aria-hidden="true"
                draggable={false}
                className="glitch-layer-b pointer-events-none absolute inset-0 h-full w-full object-cover mix-blend-screen"
                style={{
                  opacity: Math.min(0.75, photo.effects.glitch / 115),
                  filter: `${filterString} hue-rotate(220deg) saturate(200%)`,
                  transform: innerFlipTransform,
                }}
              />
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  opacity: (photo.effects.glitch / 100) * 0.25,
                  backgroundImage:
                    'repeating-linear-gradient(0deg, rgba(255,255,255,0.16) 0px, rgba(255,255,255,0.16) 1px, transparent 1px, transparent 4px)',
                }}
              />
            </>
          )}

          {settings.tilt3D && isHovered && (
            <div
              className="pointer-events-none absolute inset-0 transition-opacity duration-200"
              style={{
                background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.22) 0%, rgba(56,189,248,0.06) 35%, transparent 70%)`,
              }}
            />
          )}

          {(isHovered || isSelected) && !uiHidden && (
            <div className="pointer-events-none absolute inset-2.5">
              <span className="absolute left-0 top-0 h-3.5 w-3.5 border-l-2 border-t-2 border-cyan-300/80 rounded-tl-sm" />
              <span className="absolute right-0 top-0 h-3.5 w-3.5 border-r-2 border-t-2 border-cyan-300/80 rounded-tr-sm" />
              <span className="absolute left-0 bottom-0 h-3.5 w-3.5 border-l-2 border-b-2 border-purple-400/80 rounded-bl-sm" />
              <span className="absolute right-0 bottom-0 h-3.5 w-3.5 border-r-2 border-b-2 border-purple-400/80 rounded-br-sm" />
            </div>
          )}

          {!uiHidden && (isHovered || isSelected) && (
            <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center justify-between rounded-xl bg-black/55 px-2.5 py-1.5 backdrop-blur-md border border-white/10">
              <div className="flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor: photo.effects.neonColor,
                    boxShadow: `0 0 8px ${photo.effects.neonColor}`,
                  }}
                />
                <span className="font-mono text-[10px] font-medium tracking-wider text-white/90">
                  {photo.name}
                </span>
              </div>
              <span className="font-mono text-[9px] text-slate-300/80">
                {photo.locked ? (
                  <Lock className="inline h-3 w-3 text-amber-300" />
                ) : (
                  `${Math.round(photo.scale * 100)}% • ${photo.rotation}°`
                )}
              </span>
            </div>
          )}
        </div>

        {isSelected && !uiHidden && !photo.locked && (
          <div
            data-no-drag="true"
            className="aether-glass absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full px-2 py-1 shadow-2xl"
          >
            <button
              type="button"
              data-no-drag="true"
              onPointerDown={handleRotateDialDown}
              title="Drag to Rotate"
              className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-mono text-cyan-200 hover:bg-cyan-400/20 cursor-ew-resize transition"
            >
              <RotateCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">ROT</span>
            </button>
            <div className="h-3.5 w-px bg-white/15" />
            <button
              type="button"
              data-no-drag="true"
              onClick={(e) => {
                e.stopPropagation();
                playSound('click', settings.audioEnabled);
                onUpdate(photo.id, (p) => ({ ...p, flipX: !p.flipX }));
              }}
              title="Flip Horizontal"
              className="rounded-full p-1.5 text-slate-200 hover:bg-white/15 hover:text-cyan-200 transition"
            >
              <FlipHorizontal2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              data-no-drag="true"
              onClick={(e) => {
                e.stopPropagation();
                playSound('click', settings.audioEnabled);
                onUpdate(photo.id, (p) => ({ ...p, flipY: !p.flipY }));
              }}
              title="Flip Vertical"
              className="rounded-full p-1.5 text-slate-200 hover:bg-white/15 hover:text-cyan-200 transition"
            >
              <FlipVertical2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              data-no-drag="true"
              onClick={(e) => {
                e.stopPropagation();
                playSound('click', settings.audioEnabled);
                onBringFront(photo.id);
              }}
              title="Bring to Front"
              className="rounded-full p-1.5 text-slate-200 hover:bg-white/15 hover:text-cyan-200 transition"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              data-no-drag="true"
              onClick={(e) => {
                e.stopPropagation();
                playSound('click', settings.audioEnabled);
                onSendBack(photo.id);
              }}
              title="Send Backward"
              className="rounded-full p-1.5 text-slate-200 hover:bg-white/15 hover:text-cyan-200 transition"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              data-no-drag="true"
              onClick={(e) => {
                e.stopPropagation();
                onResetOne(photo.id);
              }}
              title="Reset Position (or Double-Click)"
              className="rounded-full p-1.5 text-slate-200 hover:bg-rose-500/25 hover:text-rose-200 transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
