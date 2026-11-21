import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowDown,
  ArrowUp,
  FlipHorizontal2,
  FlipVertical2,
  ImagePlus,
  RefreshCw,
  RotateCcw,
  Shuffle,
  Sliders,
  Sparkles,
  SunMedium,
  Trash2,
  X,
} from 'lucide-react';
import {
  BlendMode,
  ColorGrade,
  DEFAULT_EFFECTS,
  EnvironmentLighting,
  InteractionMode,
  PhotoEffects,
  PhotoItem,
  PlaygroundPreset,
  ThemeAccent,
} from '../types';

interface ControlSidebarProps {
  photos: PhotoItem[];
  selectedPhoto: PhotoItem;
  mode: InteractionMode;
  lighting: EnvironmentLighting;
  playgroundPreset: PlaygroundPreset;
  canDelete: boolean;
  onSelectPhoto: (id: string) => void;
  onUpdatePhoto: (
    id: string,
    updater: (prev: PhotoItem) => PhotoItem
  ) => void;
  onUpdateEffects: (id: string, patch: Partial<PhotoEffects>) => void;
  onUpdateLighting: (patch: Partial<EnvironmentLighting>) => void;
  onUploadClick: () => void;
  onReplaceClick: () => void;
  onDeletePhoto: (id: string) => void;
  onBringFront: (id: string) => void;
  onSendBack: (id: string) => void;
  onResetPhoto: (id: string) => void;
  onResetStageOrbit: () => void;
  onPlaygroundPreset: (preset: PlaygroundPreset) => void;
  onChaosRandomize: () => void;
  onClose: () => void;
}

const NEON_SWATCHES = [
  '#38bdf8',
  '#22d3ee',
  '#a855f7',
  '#ec4899',
  '#10b981',
  '#f59e0b',
];

const COLOR_GRADES: { id: ColorGrade; label: string }[] = [
  { id: 'none', label: 'Original' },
  { id: 'cyberpunk', label: 'Cyber' },
  { id: 'vision-ice', label: 'Vision Ice' },
  { id: 'ultraviolet', label: 'Ultraviolet' },
  { id: 'noir', label: 'Noir' },
  { id: 'solar', label: 'Solar' },
  { id: 'emerald', label: 'Matrix' },
];

const BLEND_MODES: BlendMode[] = [
  'normal',
  'screen',
  'lighten',
  'overlay',
  'hard-light',
  'difference',
  'exclusion',
  'color-dodge',
];

const ACCENTS: { id: ThemeAccent; label: string; colors: string }[] = [
  { id: 'cyan-purple', label: 'Cyan / Purple', colors: 'from-cyan-400 to-purple-500' },
  { id: 'electric-blue', label: 'Electric Blue', colors: 'from-blue-500 to-sky-400' },
  { id: 'crimson-violet', label: 'Crimson / Violet', colors: 'from-rose-500 to-violet-500' },
  { id: 'emerald-cyan', label: 'Emerald / Cyan', colors: 'from-emerald-400 to-cyan-400' },
];

interface SliderRowProps {
  label: string;
  valueDisplay: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
}

const SliderRow: React.FC<SliderRowProps> = ({
  label,
  valueDisplay,
  value,
  min,
  max,
  step = 1,
  onChange,
}) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-slate-300">{label}</span>
      <span className="font-mono text-cyan-300">{valueDisplay}</span>
    </div>
    <input
      type="range"
      className="aether-slider w-full"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  </div>
);

export const ControlSidebar: React.FC<ControlSidebarProps> = ({
  photos,
  selectedPhoto,
  mode,
  lighting,
  playgroundPreset,
  canDelete,
  onSelectPhoto,
  onUpdatePhoto,
  onUpdateEffects,
  onUpdateLighting,
  onUploadClick,
  onReplaceClick,
  onDeletePhoto,
  onBringFront,
  onSendBack,
  onResetPhoto,
  onResetStageOrbit,
  onPlaygroundPreset,
  onChaosRandomize,
  onClose,
}) => {
  const [tab, setTab] = useState<'transform' | 'effects' | 'lighting'>('transform');

  return (
    <motion.aside
      initial={{ x: 360, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 360, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      className="aether-glass fixed bottom-3 right-3 left-3 sm:left-auto sm:top-20 sm:bottom-4 z-40 flex max-h-[54vh] sm:max-h-none sm:w-[320px] flex-col rounded-3xl overflow-hidden"
    >
      {/* Header & Target Photo Switcher */}
      <div className="border-b border-white/10 p-3.5">
        <div className="flex items-center justify-between mb-2.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
            SPATIAL INSPECTOR
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white transition"
            title="Collapse Panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Dynamic Photo List */}
        <div className="grid max-h-24 grid-cols-2 gap-1.5 overflow-y-auto glass-scroll pr-0.5">
          {photos.map((p) => {
            const active = p.id === selectedPhoto.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPhoto(p.id)}
                className={`flex items-center gap-2 rounded-xl px-2 py-1.5 text-left transition border ${
                  active
                    ? 'bg-cyan-500/15 border-cyan-400/50 text-white shadow-[0_0_14px_rgba(56,189,248,0.18)]'
                    : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-slate-200'
                }`}
              >
                <img
                  src={p.src}
                  alt={p.name}
                  className="h-7 w-5 rounded object-cover border border-white/15 shrink-0"
                />
                <div className="min-w-0">
                  <div className="truncate font-mono text-[10px] font-semibold">
                    {p.name.replace('OBJ ', '')}
                  </div>
                  <div className="font-mono text-[9px] text-slate-400">
                    Z:{p.zIndex}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Upload / Replace Quick Buttons */}
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={onUploadClick}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-cyan-400/40 bg-cyan-500/15 py-1.5 font-mono text-[10px] uppercase tracking-wider text-cyan-200 hover:bg-cyan-500/25 transition"
          >
            <ImagePlus className="h-3.5 w-3.5" />
            Add Photo
          </button>
          <button
            type="button"
            onClick={onReplaceClick}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-purple-400/40 bg-purple-500/15 py-1.5 font-mono text-[10px] uppercase tracking-wider text-purple-200 hover:bg-purple-500/25 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Replace
          </button>
        </div>

        {/* Section Tabs */}
        <div className="mt-2.5 grid grid-cols-3 gap-1 rounded-xl bg-black/35 p-1 border border-white/10">
          {[
            { id: 'transform' as const, label: 'Spatial', icon: <Sliders className="h-3 w-3" /> },
            { id: 'effects' as const, label: 'Effects', icon: <Sparkles className="h-3 w-3" /> },
            { id: 'lighting' as const, label: 'Space', icon: <SunMedium className="h-3 w-3" /> },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-medium transition ${
                tab === item.id
                  ? 'bg-white/15 text-cyan-200 shadow-inner'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 glass-scroll">
        {tab === 'transform' && (
          <>
            {mode === 'space3d' && (
              <div className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-200">
                    3D Stage Orbit
                  </span>
                  <button
                    type="button"
                    onClick={onResetStageOrbit}
                    className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-[10px] text-white hover:bg-cyan-400/25 transition"
                  >
                    Reset Camera
                  </button>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Drag the dark background to orbit all floating photos in 3D space.
                </p>
              </div>
            )}

            {mode === 'overlap' && (
              <div className="rounded-2xl border border-purple-400/30 bg-purple-500/10 p-3 space-y-3">
                <span className="font-mono text-[10px] uppercase tracking-wider text-purple-200">
                  Double Exposure Blend
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {BLEND_MODES.map((bm) => (
                    <button
                      key={bm}
                      type="button"
                      onClick={() => onUpdateEffects(selectedPhoto.id, { blendMode: bm })}
                      className={`rounded-lg px-2 py-1 font-mono text-[10px] uppercase transition border ${
                        selectedPhoto.effects.blendMode === bm
                          ? 'border-purple-400 bg-purple-500/30 text-white'
                          : 'border-white/10 bg-black/30 text-slate-300 hover:border-white/25'
                      }`}
                    >
                      {bm}
                    </button>
                  ))}
                </div>
                <SliderRow
                  label="Layer Opacity"
                  valueDisplay={`${selectedPhoto.effects.opacity}%`}
                  value={selectedPhoto.effects.opacity}
                  min={10}
                  max={100}
                  onChange={(v) => onUpdateEffects(selectedPhoto.id, { opacity: v })}
                />
              </div>
            )}

            {mode === 'playground' && (
              <div className="rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 p-3 space-y-2.5">
                <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-200">
                  Playground Physics
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      ['zerog', 'Zero-G Float'],
                      ['orbit', 'Orbital Dance'],
                      ['mirror', 'Mirror Twin'],
                      ['vortex', 'Vortex Spin'],
                    ] as [PlaygroundPreset, string][]
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() =>
                        onPlaygroundPreset(playgroundPreset === id ? 'none' : id)
                      }
                      className={`rounded-xl px-2.5 py-2 text-[11px] font-medium transition border ${
                        playgroundPreset === id
                          ? 'border-cyan-400 bg-cyan-400/25 text-white shadow-[0_0_12px_rgba(34,211,238,0.3)]'
                          : 'border-white/10 bg-black/30 text-slate-300 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={onChaosRandomize}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500/30 to-purple-500/30 border border-cyan-300/40 py-2 text-xs font-medium text-white hover:from-cyan-500/45 hover:to-purple-500/45 transition"
                >
                  <Shuffle className="h-3.5 w-3.5" />
                  Randomize Scene & FX
                </button>
              </div>
            )}

            <div className="space-y-3.5">
              <SliderRow
                label="Scale"
                valueDisplay={`${Math.round(selectedPhoto.scale * 100)}%`}
                value={selectedPhoto.scale}
                min={0.35}
                max={2.6}
                step={0.02}
                onChange={(v) =>
                  onUpdatePhoto(selectedPhoto.id, (p) => ({ ...p, scale: v }))
                }
              />
              <SliderRow
                label="Rotation"
                valueDisplay={`${selectedPhoto.rotation}°`}
                value={selectedPhoto.rotation}
                min={-180}
                max={180}
                onChange={(v) =>
                  onUpdatePhoto(selectedPhoto.id, (p) => ({ ...p, rotation: v }))
                }
              />
              <SliderRow
                label="3D Depth (Z-Axis)"
                valueDisplay={`${selectedPhoto.z}px`}
                value={selectedPhoto.z}
                min={-280}
                max={280}
                onChange={(v) =>
                  onUpdatePhoto(selectedPhoto.id, (p) => ({ ...p, z: v }))
                }
              />
              <SliderRow
                label="Position X"
                valueDisplay={`${selectedPhoto.x}px`}
                value={selectedPhoto.x}
                min={-600}
                max={600}
                onChange={(v) =>
                  onUpdatePhoto(selectedPhoto.id, (p) => ({ ...p, x: v }))
                }
              />
              <SliderRow
                label="Position Y"
                valueDisplay={`${selectedPhoto.y}px`}
                value={selectedPhoto.y}
                min={-400}
                max={400}
                onChange={(v) =>
                  onUpdatePhoto(selectedPhoto.id, (p) => ({ ...p, y: v }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() =>
                  onUpdatePhoto(selectedPhoto.id, (p) => ({ ...p, flipX: !p.flipX }))
                }
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs border transition ${
                  selectedPhoto.flipX
                    ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-200'
                    : 'border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/10'
                }`}
              >
                <FlipHorizontal2 className="h-3.5 w-3.5" />
                Flip H
              </button>
              <button
                type="button"
                onClick={() =>
                  onUpdatePhoto(selectedPhoto.id, (p) => ({ ...p, flipY: !p.flipY }))
                }
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs border transition ${
                  selectedPhoto.flipY
                    ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-200'
                    : 'border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/10'
                }`}
              >
                <FlipVertical2 className="h-3.5 w-3.5" />
                Flip V
              </button>
              <button
                type="button"
                onClick={() => onBringFront(selectedPhoto.id)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] py-2 text-xs text-slate-200 hover:bg-white/10 transition"
              >
                <ArrowUp className="h-3.5 w-3.5" />
                Bring Front
              </button>
              <button
                type="button"
                onClick={() => onSendBack(selectedPhoto.id)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] py-2 text-xs text-slate-200 hover:bg-white/10 transition"
              >
                <ArrowDown className="h-3.5 w-3.5" />
                Send Back
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onResetPhoto(selectedPhoto.id)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] py-2 text-xs text-slate-300 hover:border-cyan-400/40 hover:bg-cyan-500/15 hover:text-cyan-200 transition"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Photo
              </button>
              {canDelete && (
                <button
                  type="button"
                  onClick={() => onDeletePhoto(selectedPhoto.id)}
                  title="Delete Selected Photo"
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300 hover:bg-rose-500/25 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </>
        )}

        {tab === 'effects' && (
          <div className="space-y-4">
            <div className="space-y-2.5">
              <SliderRow
                label="Neon Glow"
                valueDisplay={`${selectedPhoto.effects.neonGlow}%`}
                value={selectedPhoto.effects.neonGlow}
                min={0}
                max={100}
                onChange={(v) => onUpdateEffects(selectedPhoto.id, { neonGlow: v })}
              />
              <div className="flex items-center gap-2">
                {NEON_SWATCHES.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => onUpdateEffects(selectedPhoto.id, { neonColor: hex })}
                    style={{
                      backgroundColor: hex,
                      boxShadow:
                        selectedPhoto.effects.neonColor === hex
                          ? `0 0 12px ${hex}`
                          : 'none',
                    }}
                    className={`h-5 w-5 rounded-full transition-transform ${
                      selectedPhoto.effects.neonColor === hex
                        ? 'scale-125 ring-2 ring-white'
                        : 'opacity-75 hover:opacity-100'
                    }`}
                    aria-label={`Glow color ${hex}`}
                  />
                ))}
              </div>
            </div>

            <SliderRow
              label="RGB Chromatic Split"
              valueDisplay={`${selectedPhoto.effects.rgbSplit}px`}
              value={selectedPhoto.effects.rgbSplit}
              min={0}
              max={18}
              onChange={(v) => onUpdateEffects(selectedPhoto.id, { rgbSplit: v })}
            />
            <SliderRow
              label="Cyber Glitch"
              valueDisplay={`${selectedPhoto.effects.glitch}%`}
              value={selectedPhoto.effects.glitch}
              min={0}
              max={100}
              onChange={(v) => onUpdateEffects(selectedPhoto.id, { glitch: v })}
            />

            <div className="space-y-2">
              <span className="text-[11px] text-slate-300">Color Filter Grade</span>
              <div className="flex flex-wrap gap-1.5">
                {COLOR_GRADES.map((cg) => (
                  <button
                    key={cg.id}
                    type="button"
                    onClick={() => onUpdateEffects(selectedPhoto.id, { colorGrade: cg.id })}
                    className={`rounded-lg px-2.5 py-1 text-[10px] font-mono transition border ${
                      selectedPhoto.effects.colorGrade === cg.id
                        ? 'border-cyan-400 bg-cyan-500/25 text-white'
                        : 'border-white/10 bg-black/30 text-slate-300 hover:border-white/25'
                    }`}
                  >
                    {cg.label}
                  </button>
                ))}
              </div>
            </div>

            <SliderRow
              label="Brightness"
              valueDisplay={`${selectedPhoto.effects.brightness}%`}
              value={selectedPhoto.effects.brightness}
              min={30}
              max={200}
              onChange={(v) => onUpdateEffects(selectedPhoto.id, { brightness: v })}
            />
            <SliderRow
              label="Contrast"
              valueDisplay={`${selectedPhoto.effects.contrast}%`}
              value={selectedPhoto.effects.contrast}
              min={30}
              max={200}
              onChange={(v) => onUpdateEffects(selectedPhoto.id, { contrast: v })}
            />
            <SliderRow
              label="Saturation"
              valueDisplay={`${selectedPhoto.effects.saturation}%`}
              value={selectedPhoto.effects.saturation}
              min={0}
              max={240}
              onChange={(v) => onUpdateEffects(selectedPhoto.id, { saturation: v })}
            />
            <SliderRow
              label="Grayscale"
              valueDisplay={`${selectedPhoto.effects.grayscale}%`}
              value={selectedPhoto.effects.grayscale}
              min={0}
              max={100}
              onChange={(v) => onUpdateEffects(selectedPhoto.id, { grayscale: v })}
            />
            <SliderRow
              label="Blur"
              valueDisplay={`${selectedPhoto.effects.blur}px`}
              value={selectedPhoto.effects.blur}
              min={0}
              max={16}
              step={0.5}
              onChange={(v) => onUpdateEffects(selectedPhoto.id, { blur: v })}
            />
            <SliderRow
              label="Opacity"
              valueDisplay={`${selectedPhoto.effects.opacity}%`}
              value={selectedPhoto.effects.opacity}
              min={10}
              max={100}
              onChange={(v) => onUpdateEffects(selectedPhoto.id, { opacity: v })}
            />
            <SliderRow
              label="Shadow Intensity"
              valueDisplay={`${selectedPhoto.effects.shadowIntensity}%`}
              value={selectedPhoto.effects.shadowIntensity}
              min={0}
              max={100}
              onChange={(v) => onUpdateEffects(selectedPhoto.id, { shadowIntensity: v })}
            />

            <button
              type="button"
              onClick={() =>
                onUpdateEffects(selectedPhoto.id, {
                  ...DEFAULT_EFFECTS,
                  neonColor: selectedPhoto.id === 'photo-1' ? '#38bdf8' : '#a855f7',
                })
              }
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] py-2 text-xs text-slate-300 hover:bg-white/10 transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Effects
            </button>
          </div>
        )}

        {tab === 'lighting' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <span className="text-[11px] text-slate-300">Ambient Lighting Spectrum</span>
              <div className="grid grid-cols-2 gap-2">
                {ACCENTS.map((accent) => (
                  <button
                    key={accent.id}
                    type="button"
                    onClick={() => onUpdateLighting({ themeAccent: accent.id })}
                    className={`flex items-center gap-2 rounded-xl border p-2 text-left transition ${
                      lighting.themeAccent === accent.id
                        ? 'border-cyan-400 bg-white/10 text-white'
                        : 'border-white/10 bg-black/25 text-slate-300 hover:border-white/25'
                    }`}
                  >
                    <span
                      className={`h-4 w-4 rounded-full bg-gradient-to-tr ${accent.colors} shrink-0`}
                    />
                    <span className="text-[10px] font-medium leading-tight">
                      {accent.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <SliderRow
              label="Aurora Glow Intensity"
              valueDisplay={`${lighting.auroraIntensity}%`}
              value={lighting.auroraIntensity}
              min={0}
              max={100}
              onChange={(v) => onUpdateLighting({ auroraIntensity: v })}
            />

            <SliderRow
              label="Particle Density"
              valueDisplay={`${lighting.particleDensity}%`}
              value={lighting.particleDensity}
              min={10}
              max={100}
              onChange={(v) => onUpdateLighting({ particleDensity: v })}
            />

            <div className="space-y-2 pt-1">
              {[
                {
                  key: 'mouseSpotlight' as const,
                  label: 'Mouse-Following Light Beam',
                  val: lighting.mouseSpotlight,
                },
                {
                  key: 'particlesEnabled' as const,
                  label: 'Spatial Floating Particles',
                  val: lighting.particlesEnabled,
                },
                {
                  key: 'gridEnabled' as const,
                  label: 'Holographic Spatial Grid',
                  val: lighting.gridEnabled,
                },
              ].map((toggle) => (
                <button
                  key={toggle.key}
                  type="button"
                  onClick={() =>
                    onUpdateLighting({
                      [toggle.key]: !toggle.val,
                    } as Partial<EnvironmentLighting>)
                  }
                  className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs text-slate-200 hover:bg-white/[0.07] transition"
                >
                  <span>{toggle.label}</span>
                  <span
                    className={`h-4 w-8 rounded-full p-0.5 transition-colors ${
                      toggle.val ? 'bg-cyan-400' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`block h-3 w-3 rounded-full bg-white transition-transform ${
                        toggle.val ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.aside>
  );
};
