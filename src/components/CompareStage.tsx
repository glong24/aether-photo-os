import React, { useRef, useState } from 'react';
import { Columns2, MoveHorizontal, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { CompareSubMode, PhotoItem, buildCssFilter } from '../types';

interface CompareStageProps {
  photos: PhotoItem[];
  selectedId: PhotoItem['id'];
  onSelect: (id: PhotoItem['id']) => void;
}

export const CompareStage: React.FC<CompareStageProps> = ({
  photos,
  selectedId,
  onSelect,
}) => {
  const [subMode, setSubMode] = useState<CompareSubMode>('side-by-side');
  const [splitPercent, setSplitPercent] = useState(50);
  const [syncZoom, setSyncZoom] = useState(1);
  const [syncPan, setSyncPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const splitContainerRef = useRef<HTMLDivElement | null>(null);
  const isSliding = useRef(false);

  const photoA = photos[0];
  const photoB = photos[1];

  const updateSplitFromClientX = (clientX: number) => {
    const el = splitContainerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSplitPercent(Math.max(4, Math.min(96, pct)));
  };

  return (
    <div className="relative z-10 flex h-full w-full flex-col items-center justify-center px-4 pt-20 pb-24 sm:px-8">
      {/* Sub-mode Switcher Pill */}
      <div className="aether-glass mb-5 flex flex-wrap items-center justify-center gap-2 rounded-full px-3 py-1.5">
        <button
          type="button"
          onClick={() => setSubMode('side-by-side')}
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-wider transition ${
            subMode === 'side-by-side'
              ? 'bg-cyan-400/20 text-cyan-200 border border-cyan-400/50'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <Columns2 className="h-3.5 w-3.5" />
          Side-by-Side
        </button>
        <button
          type="button"
          onClick={() => setSubMode('split-curtain')}
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-wider transition ${
            subMode === 'split-curtain'
              ? 'bg-purple-500/25 text-purple-200 border border-purple-400/50'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <MoveHorizontal className="h-3.5 w-3.5" />
          Split Curtain
        </button>

        {subMode === 'side-by-side' && (
          <>
            <div className="mx-1 h-4 w-px bg-white/15" />
            <button
              type="button"
              onClick={() => setSyncZoom((z) => Math.max(0.8, Number((z - 0.2).toFixed(2))))}
              className="rounded-full p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
              title="Zoom Out Both"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="font-mono text-[11px] text-cyan-300 w-10 text-center">
              {Math.round(syncZoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setSyncZoom((z) => Math.min(2.6, Number((z + 0.2).toFixed(2))))}
              className="rounded-full p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
              title="Zoom In Both"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setSyncZoom(1);
                setSyncPan({ x: 0, y: 0 });
              }}
              className="rounded-full p-1.5 text-slate-300 hover:bg-white/10 hover:text-cyan-200"
              title="Reset Compare View"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Mode A: Side-by-Side Synced Inspection */}
      {subMode === 'side-by-side' ? (
        <div
          className="grid w-full max-w-4xl grid-cols-2 gap-3 sm:gap-6 items-center justify-items-center"
          onPointerDown={(e) => {
            isPanning.current = true;
            panStart.current = {
              x: e.clientX,
              y: e.clientY,
              ox: syncPan.x,
              oy: syncPan.y,
            };
          }}
          onPointerMove={(e) => {
            if (!isPanning.current || syncZoom <= 1) return;
            setSyncPan({
              x: panStart.current.ox + (e.clientX - panStart.current.x),
              y: panStart.current.oy + (e.clientY - panStart.current.y),
            });
          }}
          onPointerUp={() => {
            isPanning.current = false;
          }}
          onPointerLeave={() => {
            isPanning.current = false;
          }}
        >
          {[photoA, photoB].map((p) => (
            <div
              key={p.id}
              onClick={() => onSelect(p.id)}
              style={{
                boxShadow:
                  selectedId === p.id
                    ? `0 0 36px ${p.effects.neonColor}66, 0 0 0 1.5px ${p.effects.neonColor}`
                    : '0 24px 60px rgba(0,0,0,0.65)',
              }}
              className={`relative aspect-[9/16] max-h-[64vh] w-full max-w-[330px] overflow-hidden rounded-3xl border bg-slate-950/80 transition cursor-grab active:cursor-grabbing ${
                selectedId === p.id ? 'border-cyan-300/80' : 'border-white/15'
              }`}
            >
              <img
                src={p.src}
                alt={p.name}
                draggable={false}
                className="h-full w-full object-cover select-none pointer-events-none transition-transform duration-75"
                style={{
                  filter: buildCssFilter(p.effects),
                  opacity: p.effects.opacity / 100,
                  transform: `translate(${syncPan.x}px, ${syncPan.y}px) scale(${syncZoom}) scaleX(${p.flipX ? -1 : 1}) scaleY(${p.flipY ? -1 : 1})`,
                }}
              />
              <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center justify-between rounded-xl bg-black/60 px-3 py-1.5 backdrop-blur-md border border-white/10">
                <span className="font-mono text-[10px] tracking-wider text-white">
                  {p.name}
                </span>
                <span className="font-mono text-[9px] text-cyan-300">
                  {selectedId === p.id ? 'ACTIVE' : 'SELECT'}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Mode B: Interactive Laser Split-Curtain Comparison */
        <div
          ref={splitContainerRef}
          onPointerDown={(e) => {
            isSliding.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            updateSplitFromClientX(e.clientX);
          }}
          onPointerMove={(e) => {
            if (!isSliding.current) return;
            updateSplitFromClientX(e.clientX);
          }}
          onPointerUp={(e) => {
            isSliding.current = false;
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
              e.currentTarget.releasePointerCapture(e.pointerId);
            }
          }}
          style={{ touchAction: 'none' }}
          className="relative aspect-[9/16] max-h-[66vh] w-[min(86vw,380px)] overflow-hidden rounded-3xl border border-cyan-400/40 bg-slate-950 shadow-[0_0_55px_rgba(56,189,248,0.22)] cursor-ew-resize select-none"
        >
          {/* Base Photo 2 (Right Side) */}
          <img
            src={photoB.src}
            alt={photoB.name}
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover pointer-events-none"
            style={{
              filter: buildCssFilter(photoB.effects),
              transform: `scaleX(${photoB.flipX ? -1 : 1}) scaleY(${photoB.flipY ? -1 : 1})`,
            }}
          />

          {/* Clipped Photo 1 (Left Side) */}
          <div
            className="absolute inset-0 overflow-hidden pointer-events-none"
            style={{ clipPath: `inset(0 ${100 - splitPercent}% 0 0)` }}
          >
            <img
              src={photoA.src}
              alt={photoA.name}
              draggable={false}
              className="h-full w-full object-cover"
              style={{
                filter: buildCssFilter(photoA.effects),
                transform: `scaleX(${photoA.flipX ? -1 : 1}) scaleY(${photoA.flipY ? -1 : 1})`,
              }}
            />
          </div>

          {/* Glowing Neon Laser Divider */}
          <div
            className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-300 via-white to-purple-400 shadow-[0_0_18px_rgba(56,189,248,1)]"
            style={{ left: `${splitPercent}%` }}
          >
            <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-cyan-300/80 bg-slate-950/85 backdrop-blur-md shadow-[0_0_24px_rgba(34,211,238,0.85)]">
              <MoveHorizontal className="h-4 w-4 text-cyan-200" />
            </div>
          </div>

          {/* Corner Labels */}
          <div className="pointer-events-none absolute top-3 left-3 rounded-lg bg-black/60 px-2.5 py-1 font-mono text-[10px] text-cyan-200 backdrop-blur-md border border-cyan-400/30">
            01 MIRROR • {Math.round(splitPercent)}%
          </div>
          <div className="pointer-events-none absolute top-3 right-3 rounded-lg bg-black/60 px-2.5 py-1 font-mono text-[10px] text-purple-200 backdrop-blur-md border border-purple-400/30">
            02 COURT • {Math.round(100 - splitPercent)}%
          </div>
        </div>
      )}
    </div>
  );
};
