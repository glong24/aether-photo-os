import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye, Sparkles, Upload } from 'lucide-react';
import { AmbientCanvas } from './components/AmbientCanvas';
import { BootSequence } from './components/BootSequence';
import { CompareStage } from './components/CompareStage';
import { ControlSidebar } from './components/ControlSidebar';
import { LayerPanel } from './components/LayerPanel';
import { SavedModal } from './components/SavedModal';
import { SettingsModal } from './components/SettingsModal';
import { SpatialPhotoCard } from './components/SpatialPhotoCard';
import { TopNavBar } from './components/TopNavBar';
import {
  AppSettings,
  ColorGrade,
  DEFAULT_LIGHTING,
  DEFAULT_SETTINGS,
  EnvironmentLighting,
  InteractionMode,
  PhotoEffects,
  PhotoItem,
  PlaygroundPreset,
  SavedComposition,
  SnapGuides,
  createInitialPhotos,
  createUploadedPhoto,
} from './types';
import { playSound } from './utils/audio';
import { exportCompositionToPng } from './utils/exporter';

const STORAGE_KEY = 'aether_os_saved_compositions_v1';

const MODE_LABELS: Record<InteractionMode, string> = {
  free: 'FREE MOVEMENT — Press & hold any photo to drag freely, scroll to zoom, or drop new images',
  space3d: '3D SPACE — Drag empty space to orbit the 3D stage & adjust Z-depth',
  overlap: 'OVERLAP STUDIO — Blend photos with double-exposure opacity',
  cinematic: 'CINEMATIC — Volumetric lighting, slow orbital breath & film framing',
  playground: 'PLAYGROUND — Experiment with live physics presets & randomize FX',
  compare: 'COMPARE — Side-by-side synced inspection & laser split curtain',
};

function readImageFile(
  file: File
): Promise<{ src: string; width: number; height: number; name: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const img = new Image();
      img.onload = () => {
        resolve({
          src: dataUrl,
          width: img.naturalWidth || 800,
          height: img.naturalHeight || 1000,
          name: file.name,
        });
      };
      img.onerror = () => reject(new Error('Invalid image file'));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [booting, setBooting] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [mode, setMode] = useState<InteractionMode>('free');
  const [photos, setPhotos] = useState<PhotoItem[]>(() =>
    createInitialPhotos(typeof window !== 'undefined' ? window.innerWidth : 1280)
  );
  const [selectedId, setSelectedId] = useState<string>('photo-1');
  const [lighting, setLighting] = useState<EnvironmentLighting>(DEFAULT_LIGHTING);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [uiHidden, setUiHidden] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [isFileDragOver, setIsFileDragOver] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [snapGuides, setSnapGuides] = useState<SnapGuides>({
    vertical: null,
    horizontal: null,
  });

  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const isAnyDraggingRef = useRef(false);

  const [stageOrbit, setStageOrbit] = useState({ rx: 8, ry: -10 });
  const orbitingRef = useRef(false);
  const orbitOrigin = useRef({ x: 0, y: 0, rx: 8, ry: -10 });

  const [playgroundPreset, setPlaygroundPreset] = useState<PlaygroundPreset>('none');

  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1280
  );

  const pointerRef = useRef({ x: 0, y: 0, normX: 0, normY: 0 });
  const [parallaxOffset, setParallaxOffset] = useState({ x: 0, y: 0 });

  const [savedCompositions, setSavedCompositions] = useState<SavedComposition[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as SavedComposition[];
    } catch {
      // Ignore storage access errors
    }
    return [];
  });

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => {
      setToast((cur) => (cur === msg ? null : cur));
    }, 2400);
  }, []);

  const handleBootComplete = useCallback(() => {
    setBooting(false);
    setShowWelcome(true);
    window.setTimeout(() => setShowWelcome(false), 5200);
  }, []);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    let raf = 0;
    const onMouseMove = (e: MouseEvent) => {
      const normX = (e.clientX / window.innerWidth - 0.5) * 2;
      const normY = (e.clientY / window.innerHeight - 0.5) * 2;
      pointerRef.current = { x: e.clientX, y: e.clientY, normX, normY };

      if (isAnyDraggingRef.current) return;

      if (!raf) {
        raf = requestAnimationFrame(() => {
          if (!isAnyDraggingRef.current) {
            setParallaxOffset({
              x: Number((normX * -14).toFixed(2)),
              y: Number((normY * -12).toFixed(2)),
            });
          }
          raf = 0;
        });
      }
    };
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    if (mode !== 'playground' || playgroundPreset === 'none') return;
    let raf = 0;
    let t = 0;

    const tick = () => {
      t += 0.02;
      setPhotos((prev) =>
        prev.map((p, idx) => {
          if (p.locked) return p;
          const total = Math.max(1, prev.length);
          const phase = (idx / total) * Math.PI * 2;
          const dir = idx % 2 === 0 ? 1 : -1;
          if (playgroundPreset === 'zerog') {
            return {
              ...p,
              y: Math.round(Math.sin(t + phase) * 32),
              rotation: Math.round(Math.sin(t * 0.7 + idx) * 7),
            };
          }
          if (playgroundPreset === 'orbit') {
            const radius = viewportWidth < 768 ? 95 : 195;
            return {
              ...p,
              x: Math.round(Math.cos(t + phase) * radius),
              y: Math.round(Math.sin(t + phase) * 58),
              rotation: Math.round(Math.sin(t + idx) * 14),
            };
          }
          if (playgroundPreset === 'mirror') {
            const spread = viewportWidth < 768 ? 88 : 175;
            return {
              ...p,
              x: Math.round(dir * (-spread + Math.sin(t * 1.2) * 28)),
              y: Math.round(Math.cos(t * 1.2) * 22),
              rotation: Math.round(dir * -6),
              flipX: idx % 2 === 1,
            };
          }
          if (playgroundPreset === 'vortex') {
            return {
              ...p,
              x: Math.round(Math.cos(t * 1.4 + phase) * 120),
              y: Math.round(Math.sin(t * 1.4 + phase) * 85),
              rotation: Math.round(((t * 60 * dir) % 360) - 180),
            };
          }
          return p;
        })
      );
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mode, playgroundPreset, viewportWidth]);

  const mountUploadedFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const imageFiles = Array.from(fileList).filter((f) =>
        f.type.startsWith('image/')
      );
      if (imageFiles.length === 0) {
        showToast('Please select valid image files (JPG, PNG, WebP)');
        return;
      }

      try {
        const loaded = await Promise.all(imageFiles.map((f) => readImageFile(f)));
        let latestId = '';
        setPhotos((prev) => {
          const added = loaded.map((item, idx) =>
            createUploadedPhoto(item.src, item.name, item.width, item.height, prev, idx)
          );
          latestId = added[added.length - 1].id;
          return [...prev, ...added];
        });
        if (latestId) setSelectedId(latestId);
        playSound('save', settings.audioEnabled);
        showToast(
          loaded.length === 1
            ? `Added "${loaded[0].name}"`
            : `Added ${loaded.length} photos to workspace`
        );
      } catch {
        showToast('Could not read uploaded image');
      }
    },
    [settings.audioEnabled, showToast]
  );

  const handleUploadInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      mountUploadedFiles(e.target.files);
    }
    e.target.value = '';
  };

  const handleReplaceInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;

    try {
      const item = await readImageFile(file);
      const cleanName = item.name
        .replace(/\.[^/.]+$/, '')
        .toUpperCase()
        .slice(0, 14);
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === selectedId
            ? {
                ...p,
                src: item.src,
                name: cleanName || p.name,
                subtitle: `UPLOADED // ${item.width}×${item.height}`,
                aspectRatio: Math.max(0.4, Math.min(2.4, item.width / item.height)),
              }
            : p
        )
      );
      playSound('save', settings.audioEnabled);
      showToast(`Replaced photo with "${file.name}"`);
    } catch {
      showToast('Could not replace photo');
    }
  };

  const handleDeletePhoto = useCallback(
    (id: string) => {
      if (photos.length <= 2) return;
      playSound('whoosh', settings.audioEnabled);
      setPhotos((prev) => {
        const next = prev.filter((p) => p.id !== id);
        if (selectedId === id && next.length > 0) {
          setSelectedId(next[0].id);
        }
        return next;
      });
      showToast('Photo removed from workspace');
    },
    [photos.length, selectedId, settings.audioEnabled, showToast]
  );

  const handleModeChange = useCallback(
    (nextMode: InteractionMode) => {
      playSound('mode', settings.audioEnabled);
      setMode(nextMode);
      setPlaygroundPreset('none');

      if (nextMode === 'space3d') {
        setStageOrbit({ rx: 10, ry: -14 });
        setPhotos((prev) =>
          prev.map((p, idx) => ({
            ...p,
            x: Math.round((idx - (prev.length - 1) / 2) * 260),
            y: idx % 2 === 0 ? -12 : 12,
            z: idx % 2 === 0 ? 95 : -75,
            rotation: idx % 2 === 0 ? -6 : 6,
            effects: { ...p.effects, blendMode: 'normal', opacity: 100 },
          }))
        );
      } else if (nextMode === 'overlap') {
        setPhotos((prev) =>
          prev.map((p, idx) => ({
            ...p,
            x: Math.round((idx - (prev.length - 1) / 2) * 80),
            y: idx % 2 === 0 ? -14 : 14,
            z: 0,
            rotation: idx % 2 === 0 ? -3 : 3,
            scale: viewportWidth < 768 ? 0.88 : 1.06,
            effects: {
              ...p.effects,
              opacity: idx === 0 ? 100 : 72,
              blendMode: idx === 0 ? 'normal' : 'screen',
            },
          }))
        );
      } else if (nextMode === 'cinematic') {
        setPhotos((prev) =>
          prev.map((p, idx) => ({
            ...p,
            x: Math.round(
              (idx - (prev.length - 1) / 2) * (viewportWidth < 768 ? 160 : 320)
            ),
            y: 0,
            z: idx % 2 === 0 ? 35 : -25,
            rotation: idx % 2 === 0 ? -2 : 2,
            effects: {
              ...p.effects,
              blendMode: 'normal',
              opacity: 100,
              shadowIntensity: 90,
            },
          }))
        );
      } else if (nextMode === 'free') {
        setPhotos((prev) =>
          prev.map((p) => ({
            ...p,
            effects: { ...p.effects, blendMode: 'normal' },
          }))
        );
      }
    },
    [settings.audioEnabled, viewportWidth]
  );

  const handleUpdatePhoto = useCallback(
    (id: string, updater: (prev: PhotoItem) => PhotoItem) => {
      setPhotos((prev) => prev.map((p) => (p.id === id ? updater(p) : p)));
    },
    []
  );

  const handleUpdateEffects = useCallback(
    (id: string, patch: Partial<PhotoEffects>) => {
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, effects: { ...p.effects, ...patch } } : p
        )
      );
    },
    []
  );

  const handleBringFront = useCallback((id: string) => {
    setPhotos((prev) => {
      const maxZ = Math.max(10, ...prev.map((p) => p.zIndex));
      return prev.map((p) => (p.id === id ? { ...p, zIndex: maxZ + 1 } : p));
    });
  }, []);

  const handleSendBack = useCallback((id: string) => {
    setPhotos((prev) => {
      const minZ = Math.min(...prev.map((p) => p.zIndex));
      if (minZ <= 2) {
        return prev.map((p) =>
          p.id === id ? { ...p, zIndex: 1 } : { ...p, zIndex: p.zIndex + 2 }
        );
      }
      return prev.map((p) => (p.id === id ? { ...p, zIndex: minZ - 1 } : p));
    });
  }, []);

  const handleResetOne = useCallback(
    (id: string) => {
      playSound('whoosh', settings.audioEnabled);
      const defaults = createInitialPhotos(viewportWidth);
      const targetDefault = defaults.find((d) => d.id === id);
      setPhotos((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          if (targetDefault) {
            return {
              ...targetDefault,
              src: p.src,
              name: p.name,
              aspectRatio: p.aspectRatio,
              effects: p.effects,
            };
          }
          return {
            ...p,
            x: 0,
            y: 0,
            z: 0,
            scale: 1,
            rotation: 0,
            flipX: false,
            flipY: false,
          };
        })
      );
      showToast('Photo position reset');
    },
    [settings.audioEnabled, viewportWidth, showToast]
  );

  const handleResetAll = useCallback(() => {
    playSound('whoosh', settings.audioEnabled);
    setPhotos(createInitialPhotos(viewportWidth));
    setSelectedId('photo-1');
    setLighting(DEFAULT_LIGHTING);
    setStageOrbit({ rx: 8, ry: -10 });
    setPlaygroundPreset('none');
    setMode('free');
    showToast('Workspace reset to spatial defaults');
  }, [settings.audioEnabled, viewportWidth, showToast]);

  const handleChaosRandomize = useCallback(() => {
    playSound('mode', settings.audioEnabled);
    const grades: ColorGrade[] = [
      'none',
      'cyberpunk',
      'vision-ice',
      'ultraviolet',
      'noir',
      'emerald',
    ];
    const neonHexes = ['#38bdf8', '#22d3ee', '#a855f7', '#ec4899', '#10b981'];
    const spread = viewportWidth < 768 ? 110 : 240;

    setPlaygroundPreset('none');
    setPhotos((prev) =>
      prev.map((p, idx) => ({
        ...p,
        x: Math.round((idx % 2 === 0 ? -1 : 1) * (85 + Math.random() * spread * 0.7)),
        y: Math.round((Math.random() - 0.5) * 140),
        z: Math.round((Math.random() - 0.5) * 180),
        scale: Number((0.82 + Math.random() * 0.42).toFixed(2)),
        rotation: Math.round((Math.random() - 0.5) * 34),
        effects: {
          ...p.effects,
          neonGlow: Math.round(35 + Math.random() * 55),
          neonColor: neonHexes[Math.floor(Math.random() * neonHexes.length)],
          rgbSplit: Math.random() > 0.5 ? Math.round(Math.random() * 8) : 0,
          glitch: Math.random() > 0.72 ? Math.round(18 + Math.random() * 40) : 0,
          colorGrade: grades[Math.floor(Math.random() * grades.length)],
        },
      }))
    );
    showToast('Randomized spatial scene & effects');
  }, [settings.audioEnabled, viewportWidth, showToast]);

  const handleToggleFullscreen = useCallback(() => {
    playSound('click', settings.audioEnabled);
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, [settings.audioEnabled]);

  const handleSaveComposition = useCallback(
    (name: string) => {
      playSound('save', settings.audioEnabled);
      const entry: SavedComposition = {
        id: `${Date.now()}`,
        name,
        createdAt: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        mode,
        photos,
        lighting,
      };
      const updated = [entry, ...savedCompositions].slice(0, 12);
      setSavedCompositions(updated);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage quota errors
      }
      showToast(`Saved "${name}"`);
    },
    [mode, photos, lighting, savedCompositions, settings.audioEnabled, showToast]
  );

  const handleLoadComposition = useCallback(
    (comp: SavedComposition) => {
      playSound('mode', settings.audioEnabled);
      setMode(comp.mode);
      setPhotos(comp.photos);
      if (comp.photos.length > 0) setSelectedId(comp.photos[0].id);
      setLighting(comp.lighting);
      showToast(`Loaded "${comp.name}"`);
    },
    [settings.audioEnabled, showToast]
  );

  const handleDeleteComposition = useCallback(
    (id: string) => {
      playSound('click', settings.audioEnabled);
      const updated = savedCompositions.filter((c) => c.id !== id);
      setSavedCompositions(updated);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore
      }
    },
    [savedCompositions, settings.audioEnabled]
  );

  const handleExportPng = useCallback(async () => {
    playSound('save', settings.audioEnabled);
    setExporting(true);
    try {
      await exportCompositionToPng(photos, lighting, mode);
      showToast('High-res PNG screenshot exported');
    } catch {
      showToast('Export failed — please retry');
    } finally {
      setExporting(false);
    }
  }, [photos, lighting, mode, settings.audioEnabled, showToast]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === 'h') setUiHidden((v) => !v);
      else if (key === 'r') handleResetAll();
      else if (key === 'f') handleToggleFullscreen();
      else if (key === '1') handleModeChange('free');
      else if (key === '2') handleModeChange('space3d');
      else if (key === '3') handleModeChange('overlap');
      else if (key === '4') handleModeChange('cinematic');
      else if (key === '5') handleModeChange('playground');
      else if (key === '6') handleModeChange('compare');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleModeChange, handleResetAll, handleToggleFullscreen]);

  const selectedPhoto = useMemo(
    () => photos.find((p) => p.id === selectedId) ?? photos[0],
    [photos, selectedId]
  );

  const baseCardWidth = viewportWidth < 640 ? 195 : viewportWidth < 1024 ? 245 : 288;

  const handleStageMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mode !== 'space3d') return;
    orbitingRef.current = true;
    orbitOrigin.current = {
      x: e.clientX,
      y: e.clientY,
      rx: stageOrbit.rx,
      ry: stageOrbit.ry,
    };
  };

  const handleStageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!orbitingRef.current || mode !== 'space3d') return;
    const dx = e.clientX - orbitOrigin.current.x;
    const dy = e.clientY - orbitOrigin.current.y;
    setStageOrbit({
      rx: Math.max(-38, Math.min(38, orbitOrigin.current.rx - dy * 0.14)),
      ry: Math.max(-52, Math.min(52, orbitOrigin.current.ry + dx * 0.16)),
    });
  };

  const handleStageMouseUp = () => {
    orbitingRef.current = false;
  };

  const handleCanvasDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      setIsFileDragOver(true);
    }
  };

  const handleCanvasDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.currentTarget === e.target) {
      setIsFileDragOver(false);
    }
  };

  const handleCanvasDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsFileDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      mountUploadedFiles(e.dataTransfer.files);
    }
  };

  return (
    <div
      onDragOver={handleCanvasDragOver}
      onDragLeave={handleCanvasDragLeave}
      onDrop={handleCanvasDrop}
      className="relative h-screen w-screen overflow-hidden bg-[#03040a] text-slate-100 select-none"
    >
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleUploadInputChange}
      />
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleReplaceInputChange}
      />

      <AmbientCanvas lighting={lighting} mode={mode} pointerRef={pointerRef} />

      <AnimatePresence>
        {isFileDragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-4 z-[60] flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-cyan-400 bg-slate-950/80 backdrop-blur-md"
          >
            <Upload className="mb-3 h-10 w-10 text-cyan-300" />
            <p className="font-display text-lg font-semibold tracking-[0.2em] text-white">
              DROP PHOTOS TO MOUNT
            </p>
            <p className="mt-1 font-mono text-xs text-cyan-200/80">
              Supports JPG, PNG, WebP — multiple files allowed
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {booting && (
          <BootSequence
            imageUrls={['/photos/photo-mirror.jpg', '/photos/photo-court.jpg']}
            onComplete={handleBootComplete}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mode === 'cinematic' && (
          <>
            <motion.div
              initial={{ y: -70 }}
              animate={{ y: 0 }}
              exit={{ y: -70 }}
              className="pointer-events-none fixed top-0 inset-x-0 z-20 h-14 sm:h-16 bg-black/95 border-b border-white/5"
            />
            <motion.div
              initial={{ y: 70 }}
              animate={{ y: 0 }}
              exit={{ y: 70 }}
              className="pointer-events-none fixed bottom-0 inset-x-0 z-20 h-14 sm:h-16 bg-black/95 border-t border-white/5"
            />
            <div
              className="pointer-events-none fixed inset-0 z-10"
              style={{
                background:
                  'radial-gradient(circle at center, transparent 48%, rgba(0,0,0,0.72) 100%)',
              }}
            />
          </>
        )}
      </AnimatePresence>

      {snapGuides.vertical !== null && (
        <div
          className="pointer-events-none fixed top-0 bottom-0 z-20 w-px bg-cyan-400/80 shadow-[0_0_12px_#22d3ee]"
          style={{ left: `calc(50% + ${snapGuides.vertical}px)` }}
        />
      )}
      {snapGuides.horizontal !== null && (
        <div
          className="pointer-events-none fixed left-0 right-0 z-20 h-px bg-purple-400/80 shadow-[0_0_12px_#a855f7]"
          style={{ top: `calc(50% + ${snapGuides.horizontal}px)` }}
        />
      )}

      {!booting && (
        <main
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
          onMouseLeave={handleStageMouseUp}
          className={`relative z-10 h-full w-full ${
            mode === 'space3d' ? 'cursor-move' : ''
          }`}
          style={{ perspective: mode === 'space3d' ? '1350px' : 'none' }}
        >
          {mode === 'compare' ? (
            <CompareStage
              photos={photos}
              selectedId={selectedId}
              onSelect={(id) => {
                playSound('select', settings.audioEnabled);
                setSelectedId(id);
              }}
            />
          ) : (
            <div
              className="relative h-full w-full transition-transform duration-200 ease-out"
              style={{
                transformStyle: mode === 'space3d' ? 'preserve-3d' : 'flat',
                transform:
                  mode === 'space3d'
                    ? `rotateX(${stageOrbit.rx}deg) rotateY(${stageOrbit.ry}deg)`
                    : 'none',
              }}
            >
              {mode === 'space3d' && lighting.gridEnabled && (
                <div
                  className="holo-floor-grid pointer-events-none absolute left-1/2 top-1/2 h-[900px] w-[1100px] opacity-65"
                  style={{
                    transform: 'translate(-50%, -15%) rotateX(74deg) translateZ(-210px)',
                    maskImage:
                      'radial-gradient(ellipse at center, black 25%, transparent 72%)',
                    WebkitMaskImage:
                      'radial-gradient(ellipse at center, black 25%, transparent 72%)',
                  }}
                />
              )}

              {photos.map((photo) => {
                const otherPhotos = photos.filter((p) => p.id !== photo.id);
                return (
                  <SpatialPhotoCard
                    key={photo.id}
                    photo={photo}
                    otherPhotos={otherPhotos}
                    isSelected={selectedId === photo.id}
                    mode={mode}
                    settings={settings}
                    parallaxOffset={parallaxOffset}
                    baseWidth={baseCardWidth}
                    uiHidden={uiHidden}
                    onSelect={(id) => {
                      if (selectedId !== id) {
                        playSound('select', settings.audioEnabled);
                        setSelectedId(id);
                      }
                    }}
                    onUpdate={handleUpdatePhoto}
                    onBringFront={handleBringFront}
                    onSendBack={handleSendBack}
                    onResetOne={handleResetOne}
                    onSnapGuidesChange={setSnapGuides}
                    onDragStateChange={(dragging) => {
                      isAnyDraggingRef.current = dragging;
                    }}
                  />
                );
              })}
            </div>
          )}
        </main>
      )}

      <AnimatePresence>
        {showWelcome && !uiHidden && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -14, opacity: 0 }}
            onClick={() => setShowWelcome(false)}
            className="aether-glass fixed top-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 rounded-full px-4 py-2 cursor-pointer border border-cyan-400/40 shadow-[0_0_28px_rgba(34,211,238,0.22)]"
          >
            <Sparkles className="h-3.5 w-3.5 text-cyan-300 shrink-0" />
            <span className="font-mono text-[10px] sm:text-[11px] tracking-wider text-slate-100 whitespace-nowrap">
              PRESS & HOLD TO DRAG PHOTOS • CLICK UPLOAD OR DROP NEW IMAGES
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!booting && !uiHidden && (
          <>
            <TopNavBar
              mode={mode}
              isFullscreen={isFullscreen}
              sidebarOpen={sidebarOpen}
              savedCount={savedCompositions.length}
              exporting={exporting}
              onModeChange={handleModeChange}
              onUploadClick={() => uploadInputRef.current?.click()}
              onResetAll={handleResetAll}
              onToggleFullscreen={handleToggleFullscreen}
              onHideUI={() => setUiHidden(true)}
              onOpenSettings={() => {
                playSound('click', settings.audioEnabled);
                setSettingsOpen(true);
              }}
              onOpenSaved={() => {
                playSound('click', settings.audioEnabled);
                setSavedOpen(true);
              }}
              onExportPng={handleExportPng}
              onToggleSidebar={() => {
                playSound('click', settings.audioEnabled);
                setSidebarOpen((v) => !v);
              }}
            />

            {mode !== 'compare' && (
              <LayerPanel
                photos={photos}
                selectedId={selectedId}
                canDelete={photos.length > 2}
                onSelect={(id) => {
                  playSound('select', settings.audioEnabled);
                  setSelectedId(id);
                }}
                onUploadClick={() => uploadInputRef.current?.click()}
                onToggleVisible={(id) => {
                  playSound('click', settings.audioEnabled);
                  handleUpdatePhoto(id, (p) => ({ ...p, visible: !p.visible }));
                }}
                onToggleLock={(id) => {
                  playSound('click', settings.audioEnabled);
                  handleUpdatePhoto(id, (p) => ({ ...p, locked: !p.locked }));
                }}
                onBringFront={(id) => {
                  playSound('click', settings.audioEnabled);
                  handleBringFront(id);
                }}
                onSendBack={(id) => {
                  playSound('click', settings.audioEnabled);
                  handleSendBack(id);
                }}
                onDeletePhoto={handleDeletePhoto}
              />
            )}

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="pointer-events-none fixed bottom-4 left-1/2 -translate-x-1/2 z-30 hidden md:flex items-center gap-2 rounded-full bg-black/50 px-4 py-1.5 backdrop-blur-md border border-white/10"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              <span className="font-mono text-[10px] tracking-wider text-slate-300">
                {MODE_LABELS[mode]}
              </span>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!booting && !uiHidden && sidebarOpen && (
          <ControlSidebar
            photos={photos}
            selectedPhoto={selectedPhoto}
            mode={mode}
            lighting={lighting}
            playgroundPreset={playgroundPreset}
            canDelete={photos.length > 2}
            onSelectPhoto={(id) => {
              playSound('select', settings.audioEnabled);
              setSelectedId(id);
            }}
            onUpdatePhoto={handleUpdatePhoto}
            onUpdateEffects={handleUpdateEffects}
            onUpdateLighting={(patch) =>
              setLighting((prev) => ({ ...prev, ...patch }))
            }
            onUploadClick={() => uploadInputRef.current?.click()}
            onReplaceClick={() => replaceInputRef.current?.click()}
            onDeletePhoto={handleDeletePhoto}
            onBringFront={handleBringFront}
            onSendBack={handleSendBack}
            onResetPhoto={handleResetOne}
            onResetStageOrbit={() => setStageOrbit({ rx: 8, ry: -10 })}
            onPlaygroundPreset={(preset) => {
              playSound('click', settings.audioEnabled);
              setPlaygroundPreset(preset);
            }}
            onChaosRandomize={handleChaosRandomize}
            onClose={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!booting && uiHidden && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            type="button"
            onClick={() => setUiHidden(false)}
            className="aether-glass fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full px-4 py-2 font-mono text-xs text-cyan-200 border border-cyan-400/40 hover:bg-cyan-500/20 transition"
          >
            <Eye className="h-3.5 w-3.5" />
            Show HUD (H)
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {settingsOpen && (
          <SettingsModal
            settings={settings}
            onUpdate={(patch) => setSettings((prev) => ({ ...prev, ...patch }))}
            onClose={() => setSettingsOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {savedOpen && (
          <SavedModal
            compositions={savedCompositions}
            onSaveCurrent={handleSaveComposition}
            onLoad={handleLoadComposition}
            onDelete={handleDeleteComposition}
            onClose={() => setSavedOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="aether-glass fixed bottom-16 left-1/2 -translate-x-1/2 z-50 rounded-full border border-cyan-400/40 px-4 py-1.5 font-mono text-[11px] text-cyan-200 shadow-2xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
