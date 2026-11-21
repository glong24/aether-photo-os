import React from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowUp, Eye, EyeOff, Layers, Lock, Unlock } from 'lucide-react';
import { PhotoItem } from '../types';

interface LayerPanelProps {
  photos: PhotoItem[];
  selectedId: PhotoItem['id'];
  onSelect: (id: PhotoItem['id']) => void;
  onToggleVisible: (id: PhotoItem['id']) => void;
  onToggleLock: (id: PhotoItem['id']) => void;
  onBringFront: (id: PhotoItem['id']) => void;
  onSendBack: (id: PhotoItem['id']) => void;
}

export const LayerPanel: React.FC<LayerPanelProps> = ({
  photos,
  selectedId,
  onSelect,
  onToggleVisible,
  onToggleLock,
  onBringFront,
  onSendBack,
}) => {
  const ordered = [...photos].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <motion.div
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 24, opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="aether-glass fixed bottom-4 left-4 z-30 hidden sm:block w-[255px] rounded-2xl p-3"
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300">
          <Layers className="h-3.5 w-3.5" />
          SPATIAL LAYERS
        </div>
        <span className="font-mono text-[9px] text-slate-400">2 OBJECTS</span>
      </div>

      <div className="space-y-1.5">
        {ordered.map((p) => {
          const active = p.id === selectedId;
          return (
            <div
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={`flex items-center justify-between rounded-xl px-2 py-1.5 cursor-pointer border transition ${
                active
                  ? 'border-cyan-400/50 bg-cyan-500/15'
                  : 'border-white/5 bg-white/[0.03] hover:border-white/15'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={p.src}
                  alt={p.name}
                  className={`h-8 w-5 rounded object-cover border border-white/20 shrink-0 ${
                    !p.visible ? 'opacity-35 grayscale' : ''
                  }`}
                />
                <div className="min-w-0">
                  <div className="truncate font-mono text-[10px] font-medium text-white">
                    {p.id === 'photo-1' ? 'OBJ 01 MIRROR' : 'OBJ 02 COURT'}
                  </div>
                  <div className="font-mono text-[9px] text-slate-400">
                    Z:{p.zIndex} • {Math.round(p.scale * 100)}%
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onBringFront(p.id);
                  }}
                  title="Bring Forward"
                  className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-cyan-200"
                >
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSendBack(p.id);
                  }}
                  title="Send Backward"
                  className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-cyan-200"
                >
                  <ArrowDown className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleLock(p.id);
                  }}
                  title={p.locked ? 'Unlock' : 'Lock'}
                  className={`rounded p-1 hover:bg-white/10 ${
                    p.locked ? 'text-amber-300' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {p.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVisible(p.id);
                  }}
                  title={p.visible ? 'Hide Layer' : 'Show Layer'}
                  className={`rounded p-1 hover:bg-white/10 ${
                    p.visible ? 'text-slate-300 hover:text-white' : 'text-slate-600'
                  }`}
                >
                  {p.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};
