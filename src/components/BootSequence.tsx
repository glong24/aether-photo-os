import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface BootSequenceProps {
  imageUrls: string[];
  onComplete: () => void;
}

const BOOT_STEPS = [
  'CALIBRATING SPATIAL FIELD',
  'MOUNTING OBJECT 01 // MIRROR',
  'MOUNTING OBJECT 02 // COURT',
  'INITIALIZING 3D DEPTH ENGINE',
  'WORKSPACE READY',
];

export const BootSequence: React.FC<BootSequenceProps> = ({
  imageUrls,
  onComplete,
}) => {
  const [progress, setProgress] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  useEffect(() => {
    let loaded = 0;
    const total = imageUrls.length;
    if (total === 0) {
      setImagesLoaded(true);
      return;
    }

    const doneOne = () => {
      loaded += 1;
      if (loaded >= total) {
        setImagesLoaded(true);
      }
    };

    imageUrls.forEach((url) => {
      const img = new Image();
      img.onload = doneOne;
      img.onerror = doneOne;
      img.src = url;
    });
  }, [imageUrls]);

  useEffect(() => {
    const start = performance.now();
    const minDuration = 1650;
    let raf = 0;
    let finished = false;

    const tick = (now: number) => {
      const elapsed = now - start;
      const ratio = Math.min(1, elapsed / minDuration);
      const eased = 1 - Math.pow(1 - ratio, 3);
      const maxAllowed = imagesLoaded ? 100 : 88;
      const next = Math.min(maxAllowed, Math.round(eased * 100));
      setProgress(next);

      if (next >= 100 && imagesLoaded && !finished) {
        finished = true;
        window.setTimeout(onComplete, 280);
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [imagesLoaded, onComplete]);

  const stepIndex = Math.min(
    BOOT_STEPS.length - 1,
    Math.floor((progress / 100) * BOOT_STEPS.length)
  );

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#03040a] px-6"
    >
      {/* Subtle radial backlight */}
      <div
        className="pointer-events-none absolute h-[420px] w-[420px] rounded-full opacity-35 blur-[110px]"
        style={{
          background:
            'radial-gradient(circle, rgba(56,189,248,0.55) 0%, rgba(168,85,247,0.35) 55%, transparent 100%)',
        }}
      />

      {/* Orbital Core Emblem */}
      <div className="relative mb-9 flex h-28 w-28 items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 7, ease: 'linear' }}
          className="absolute inset-0 rounded-full border border-cyan-400/35 border-t-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.35)]"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 4.5, ease: 'linear' }}
          className="absolute inset-3 rounded-full border border-purple-400/35 border-b-purple-400"
        />
        <motion.div
          animate={{ scale: [0.92, 1.08, 0.92], opacity: [0.7, 1, 0.7] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
          className="h-5 w-5 rounded-full bg-gradient-to-tr from-cyan-300 via-sky-400 to-purple-400 shadow-[0_0_25px_rgba(56,189,248,0.9)]"
        />
      </div>

      {/* Brand Wordmark */}
      <div className="relative text-center">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-[0.28em] text-white">
          GIA <span className="text-cyan-400">LONG</span>
        </h1>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.26em] text-slate-400">
          SPATIAL PHOTO ENGINE v2.6
        </p>
      </div>

      {/* Progress Bar */}
      <div className="relative mt-8 w-full max-w-xs">
        <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.18em] text-cyan-300/90 mb-2">
          <span>{BOOT_STEPS[stepIndex]}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800/80 border border-slate-700/60">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-purple-500 shadow-[0_0_16px_rgba(56,189,248,0.85)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onComplete}
        className="mt-8 rounded-full border border-slate-700/70 bg-slate-900/50 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400 transition hover:border-cyan-400/50 hover:text-cyan-200"
      >
        Skip Intro
      </button>
    </motion.div>
  );
};
