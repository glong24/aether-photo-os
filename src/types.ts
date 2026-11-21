export type InteractionMode =
  | 'free'
  | 'space3d'
  | 'overlap'
  | 'cinematic'
  | 'playground'
  | 'compare';

export type ColorGrade =
  | 'none'
  | 'cyberpunk'
  | 'vision-ice'
  | 'ultraviolet'
  | 'noir'
  | 'solar'
  | 'emerald';

export type BlendMode =
  | 'normal'
  | 'screen'
  | 'lighten'
  | 'overlay'
  | 'hard-light'
  | 'difference'
  | 'exclusion'
  | 'color-dodge';

export type PlaygroundPreset = 'none' | 'zerog' | 'orbit' | 'mirror' | 'vortex';

export type CompareSubMode = 'side-by-side' | 'split-curtain';

export type ThemeAccent =
  | 'cyan-purple'
  | 'electric-blue'
  | 'crimson-violet'
  | 'emerald-cyan';

export interface PhotoEffects {
  neonGlow: number;
  neonColor: string;
  rgbSplit: number;
  glitch: number;
  blur: number;
  grayscale: number;
  colorGrade: ColorGrade;
  brightness: number;
  contrast: number;
  saturation: number;
  opacity: number;
  shadowIntensity: number;
  blendMode: BlendMode;
}

export interface PhotoItem {
  id: string;
  name: string;
  subtitle: string;
  src: string;
  aspectRatio: number;
  x: number;
  y: number;
  z: number;
  scale: number;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
  zIndex: number;
  visible: boolean;
  locked: boolean;
  effects: PhotoEffects;
}

export interface EnvironmentLighting {
  auroraIntensity: number;
  mouseSpotlight: boolean;
  particlesEnabled: boolean;
  particleDensity: number;
  gridEnabled: boolean;
  themeAccent: ThemeAccent;
}

export interface AppSettings {
  audioEnabled: boolean;
  inertiaEnabled: boolean;
  magneticSnap: boolean;
  tilt3D: boolean;
  parallax: boolean;
}

export interface SavedComposition {
  id: string;
  name: string;
  createdAt: string;
  mode: InteractionMode;
  photos: PhotoItem[];
  lighting: EnvironmentLighting;
}

export interface SnapGuides {
  vertical: number | null;
  horizontal: number | null;
}

export const DEFAULT_EFFECTS: PhotoEffects = {
  neonGlow: 36,
  neonColor: '#38bdf8',
  rgbSplit: 0,
  glitch: 0,
  blur: 0,
  grayscale: 0,
  colorGrade: 'none',
  brightness: 100,
  contrast: 102,
  saturation: 105,
  opacity: 100,
  shadowIntensity: 70,
  blendMode: 'normal',
};

export const DEFAULT_LIGHTING: EnvironmentLighting = {
  auroraIntensity: 68,
  mouseSpotlight: true,
  particlesEnabled: true,
  particleDensity: 55,
  gridEnabled: true,
  themeAccent: 'cyan-purple',
};

export const DEFAULT_SETTINGS: AppSettings = {
  audioEnabled: false,
  inertiaEnabled: true,
  magneticSnap: true,
  tilt3D: true,
  parallax: true,
};

export function createInitialPhotos(viewportWidth = 1280): PhotoItem[] {
  const isCompact = viewportWidth < 768;
  const spreadX = isCompact ? 78 : Math.min(205, Math.max(130, viewportWidth * 0.145));
  const defaultScale = isCompact ? 0.8 : 1;

  return [
    {
      id: 'photo-1',
      name: 'OBJ 01 — MIRROR',
      subtitle: 'STUDIO REFLECTION // 576×1024',
      src: '/photos/photo-mirror.jpg',
      aspectRatio: 576 / 1024,
      x: -spreadX,
      y: isCompact ? -24 : -6,
      z: 35,
      scale: defaultScale,
      rotation: isCompact ? -4 : -5,
      flipX: false,
      flipY: false,
      zIndex: 20,
      visible: true,
      locked: false,
      effects: {
        ...DEFAULT_EFFECTS,
        neonColor: '#38bdf8',
      },
    },
    {
      id: 'photo-2',
      name: 'OBJ 02 — COURT',
      subtitle: 'MONOCHROME DUSK // 576×1024',
      src: '/photos/photo-court.jpg',
      aspectRatio: 576 / 1024,
      x: spreadX,
      y: isCompact ? 34 : 10,
      z: -25,
      scale: defaultScale,
      rotation: isCompact ? 4 : 5,
      flipX: false,
      flipY: false,
      zIndex: 10,
      visible: true,
      locked: false,
      effects: {
        ...DEFAULT_EFFECTS,
        neonColor: '#a855f7',
      },
    },
  ];
}

const UPLOAD_NEON_COLORS = ['#22d3ee', '#a855f7', '#38bdf8', '#ec4899', '#10b981', '#f59e0b'];

export function createUploadedPhoto(
  src: string,
  fileName: string,
  naturalWidth: number,
  naturalHeight: number,
  existingPhotos: PhotoItem[],
  offsetIndex = 0
): PhotoItem {
  const count = existingPhotos.length + 1 + offsetIndex;
  const maxZ = Math.max(20, ...existingPhotos.map((p) => p.zIndex));
  const cleanName = fileName
    .replace(/\.[^/.]+$/, '')
    .toUpperCase()
    .slice(0, 14);
  const ratio =
    naturalWidth > 0 && naturalHeight > 0 ? naturalWidth / naturalHeight : 3 / 4;

  return {
    id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: `OBJ ${String(count).padStart(2, '0')} — ${cleanName || 'UPLOAD'}`,
    subtitle: `UPLOADED // ${naturalWidth}×${naturalHeight}`,
    src,
    aspectRatio: Math.max(0.4, Math.min(2.4, ratio)),
    x: ((count % 5) - 2) * 38,
    y: ((count % 3) - 1) * 28,
    z: 20,
    scale: 1,
    rotation: ((count % 2 === 0 ? 1 : -1) * 3),
    flipX: false,
    flipY: false,
    zIndex: maxZ + 1 + offsetIndex,
    visible: true,
    locked: false,
    effects: {
      ...DEFAULT_EFFECTS,
      neonColor: UPLOAD_NEON_COLORS[count % UPLOAD_NEON_COLORS.length],
    },
  };
}

export function buildCssFilter(effects: PhotoEffects): string {
  const filters: string[] = [
    `brightness(${effects.brightness}%)`,
    `contrast(${effects.contrast}%)`,
    `saturate(${effects.saturation}%)`,
  ];

  if (effects.grayscale > 0) {
    filters.push(`grayscale(${effects.grayscale}%)`);
  }
  if (effects.blur > 0) {
    filters.push(`blur(${effects.blur}px)`);
  }

  switch (effects.colorGrade) {
    case 'cyberpunk':
      filters.push('hue-rotate(18deg) saturate(140%) contrast(114%)');
      break;
    case 'vision-ice':
      filters.push('hue-rotate(190deg) saturate(112%) brightness(106%)');
      break;
    case 'ultraviolet':
      filters.push('hue-rotate(255deg) saturate(135%) contrast(110%)');
      break;
    case 'noir':
      filters.push('grayscale(100%) contrast(138%) brightness(94%)');
      break;
    case 'solar':
      filters.push('sepia(48%) hue-rotate(-18deg) saturate(155%) contrast(112%)');
      break;
    case 'emerald':
      filters.push('hue-rotate(96deg) saturate(128%) contrast(108%)');
      break;
    default:
      break;
  }

  return filters.join(' ');
}
