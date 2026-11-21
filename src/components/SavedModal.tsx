import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BookmarkPlus, FolderOpen, Trash2, X } from 'lucide-react';
import { SavedComposition } from '../types';

interface SavedModalProps {
  compositions: SavedComposition[];
  onSaveCurrent: (name: string) => void;
  onLoad: (comp: SavedComposition) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export const SavedModal: React.FC<SavedModalProps> = ({
  compositions,
  onSaveCurrent,
  onLoad,
  onDelete,
  onClose,
}) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim() || `Composition #${compositions.length + 1}`;
    onSaveCurrent(trimmed);
    setName('');
  };

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
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-white">
            Saved Compositions
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mb-4 flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name current spatial layout..."
            className="flex-1 rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 px-3.5 py-2 text-xs font-medium text-white shadow-[0_0_16px_rgba(56,189,248,0.4)] hover:brightness-110 transition"
          >
            <BookmarkPlus className="h-3.5 w-3.5" />
            Save
          </button>
        </form>

        <div className="max-h-64 space-y-2 overflow-y-auto glass-scroll pr-1">
          {compositions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 py-8 text-center text-xs text-slate-400">
              No saved compositions yet. Save your current positions, mode, and visual effects above.
            </div>
          ) : (
            compositions.map((comp) => (
              <div
                key={comp.id}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
              >
                <div className="min-w-0 pr-2">
                  <div className="truncate text-xs font-medium text-white">
                    {comp.name}
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] text-slate-400">
                    {comp.mode.toUpperCase()} • {comp.createdAt}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      onLoad(comp);
                      onClose();
                    }}
                    className="flex items-center gap-1 rounded-lg bg-cyan-500/20 border border-cyan-400/40 px-2.5 py-1 text-[11px] text-cyan-200 hover:bg-cyan-500/35 transition"
                  >
                    <FolderOpen className="h-3 w-3" />
                    Load
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(comp.id)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/20 hover:text-rose-300 transition"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};
