import React from 'react';
import { motion } from 'framer-motion';
import {
  Bookmark,
  Box,
  Camera,
  Columns2,
  EyeOff,
  Film,
  Layers,
  Maximize2,
  Minimize2,
  Move,
  PanelRight,
  RotateCcw,
  Settings,
  Sparkles,
  Upload,
} from 'lucide-react';
import { InteractionMode } from '../types';

interface TopNavBarProps {
  mode: InteractionMode;
  isFullscreen: boolean;
  sidebarOpen: boolean;
  savedCount: number;
  exporting: boolean;
  onModeChange: (mode: InteractionMode) => void;
  onUploadClick: () => void;
  onResetAll: () => void;
  onToggleFullscreen: () => void;
  onHideUI: () => void;
  onOpenSettings: () => void;
  onOpenSaved: () => void;
  onExportPng: () => void;
  onToggleSidebar: () => void;
}

const MODES: { id: InteractionMode; label: string; short: string; icon: React.ReactNode }[] = [
  { id: 'free', label: 'Free Move', short: 'Free', icon: <Move className="h-3.5 w-3.5" /> },
  { id: 'space3d', label: '3D Space', short: '3D', icon: <Box className="h-3.5 w-3.5" /> },
  { id: 'overlap', label: 'Overlap', short: 'Blend', icon: <Layers className="h-3.5 w-3.5" /> },
  { id: 'cinematic', label: 'Cinematic', short: 'Cine', icon: <Film className="h-3.5 w-3.5" /> },
  { id: 'playground', label: 'Playground', short: 'Play', icon: <Sparkles className="h-3.5 w-3.5" /> },
  { id: 'compare', label: 'Compare', short: 'Comp', icon: <Columns2 className="h-3.5 w-3.5" /> },
];

export const TopNavBar: React.FC<TopNavBarProps> = ({
  mode,
  isFullscreen,
  sidebarOpen,
  savedCount,
  exporting,
  onModeChange,
  onUploadClick,
  onResetAll,
  onToggleFullscreen,
  onHideUI,
  onOpenSettings,
  onOpenSaved,
  onExportPng,
  onToggleSidebar,
}) => {
  return (
    <motion.header
      initial={{ y: -28, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -28, opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-3 left-3 right-3 z-40 flex flex-wrap items-center justify-between gap-2 pointer-events-none"
    >
      {/* Left Brand Pill */}
      <div className="aether-glass pointer-events-auto flex items-center gap-2.5 rounded-full px-3.5 py-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_10px_#22d3ee]" />
        </span>
        <span className="font-display text-xs sm:text-sm font-semibold tracking-[0.2em] text-white">
          AETHER <span className="text-cyan-400">//</span> OS
        </span>
      </div>

      {/* Center 6-Mode Selector */}
      <nav
        aria-label="Interaction Modes"
        className="aether-glass pointer-events-auto order-3 lg:order-2 flex w-full lg:w-auto items-center justify-between lg:justify-center gap-1 overflow-x-auto rounded-full p-1 glass-scroll"
      >
        {MODES.map((m) => {
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onModeChange(m.id)}
              className={`relative flex shrink-0 items-center gap-1.5 rounded-full px-2.5 sm:px-3.5 py-1.5 text-[11px] font-medium transition ${
                active ? 'text-white' : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="active-mode-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500/30 via-sky-500/25 to-purple-500/30 border border-cyan-400/50 shadow-[0_0_16px_rgba(56,189,248,0.28)]"
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                {m.icon}
                <span className="hidden sm:inline">{m.label}</span>
                <span className="sm:hidden">{m.short}</span>
              </span>
            </button>
          );
        })}
      </nav>

      {/* Right Utility Actions */}
      <div className="aether-glass pointer-events-auto order-2 lg:order-3 flex items-center gap-1 rounded-full p-1">
        <button
          type="button"
          onClick={onUploadClick}
          title="Upload New Photos"
          className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-cyan-500/30 to-purple-500/30 border border-cyan-400/50 px-2.5 py-1.5 text-cyan-100 hover:from-cyan-500/45 hover:to-purple-500/45 transition shadow-[0_0_14px_rgba(56,189,248,0.25)]"
        >
          <Upload className="h-3.5 w-3.5" />
          <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-wider">
            Upload
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenSaved}
          title="Save / Load Compositions"
          className="relative flex items-center gap-1 rounded-full px-2 py-1.5 text-slate-300 hover:bg-white/10 hover:text-cyan-200 transition"
        >
          <Bookmark className="h-3.5 w-3.5" />
          {savedCount > 0 && (
            <span className="font-mono text-[10px] text-cyan-300">{savedCount}</span>
          )}
        </button>

        <button
          type="button"
          onClick={onExportPng}
          disabled={exporting}
          title="Export PNG Screenshot"
          className="flex items-center gap-1.5 rounded-full px-2 py-1.5 text-slate-300 hover:bg-cyan-500/20 hover:text-cyan-200 disabled:opacity-50 transition"
        >
          <Camera className="h-3.5 w-3.5" />
          <span className="hidden xl:inline font-mono text-[10px] uppercase tracking-wider">
            {exporting ? 'Saving...' : 'Export'}
          </span>
        </button>

        <button
          type="button"
          onClick={onResetAll}
          title="Reset All (R)"
          className="rounded-full p-1.5 text-slate-300 hover:bg-rose-500/20 hover:text-rose-200 transition"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={onToggleFullscreen}
          title="Fullscreen (F)"
          className="rounded-full p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition"
        >
          {isFullscreen ? (
            <Minimize2 className="h-3.5 w-3.5" />
          ) : (
            <Maximize2 className="h-3.5 w-3.5" />
          )}
        </button>

        <button
          type="button"
          onClick={onHideUI}
          title="Hide Interface (H)"
          className="rounded-full p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition"
        >
          <EyeOff className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          title="Settings"
          className="rounded-full p-1.5 text-slate-300 hover:bg-white/10 hover:text-cyan-200 transition"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={onToggleSidebar}
          title="Toggle Control Panel"
          className={`rounded-full p-1.5 transition ${
            sidebarOpen
              ? 'bg-cyan-400/25 text-cyan-200 border border-cyan-400/40'
              : 'text-slate-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          <PanelRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.header>
  );
};
