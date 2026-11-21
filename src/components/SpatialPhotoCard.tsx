import React, { useEffect, useRef, useState } from 'react';
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
  otherPhotos: PhotoItem[];
  isSelected: boolean;
  mode: InteractionMode;
  settings: AppSettings;
  parallaxOffset: { x: number; y: number };
  baseWidth: number;
  uiHidden: boolean;
  onSelect: (id: string) => void;
  onUpdate: (
    id: string,
    updater: (prev: PhotoItem) => PhotoItem
  ) => void;
  onBringFront: (id: string) => void;
  onSendBack: (id: string) => void;
  onResetOne: (id: string) => void;
  onSnapGuidesChange: (guides: SnapGuides) => void;
  onDragStateChange?: (dragging: boolean) => void;
}

export const SpatialPhotoCard: React.FC<SpatialPhotoCardProps> = ({
  photo,
  otherPhotos,
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
  onDragStateChange,
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const photoRef = useRef(photo);
  const othersRef = useRef(otherPhotos);
  const settingsRef = useRef(settings);

  photoRef.current = photo;
  othersRef.current = otherPhotos;
  settingsRef.current = settings;

  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, glareX: 50, glareY: 50 });

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

  const applyDragMove = (
    clientX: number,
    clientY: number,
    origin: {
      startX: number;
      startY: number;
      photoX: number;
      photoY: number;
      lastX: number;
      lastY: number;
      lastTime: number;
      vx: number;
      vy: number;
    }
  ) => {
    const now = performance.now();
    const dt = Math.max(8, now - origin.lastTime);
    const instVx = ((clientX - origin.lastX) / dt) * 16;
    const instVy = ((clientY - origin.lastY) / dt) * 16;

    origin.vx = origin.vx * 0.55 + instVx * 0.45;
    origin.vy = origin.vy * 0.55 + instVy * 0.45;
    origin.lastX = clientX;
    origin.lastY = clientY;
    origin.lastTime = now;

    const dx = clientX - origin.startX;
    const dy = clientY - origin.startY;

    let nextX = origin.photoX + dx;
    let nextY = origin.photoY + dy;

    let guideV: number | null = null;
    let guideH: number | null = null;

    if (settingsRef.current.magneticSnap && Math.hypot(dx, dy) > 10) {
      const threshold = 9;
      if (Math.abs(nextX) < threshold) {
        nextX = 0;
        guideV = 0;
      } else {
        for (const other of othersRef.current) {
          if (other.visible && Math.abs(nextX - other.x) < threshold) {
            nextX = other.x;
            guideV = other.x;
            break;
          }
        }
      }

      if (Math.abs(nextY) < threshold) {
        nextY = 0;
        guideH = 0;
      } else {
        for (const other of othersRef.current) {
          if (other.visible && Math.abs(nextY - other.y) < threshold) {
            nextY = other.y;
            guideH = other.y;
            break;
          }
        }
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

    const boundX = Math.max(360, window.innerWidth * 0.48);
    const boundY = Math.max(260, window.innerHeight * 0.46);
    nextX = Math.max(-boundX, Math.min(boundX, nextX));
    nextY = Math.max(-boundY, Math.min(boundY, nextY));

    onUpdate(photoRef.current.id, (prev) => ({
      ...prev,
      x: Math.round(nextX),
      y: Math.round(nextY),
    }));
  };

  const finishDragWithInertia = (vxInit: number, vyInit: number) => {
    isDraggingRef.current = false;
    setIsDragging(false);
    onDragStateChange?.(false);
    onSnapGuidesChange({ vertical: null, horizontal: null });
    lastSnapState.current = { v: null, h: null };

    if (!settingsRef.current.inertiaEnabled) return;

    let vx = vxInit;
    let vy = vyInit;
    if (Math.hypot(vx, vy) <= 1.5) return;

    const id = photoRef.current.id;
    const boundX = Math.max(360, window.innerWidth * 0.48);
    const boundY = Math.max(260, window.innerHeight * 0.46);

    const glide = () => {
      vx *= 0.9;
      vy *= 0.9;
      if (Math.hypot(vx, vy) < 0.3) {
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
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('[data-no-drag="true"]')) return;

    e.preventDefault();
    e.stopPropagation();
    stopInertia();

    onSelect(photoRef.current.id);
    if (mode !== 'overlap') {
      onBringFront(photoRef.current.id);
    }

    if (photoRef.current.locked) return;

    isDraggingRef.current = true;
    setIsDragging(true);
    onDragStateChange?.(true);
    setTilt({ rx: 0, ry: 0, glareX: 50, glareY: 50 });

    const origin = {
      startX: e.clientX,
      startY: e.clientY,
      photoX: photoRef.current.x,
      photoY: photoRef.current.y,
      lastX: e.clientX,
      lastY: e.clientY,
      lastTime: performance.now(),
      vx: 0,
      vy: 0,
    };

    const onMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      applyDragMove(moveEvent.clientX, moveEvent.clientY, origin);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('blur', onMouseUp);
      finishDragWithInertia(origin.vx, origin.vy);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('blur', onMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-no-drag="true"]')) return;

    e.stopPropagation();
    stopInertia();

    onSelect(photoRef.current.id);
    if (mode !== 'overlap') {
      onBringFront(photoRef.current.id);
    }

    const now = performance.now();
    if (e.touches.length === 1 && now - lastTapTime.current < 300) {
      lastTapTime.current = 0;
      if (!photoRef.current.locked) onResetOne(photoRef.current.id);
      return;
    }
    lastTapTime.current = now;

    if (photoRef.current.locked) return;

    isDraggingRef.current = true;
    setIsDragging(true);
    onDragStateChange?.(true);
    setTilt({ rx: 0, ry: 0, glareX: 50, glareY: 50 });

    const t0 = e.touches[0];
    const origin = {
      startX: t0.clientX,
      startY: t0.clientY,
      photoX: photoRef.current.x,
      photoY: photoRef.current.y,
      lastX: t0.clientX,
      lastY: t0.clientY,
      lastTime: now,
      vx: 0,
      vy: 0,
    };

    let pinch: {
      distance: number;
      angle: number;
      scale: number;
      rotation: number;
    } | null = null;

    if (e.touches.length === 2) {
      const t1 = e.touches[1];
      pinch = {
        distance: Math.max(10, Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)),
        angle: Math.atan2(t1.clientY - t0.clientY, t1.clientX - t0.clientX),
        scale: photoRef.current.scale,
        rotation: photoRef.current.rotation,
      };
    }

    const onTouchMove = (moveEvent: TouchEvent) => {
      moveEvent.preventDefault();
      if (moveEvent.touches.length === 2) {
        const a = moveEvent.touches[0];
        const b = moveEvent.touches[1];
        const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
        const angle = Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX);
        if (!pinch) {
          pinch = {
            distance: Math.max(10, dist),
            angle,
            scale: photoRef.current.scale,
            rotation: photoRef.current.rotation,
          };
          return;
        }
        const nextScale = Math.max(
          0.35,
          Math.min(2.8, pinch.scale * (dist / pinch.distance))
        );
        const deltaDeg = ((angle - pinch.angle) * 180) / Math.PI;
        const nextRot = ((pinch.rotation + deltaDeg + 180) % 360) - 180;
        onUpdate(photoRef.current.id, (prev) => ({
          ...prev,
          scale: Number(nextScale.toFixed(3)),
          rotation: Math.round(nextRot),
        }));
      } else if (moveEvent.touches.length === 1 && !pinch) {
        const touch = moveEvent.touches[0];
        applyDragMove(touch.clientX, touch.clientY, origin);
      }
    };

    const onTouchEnd = (endEvent: TouchEvent) => {
      if (endEvent.touches.length === 0) {
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
        window.removeEventListener('touchcancel', onTouchEnd);
        finishDragWithInertia(pinch ? 0 : origin.vx, pinch ? 0 : origin.vy);
      }
    };

    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);
  };

  const handleHoverMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingRef.current || !settingsRef.current.tilt3D || !cardRef.current) {
      return;
    }
    const rect = cardRef.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;
    const maxTilt = mode === 'space3d' ? 14 : 9;
    setTilt({
      rx: (0.5 - relY) * maxTilt * 2,
      ry: (relX - 0.5) * maxTilt * 2,
      glareX: relX * 100,
      glareY: relY * 100,
    });
  };

  const handleRotateDialMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (photo.locked || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    const initialRotation = photo.rotation;

    const onMove = (moveEvent: MouseEvent) => {
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
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  if (!photo.visible) return null;

  const cardWidth =
    photo.aspectRatio > 1.05 ? Math.round(baseWidth * 1.32) : baseWidth;
  const cardHeight = Math.round(cardWidth / photo.aspectRatio);

  const depthFactor = 0.65 + (photo.z + 300) / 600;
  const pxOffset = settings.parallax && !isDragging ? parallaxOffset.x * depthFactor : 0;
  const pyOffset = settings.parallax && !isDragging ? parallaxOffset.y * depthFactor : 0;

  const filterString = buildCssFilter(photo.effects);
  const shadowAlpha = (photo.effects.shadowIntensity / 100) * 0.78;
  const glowSpread = photo.effects.neonGlow * 0.62;
  const hoverBoost = isDragging ? 22 : isHovered || isSelected ? 14 : 0;

  const boxShadow = [
    `0 ${18 + photo.effects.shadowIntensity * 0.25}px ${38 + photo.effects.shadowIntensity * 0.4}px rgba(0, 0, 0, ${shadowAlpha})`,
    photo.effects.neonGlow > 0 || isHovered || isSelected || isDragging
      ? `0 0 ${glowSpread + hoverBoost}px ${photo.effects.neonColor}99`
      : '',
    isSelected || isDragging ? `0 0 0 1.5px ${photo.effects.neonColor}` : '',
  ]
    .filter(Boolean)
    .join(', ');

  const xPos = Number((photo.x + pxOffset).toFixed(1));
  const yPos = Number((photo.y + pyOffset).toFixed(1));
  const zPos = mode === 'space3d' ? photo.z : 0;
  const activeScale = isDragging ? Number((photo.scale * 1.02).toFixed(3)) : photo.scale;

  const outerTransform = `translate3d(${xPos}px, ${yPos}px, ${zPos}px) translate(-50%, -50%) scale(${activeScale}) rotate(${photo.rotation}deg)`;

  const innerTiltTransform =
    settings.tilt3D && !isDragging && (tilt.rx !== 0 || tilt.ry !== 0)
      ? `perspective(950px) rotateX(${tilt.rx.toFixed(2)}deg) rotateY(${tilt.ry.toFixed(2)}deg)`
      : 'none';

  const innerFlipTransform = `scaleX(${photo.flipX ? -1 : 1}) scaleY(${photo.flipY ? -1 : 1})`;

  return (
    <div
      ref={cardRef}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      onMouseDown={handleMouseDown}
      onMouseMove={handleHoverMove}
      onTouchStart={handleTouchStart}
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
        width: `${cardWidth}px`,
        height: `${cardHeight}px`,
        zIndex: isDragging ? photo.zIndex + 50 : photo.zIndex,
        transform: outerTransform,
        touchAction: 'none',
        mixBlendMode: photo.effects.blendMode,
        opacity: photo.effects.opacity / 100,
        willChange: 'transform',
        transition: isDragging
          ? 'none'
          : 'transform 0.14s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease',
      }}
      className={`group rounded-[22px] select-none ${
        photo.locked
          ? 'cursor-not-allowed'
          : isDragging
          ? 'cursor-grabbing'
          : 'cursor-grab'
      }`}
    >
      <div
        className="relative h-full w-full"
        style={{
          transform: innerTiltTransform,
          transition: isDragging ? 'none' : 'transform 0.16s ease-out',
        }}
      >
        <div
          className={`relative h-full w-full rounded-[22px] overflow-hidden border transition-colors duration-200 ${
            isSelected || isDragging
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

          {settings.tilt3D && isHovered && !isDragging && (
            <div
              className="pointer-events-none absolute inset-0 transition-opacity duration-200"
              style={{
                background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.22) 0%, rgba(56,189,248,0.06) 35%, transparent 70%)`,
              }}
            />
          )}

          {(isHovered || isSelected || isDragging) && !uiHidden && (
            <div className="pointer-events-none absolute inset-2.5">
              <span className="absolute left-0 top-0 h-3.5 w-3.5 border-l-2 border-t-2 border-cyan-300/80 rounded-tl-sm" />
              <span className="absolute right-0 top-0 h-3.5 w-3.5 border-r-2 border-t-2 border-cyan-300/80 rounded-tr-sm" />
              <span className="absolute left-0 bottom-0 h-3.5 w-3.5 border-l-2 border-b-2 border-purple-400/80 rounded-bl-sm" />
              <span className="absolute right-0 bottom-0 h-3.5 w-3.5 border-r-2 border-b-2 border-purple-400/80 rounded-br-sm" />
            </div>
          )}

          {!uiHidden && (isHovered || isSelected || isDragging) && (
            <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center justify-between rounded-xl bg-black/55 px-2.5 py-1.5 backdrop-blur-md border border-white/10">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor: photo.effects.neonColor,
                    boxShadow: `0 0 8px ${photo.effects.neonColor}`,
                  }}
                />
                <span className="truncate font-mono text-[10px] font-medium tracking-wider text-white/90">
                  {photo.name}
                </span>
              </div>
              <span className="ml-2 shrink-0 font-mono text-[9px] text-slate-300/80">
                {photo.locked ? (
                  <Lock className="inline h-3 w-3 text-amber-300" />
                ) : isDragging ? (
                  `X:${photo.x} Y:${photo.y}`
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
              onMouseDown={handleRotateDialMouseDown}
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
      </div>
    </div>
  );
};
