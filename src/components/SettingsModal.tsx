import React from 'react';
import { motion } from 'framer-motion';
import { Keyboard, Volume2, VolumeX, X } from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsModalProps {
  settings: AppSettings;
  onUpdate: (patch: Partial<AppSettings>) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdate,
  onClose,
}) => {
  const toggles: { key: keyof AppSettings; title: string; desc: string }[] = [
    {
      key: 'audioEnabled',
      title: 'Synthesized UI Sound FX',
      desc: 'Subtle sci-fi Web Audio feedback on clicks, snaps, and mode switches.',
    },
    {
      key: 'inertiaEnabled',
      title: 'Momentum & Inertia Physics',
      desc: 'Photos glide smoothly with natural deceleration when released.',
    },
    {
      key: 'magneticSnap',
      title: 'Magnetic Alignment Guides',
      desc: 'Snap photos smoothly to canvas center and each other with laser guides.',
    },
    {
      key: 'tilt3D',
      title: 'Interactive 3D Hover Tilt',
      desc: 'Perspective tilt and specular glass sheen react to pointer movement.',
    },
    {
      key: 'parallax',
      title: 'Spatial Depth Parallax',
      desc: 'Subtle multi-layer parallax shift as you move across the viewport.',
    },
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4"
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="aether-glass w-full max-w-md rounded-3xl p-5"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
          <div className="flex items-center gap-2">
            {settings.audioEnabled ? (
              <Volume2 className="h-4 w-4 text-cyan-300" />
            ) : (
              <VolumeX className="h-4 w-4 text-slate-400" />
            )}
            <h2 className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-white">
              System Settings
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2.5">
          {toggles.map((item) => {
            const active = settings[item.key];
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onUpdate({ [item.key]: !active } as Partial<AppSettings>)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left hover:bg-white/[0.06] transition"
              >
                <div>
                  <div className="text-xs font-medium text-white">{item.title}</div>
                  <div className="mt-0.5 text-[11px] text-slate-400">{item.desc}</div>
                </div>
                <span
                  className={`h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors ${
                    active ? 'bg-cyan-400' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`block h-4 w-4 rounded-full bg-white transition-transform ${
                      active ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-3">
          <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-cyan-300">
            <Keyboard className="h-3.5 w-3.5" />
            Quick Controls
          </div>
          <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px] text-slate-300">
            <div><span className="text-cyan-300">1–6</span> Switch Modes</div>
            <div><span className="text-cyan-300">H</span> Hide / Show HUD</div>
            <div><span className="text-cyan-300">R</span> Reset Workspace</div>
            <div><span className="text-cyan-300">F</span> Fullscreen</div>
            <div><span className="text-cyan-300">Wheel</span> Zoom Photo</div>
            <div><span className="text-cyan-300">Dbl-Click</span> Reset Photo</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
